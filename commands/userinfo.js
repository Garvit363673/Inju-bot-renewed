'use strict';

const ui     = require('../utils/ui');
const eb     = require('../utils/embedBuilder');
const { cleanEmbed, kv } = require('../embeds/factories/clean');

function accountAgeTier(days) {
  if (days >= 365 * 3)  return 'Veteran';
  if (days >= 365)      return 'Member';
  if (days >= 90)       return 'Regular';
  return 'New';
}

function buildUserInfoEmbed(member, client, requester = null) {
  const user          = member.user ?? member;
  const isGuildMember = !!member.joinedTimestamp;

  const createdDays = Math.floor((Date.now() - user.createdTimestamp) / 86_400_000);
  const joinedDays  = isGuildMember ? Math.floor((Date.now() - member.joinedTimestamp) / 86_400_000) : null;
  const roleCount   = isGuildMember ? Math.max(0, (member.roles?.cache?.size || 0) - 1) : null;

  return cleanEmbed({
    client,
    title: 'User Information',
    fields: [
      kv('User', [`<@${user.id}>`, `\`${user.username}\``]),
      kv('Account', [`Created <t:${Math.floor((user.createdTimestamp || Date.now()) / 1000)}:D>`, `${createdDays} days old (${accountAgeTier(createdDays)})`]),
      kv('Server', isGuildMember
        ? [`Joined <t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, `${joinedDays} days ago`, `${roleCount} role${roleCount === 1 ? '' : 's'}`]
        : ['Not in this server']),
    ],
    thumbnail: user.displayAvatarURL ? user.displayAvatarURL({ size: 256 }) : null,
    requester,
  });
}

function buildServerInfoEmbed(guild, client) {
  return eb.serverInfoEmbed(guild, { client });
}

async function execute(message, args, client) {
  if (message.content.toLowerCase().startsWith('!info')) {
    const embed = buildServerInfoEmbed(message.guild, client);
    return message.reply({ embeds: [embed] });
  }

  let targetId = message.author.id;
  if (message.mentions.users.size > 0) {
    targetId = message.mentions.users.first().id;
  } else if (args[0]) {
    targetId = args[0].replace(/[<@!>]/g, '');
  }

  try {
    let member = message.guild.members.cache.get(targetId);
    if (!member) {
      member = await message.guild.members.fetch(targetId);
    }
    const embed = buildUserInfoEmbed(member, client, message.author);
    return message.reply({ embeds: [embed] });
  } catch (err) {
    try {
      const user = await client.users.fetch(targetId);
      const embed = buildUserInfoEmbed(user, client, message.author);
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply({ embeds: [ui.error(client, 'LOOKUP FAILED', 'COULD NOT LOCATE TARGET IN MAINFRAME.')] });
    }
  }
}

module.exports = { name: 'userinfo', description: 'User / Server info cards', execute, buildUserInfoEmbed, buildServerInfoEmbed };
