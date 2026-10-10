'use strict';

const { cleanEmbed, kv } = require('../embeds/factories/clean');

const startTime = Date.now();

async function execute(message) {
  const cmdCount = global._baddiesCommandCount || 0;
  const ping = message.client.ws.ping >= 0 ? `${Math.round(message.client.ws.ping)}ms` : 'N/A';

  const embed = cleanEmbed({
    client: message.client,
    title: 'Bot Information',
    fields: [
      kv('Bot', ['BADDIES Bot', 'Status: Online']),
      kv('Uptime', [`<t:${Math.floor(startTime / 1000)}:R>`, `Latency: ${ping}`]),
      kv('Usage', [`${cmdCount} command${cmdCount === 1 ? '' : 's'} processed`, `${message.client.guilds.cache.size} server${message.client.guilds.cache.size === 1 ? '' : 's'}`]),
    ],
    thumbnail: message.client.user?.displayAvatarURL({ size: 128 }),
    requester: message.author,
  });

  await message.reply({ embeds: [embed] });
}

module.exports = { name: 'botinfo', execute };
