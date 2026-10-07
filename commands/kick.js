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
  const reason = args.slice(1).join(' ') || null;

  if (!target) {
    return message.reply({ embeds: [ui.error(message.client, 'No Target', 'You must @mention a member to kick.', '!kick @user [reason]')] });
  }

  if (!target.kickable) {
    return message.reply({ embeds: [ui.error(message.client, 'Cannot Kick', 'That member is not kickable.')] });
  }

  try {
    await target.kick(reason);
    await message.reply({ embeds: [buildModEmbed({ action: 'kick', target: target.user, moderator: message.author, reason })] });
  } catch (err) {
    await message.reply({ embeds: [ui.error(message.client, 'Kick Failed', err.message)] });
  }
}

module.exports = { name: 'kick', execute };
