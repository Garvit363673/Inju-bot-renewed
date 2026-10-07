'use strict';

const { EmbedBuilder } = require('discord.js');
const theme = require('../utils/theme');
const ui    = require('../utils/ui');
const eb    = require('../utils/embedBuilder');
const ce    = require('../utils/customEmojis');
const { hasAnyStaffRole } = require('../config/roles');
const { buildModEmbed } = require('../utils/modEmbed');

const pending = new Map();

function setPending(msgId, data) {
  pending.set(msgId, data);
  setTimeout(() => pending.delete(msgId), 60_000);
}
function getPending(msgId) { return pending.get(msgId) ?? null; }
function clearPending(msgId) { pending.delete(msgId); }

function buildBanResultEmbed(target, moderator, reason, action = 'ban') {
  return buildModEmbed({ action, target, moderator, reason });
}

async function execute(message, args) {
  if (!hasAnyStaffRole(message.member)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Staff')] });
  }

  // Support both @mention and raw user ID
  let target = message.mentions.users.first();

  if (!target) {
    const rawId = args[0]?.replace(/[<@!>]/g, '');
    if (rawId && /^\d{17,20}$/.test(rawId)) {
      try {
        target = await message.client.users.fetch(rawId);
      } catch {
        return message.reply({ embeds: [ui.error(message.client, 'User Not Found', `Could not find a user with ID \`${rawId}\`.`, '!ban @user [reason] OR !ban <userId> [reason]')] });
      }
    }
  }

  if (!target) {
    return message.reply({ embeds: [ui.error(message.client, 'No Target', 'You must @mention a user or provide a user ID to ban.', '!ban @user [reason] OR !ban <userId> [reason]')] });
  }

  const reasonArgs = message.mentions.users.first() ? args.slice(1) : args.slice(1);
  const reason = reasonArgs.join(' ') || null;

  const prompt = ui.confirmPrompt(
    message.client,
    'Confirm Ban',
    `You are about to **ban** ${target.tag}\n\n` +
    `Reason: \`${reason || 'No reason provided'}\`\n> This action will be logged.`,
    `mod_confirm_${message.id}`,
    `mod_cancel_${message.id}`,
  );

  const sent = await message.reply(prompt);

  setPending(sent.id, {
    target,
    reason,
    moderator: message.author,
    action: 'ban',
  });
}

module.exports = { name: 'ban', execute, buildBanResultEmbed, getPending, clearPending, setPending };
