'use strict';

const { cleanEmbed, kv } = require('../embeds/factories/clean');

async function execute(message) {
  const guild = message.guild;
  await guild.members.fetch().catch(() => {});

  const total = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = total - bots;
  const owner = await guild.fetchOwner().catch(() => null);

  const embed = cleanEmbed({
    client: message.client,
    title: guild.name,
    fields: [
      kv('Owner', [owner ? `<@${owner.id}>` : 'Unknown']),
      kv('Members', [`${total} total`, `${humans} users`, `${bots} bots`]),
      kv('Server', [`${guild.channels.cache.size} channels`, `${guild.roles.cache.size} roles`, `${guild.premiumSubscriptionCount || 0} boosts`]),
      kv('Created', [`<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`]),
      kv('Server ID', [`\`${guild.id}\``]),
    ],
    thumbnail: guild.iconURL({ size: 256 }),
    requester: message.author,
  });

  await message.reply({ embeds: [embed] });
}

module.exports = { name: 'serverinfo', execute };
