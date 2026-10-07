'use strict';

const { EmbedBuilder } = require('discord.js');
const { toSmallCaps } = require('./smallCaps');

/* ─────────────── Moderation card settings ─────────────── */

const BRAND        = 'ASTRAL';
const EMBED_COLOR  = 0x0b0b0f; // black
const ICON_MEMBER  = '🎃';
const ICON_LINE    = '👻';
const MOD_GIF      =
  'https://media.discordapp.net/attachments/1525511271552778260/1553753885485830355/a_5c96f91e2a5959b28381cce711a95e74.gif?ex=6ac6ebd1&is=6ac59a51&hm=85660dfc3626a373ab32f587a763abca602653a0ff16886cfdb9d43d478ba919&';

const TITLES = {
  ban:      'BANNED',
  unban:    'UNBANNED',
  kick:     'KICKED',
  timeout:  'TIMED OUT',
  warn:     'WARNED',
  lock:     'CHANNEL LOCKED',
  unlock:   'CHANNEL UNLOCKED',
  purge:    'PURGED',
  slowmode: 'SLOWMODE',
};

function label(text) {
  return `**${toSmallCaps(text)}:**`;
}

/**
 * Black moderation card used by every moderation command.
 * Only the fields you pass are shown.
 * @param {object} o
 * @param {string} o.action        ban | unban | kick | timeout | warn | lock | unlock | purge | slowmode
 * @param {User}   [o.target]      the member it was done to
 * @param {User}   o.moderator     the staff member who did it
 * @param {string|null} [o.reason] shown for member actions even when empty; for channel actions only if given
 * @param {string} [o.duration]    timeout length
 * @param {string} [o.channelId]   channel the action happened in
 * @param {string|number} [o.amount]  purge: number of messages deleted
 * @param {string} [o.delay]       slowmode value
 */
function buildModEmbed({ action, target, moderator, reason, duration, channelId, amount, delay }) {
  const key = String(action || 'ban').toLowerCase();
  const targetUser = target ? (target.user ?? target) : null;
  const modUser = moderator?.user ?? moderator;
  const memberAction = ['ban', 'unban', 'kick', 'timeout', 'warn'].includes(key);

  const lines = [];
  if (targetUser) lines.push(`${ICON_MEMBER} ${label('MEMBER')} <@${targetUser.id}>`);
  if (channelId)  lines.push(`${ICON_LINE} ${label('CHANNEL')} <#${channelId}>`);
  if (memberAction || reason) {
    lines.push(`${ICON_LINE} ${label('REASON')} \`${reason || 'No reason provided'}\``);
  }
  if (duration)           lines.push(`${ICON_LINE} ${label('DURATION')} \`${duration}\``);
  if (amount !== undefined) lines.push(`${ICON_LINE} ${label('MESSAGES')} \`${amount}\``);
  if (delay)              lines.push(`${ICON_LINE} ${label('DELAY')} \`${delay}\``);
  lines.push(`${ICON_LINE} ${label('MODERATOR')} <@${modUser.id}>`);

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(TITLES[key] || key.toUpperCase())
    .setDescription(lines.join('\n'))
    .setThumbnail(MOD_GIF)
    .setImage(MOD_GIF)
    .setFooter({
      text: `${modUser.username} • ${BRAND} EMBEDS`,
      iconURL: modUser.displayAvatarURL({ extension: 'png', size: 64 }),
    });
}

module.exports = { buildModEmbed, MOD_GIF };
