'use strict';

const { PermissionFlagsBits } = require('discord.js');
const ui = require('../utils/ui');
const { hasAnyStaffRole } = require('../config/roles');
const { buildModEmbed } = require('../utils/modEmbed');

async function execute(message, args) {
  if (!hasAnyStaffRole(message.member)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Staff')] });
  }

  const target = message.mentions.members.first();
  const minutes = parseInt(args[1], 10);

  if (!target || isNaN(minutes) || minutes < 1) {
    return message.reply({ embeds: [ui.error(message.client, 'Invalid Args', 'Usage: `!timeout @user <minutes> [reason]`')] });
  }

  const reason = args.slice(2).join(' ') || null;
  const ms = Math.min(minutes * 60 * 1000, 28 * 24 * 60 * 60 * 1000);

  if (!target.moderatable) {
    return message.reply({ embeds: [ui.error(message.client, 'Cannot Timeout', 'That member cannot be timed out.')] });
  }

  try {
    await target.timeout(ms, reason);
    await message.reply({ embeds: [buildModEmbed({ action: 'timeout', target: target.user, moderator: message.author, reason, duration: `${minutes} min` })] });
  } catch (err) {
    await message.reply({ embeds: [ui.error(message.client, 'Timeout Failed', err.message)] });
  }
}

module.exports = { name: 'timeout', execute };
