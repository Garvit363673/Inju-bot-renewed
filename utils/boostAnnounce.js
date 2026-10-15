'use strict';

const { EmbedBuilder, MessageType } = require('discord.js');
const logger = require('./logger');

/* ─────────────── Boost card settings ─────────────── */

const SERVER_NAME  = 'Astral';
const SERVER_EMOJI = '🎃';
const BULLET       = '▼';
const EMBED_COLOR  = 0x0b0b0f;
const BANNER_IMAGE =
  'https://media.discordapp.net/attachments/1388640751101149399/1550588397683212378/a_8f99691930d32be6beff0119641af521.gif?ex=6ac69c7a&is=6ac54afa&hm=e965d84eecc9c36d59d33bffa30254d65b3977978cc4c98c95839fe54ea6455c&width=512&height=180&';

const BOOST_TYPES = new Set([
  MessageType.GuildBoost,
  MessageType.GuildBoostTier1,
  MessageType.GuildBoostTier2,
  MessageType.GuildBoostTier3,
]);

/* Bold-italic sans letters, the same style as the welcome card. */
function fancy(text) {
  return [...text].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90)  return String.fromCodePoint(0x1D63C + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D656 + (c - 97));
    return ch;
  }).join('');
}

function buildBoostEmbed(user, guild) {
  const description = [
    `### ${BULLET} ──── SERVER BOOST ────`,
    `**Thank you for boosting <@${user.id}>!**`,
    '',
    `${BULLET} **User:** <@${user.id}>`,
    `${BULLET} **Total Boosts:** \`${guild.premiumSubscriptionCount ?? 0}\``,
    `${BULLET} **Server Level:** \`${guild.premiumTier ?? 0}\``,
    '',
    `${BULLET} **We appreciate your support!**`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
    .setImage(BANNER_IMAGE)
    .setFooter({ text: `${SERVER_NAME.toUpperCase()} Boost™ • ${SERVER_EMOJI} ${fancy(SERVER_NAME)}` });
}

async function onMessage(message) {
  try {
    if (!message.guild || !BOOST_TYPES.has(message.type)) return;

    // Fetch fresh numbers so the boost count and level are up to date
    const guild = await message.guild.fetch().catch(() => message.guild);

    const channel =
      (process.env.BOOST_CHANNEL_ID && guild.channels.cache.get(process.env.BOOST_CHANNEL_ID)) ||
      message.channel;

    await channel.send({
      embeds: [buildBoostEmbed(message.author, guild)],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error(`Boost announcement failed: ${err.message}`);
  }
}

function init(client) {
  client.on('messageCreate', onMessage);
}

module.exports = { init, buildBoostEmbed };
