'use strict';

const { EmbedBuilder } = require('discord.js');
const { toSmallCaps } = require('../utils/smallCaps');

/* ─────────────── Welcome card settings ─────────────── */

const SERVER_NAME   = 'Astral';
const SERVER_EMOJI  = '🎃';       // replaces the pumpkin; change it to any emoji you like
const BULLET        = '▼';
const EMBED_COLOR   = 0x0b0b0f;   // near-black, matches the dark card
const BANNER_GIF    =
  'https://media.discordapp.net/attachments/1388640751101149399/1550588397683212378/a_8f99691930d32be6beff0119641af521.gif?ex=6ac69c7a&is=6ac54afa&hm=e965d84eecc9c36d59d33bffa30254d65b3977978cc4c98c95839fe54ea6455c&width=512&height=180&';

/* Converts plain letters to bold-italic sans (𝘼𝙨𝙩𝙧𝙖𝙡) for the stylised server name. */
function fancy(text) {
  return [...text].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90)  return String.fromCodePoint(0x1D63C + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D656 + (c - 97));
    return ch;
  }).join('');
}

/**
 * Builds the welcome payload (content + embed) for a member.
 * Exported so the same card can be reused from a guildMemberAdd handler later.
 */
function buildWelcome(member, { invitedBy = 'Unknown', inviteCode = 'Unknown' } = {}) {
  const guild = member.guild;
  const user  = member.user ?? member;

  const description = [
    `### ${BULLET} **WELCOME TO ${SERVER_EMOJI} *${fancy(SERVER_NAME)}***`,
    `**${toSmallCaps('WELCOME')}** <@${user.id}>!`,
    '',
    `${BULLET} **Invited By:** ${invitedBy}`,
    `${BULLET} **Invite Code:** \`${inviteCode}\``,
    `${BULLET} **Member Count:** \`${guild.memberCount}\``,
    '',
    `${BULLET} **Make sure to read the rules and verify!**`,
  ].join('\n');

  const thumbnail =
    guild.iconURL({ extension: 'png', size: 256 }) ??
    user.displayAvatarURL({ extension: 'png', size: 256 });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setThumbnail(thumbnail)
    .setImage(BANNER_GIF)
    .setFooter({
      text: `${SERVER_NAME.toUpperCase()} SYSTEM • ${SERVER_EMOJI} ${fancy(SERVER_NAME)}`,
      iconURL: guild.iconURL({ extension: 'png', size: 64 }) ?? undefined,
    });

  return {
    content: `Welcome <@${user.id}>!`,
    embeds: [embed],
    allowedMentions: { users: [user.id] },
  };
}

async function execute(message, args) {
  let member = message.mentions.members?.first() ?? message.member;

  if (!message.mentions.members?.size && args[0] && /^\d{15,25}$/.test(args[0])) {
    member = await message.guild.members.fetch(args[0]).catch(() => message.member);
  }

  await message.channel.send(buildWelcome(member));
}

module.exports = { name: 'welcome', description: 'Send the Astral welcome card', execute, buildWelcome };
