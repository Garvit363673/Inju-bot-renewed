'use strict';

const { cleanEmbed, kv } = require('../embeds/factories/clean');

const TITLES = {
  ban:      'Member Banned',
  unban:    'Member Unbanned',
  kick:     'Member Kicked',
  timeout:  'Member Timed Out',
  warn:     'Member Warned',
  lock:     'Channel Locked',
  unlock:   'Channel Unlocked',
  purge:    'Messages Purged',
  slowmode: 'Slowmode Updated',
};

/**
 * Moderation card used by every moderation command. Only the fields you pass are shown.
 * action: ban | unban | kick | timeout | warn | lock | unlock | purge | slowmode
 */
function buildModEmbed({ action, target, moderator, reason, duration, channelId, amount, delay }) {
  const key = String(action || 'ban').toLowerCase();
  const targetUser = target ? (target.user ?? target) : null;
  const modUser = moderator?.user ?? moderator;
  const memberAction = ['ban', 'unban', 'kick', 'timeout', 'warn'].includes(key);

  const fields = [];
  if (targetUser) fields.push(kv('Member', [`<@${targetUser.id}>`, targetUser.username ? `\`${targetUser.username}\`` : null]));
  if (channelId)  fields.push(kv('Channel', [`<#${channelId}>`]));
  fields.push(kv('Moderator', [`<@${modUser.id}>`]));
  if (duration)             fields.push(kv('Duration', [duration]));
  if (amount !== undefined) fields.push(kv('Messages', [String(amount)]));
  if (delay)                fields.push(kv('Delay', [String(delay)]));
  if (memberAction || reason) {
    fields.push({ name: '▾ Reason', value: String(reason || 'No reason provided').slice(0, 1024), inline: false });
  }

  return cleanEmbed({
    title: TITLES[key] || key.charAt(0).toUpperCase() + key.slice(1),
    fields,
    thumbnail: targetUser && typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL({ size: 128 }) : null,
    requester: modUser,
  });
}

module.exports = { buildModEmbed };
