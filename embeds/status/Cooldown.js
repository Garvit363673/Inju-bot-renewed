'use strict';

const { baseEmbed } = require('../factories/base');

function cooldown(client, command, seconds, opts = {}) {
  const cmd = String(command || 'command').replace(/^!/, '');
  const secs = Number(seconds) || 0;
  return baseEmbed({
    palette: 'WARNING',
    client,
    title: '⏳ Slow Down',
    description: `\`!${cmd}\` is on cooldown. Try again in **${secs}s**.`,
    moduleName: opts.moduleName || 'COOLDOWN',
    requester: opts.requester,
    image: opts.image,
  });
}

module.exports = { cooldown };
