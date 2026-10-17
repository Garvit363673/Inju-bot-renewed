'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { cleanEmbed, kv } = require('../embeds/factories/clean');

const SIZES = [512, 1024, 2048, 4096];

function buildBannerButtons(target) {
  return new ActionRowBuilder().addComponents(
    ...SIZES.map((size) =>
      new ButtonBuilder()
        .setLabel(`${size}px`)
        .setStyle(ButtonStyle.Link)
        .setURL(target.bannerURL({ size })),
    ),
  );
}

/** @mention, a raw user ID, or yourself when nothing is typed. */
async function resolveTarget(message, args) {
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned;

  const typed = (args[0] || '').replace(/[<@!>]/g, '');
  if (!typed) return message.author;
  if (!/^\d{15,25}$/.test(typed)) return null;
  return message.client.users.fetch(typed).catch(() => null);
}

async function execute(message, args) {
  const found = await resolveTarget(message, args);
  if (!found) {
    return message.reply({
      embeds: [cleanEmbed({
        client: message.client,
        palette: 'ERROR',
        title: 'User Not Found',
        description: 'Mention a member or give me a valid user ID.\nExample: `+banner @user`',
        requester: message.author,
        gif: false,
      })],
    });
  }

  // Discord only sends the banner when the user is fetched fresh
  const target = await found.fetch(true).catch(() => found);
  const bannerURL = target.bannerURL({ size: 1024 });

  if (!bannerURL) {
    const fields = [kv('Member', [`<@${target.id}>`, `\`${target.username}\``])];
    if (target.hexAccentColor) fields.push(kv('Accent Color', [`\`${target.hexAccentColor}\``]));
    return message.reply({
      embeds: [cleanEmbed({
        client: message.client,
        title: 'Banner',
        description: `<@${target.id}> doesn't have a profile banner.`,
        fields,
        requester: message.author,
        gif: false,
      })],
    });
  }

  const embed = cleanEmbed({
    client: message.client,
    title: 'Banner',
    fields: [
      kv('Member', [`<@${target.id}>`, `\`${target.username}\``]),
      kv('User ID', [`\`${target.id}\``]),
    ],
    image: bannerURL,
    requester: message.author,
  });

  await message.reply({
    embeds: [embed],
    components: [buildBannerButtons(target)],
  });
}

module.exports = { name: 'banner', description: "Show a member's profile banner", execute, buildBannerButtons };
