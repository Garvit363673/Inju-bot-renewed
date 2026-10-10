'use strict';

const mongoose = require('mongoose');
const ui = require('../utils/ui');
const { cleanEmbed } = require('../embeds/factories/clean');
const Log = require('../database/models/Log');

async function execute(message, args) {
  const target = message.mentions.users.first() || message.author;

  if (mongoose.connection.readyState !== 1) {
    return message.reply({ embeds: [ui.error(message.client, 'DB Offline', 'Cannot fetch warnings.')] });
  }

  try {
    const warns = await Log.find({ action: 'warn', userId: target.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (warns.length === 0) {
      return message.reply({ embeds: [ui.info(message.client, 'Warnings', `**${target.username}** has no warnings.`)] });
    }

    const fields = warns.map((w, i) => ({
      name: `▾ Warning #${i + 1}`,
      value: `${w.reason || 'No reason'}\nBy <@${w.moderatorId}> • <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`.slice(0, 1024),
      inline: false,
    }));
    return message.reply({
      embeds: [cleanEmbed({
        client: message.client,
        title: `Warnings — ${target.username}`,
        description: `Total: **${warns.length}**`,
        fields,
        thumbnail: target.displayAvatarURL({ size: 128 }),
        requester: message.author,
      })],
    });
  } catch (err) {
    await message.reply({ embeds: [ui.error(message.client, 'Fetch Failed', err.message)] });
  }
}

module.exports = { name: 'warnings', execute };
