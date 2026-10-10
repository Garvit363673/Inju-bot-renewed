'use strict';

const { baseEmbed } = require('../factories/base');

function system(client, title, body, opts = {}) {
  return baseEmbed({
    client,
    title: `⏳ ${title || 'Processing'}`,
    description: body || 'Please wait…',
    moduleName: opts.moduleName || 'SYSTEM',
    requester: opts.requester,
    image: opts.image,
  });
}

function processing(client, label, opts = {}) {
  return system(client, 'Processing', label || 'Working on it…', opts);
}

module.exports = { system, processing };
