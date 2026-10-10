'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { cleanEmbed, kv } = require('../embeds/factories/clean');

function buildAvatarButtons(target) {
  return new ActionRowBuilder().addComponents(
    ...[64, 128, 256, 1024].map(size =>
      new ButtonBuilder()
        .setLabel(`${size}px`)
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ extension: 'png', size }))
    )
  );
}

async function execute(message) {
  const target = message.mentions.users.first() ?? message.author;
  const avatarURL = target.displayAvatarURL({ extension: 'png', size: 1024 });

  const embed = cleanEmbed({
    client: message.client,
    title: 'Avatar',
    fields: [
      kv('Member', [`<@${target.id}>`, `\`${target.username}\``]),
      kv('User ID', [`\`${target.id}\``]),
    ],
    image: avatarURL,
    requester: message.author,
  });

  await message.reply({
    embeds:     [embed],
    components: [buildAvatarButtons(target)],
  });
}

module.exports = { name: 'avatar', execute, buildAvatarButtons };
