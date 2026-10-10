'use strict';

const { baseEmbed } = require('../factories/base');

function info(client, title, body, opts = {}) {
  return baseEmbed({
    client,
    title: title || 'Info',
    description: body || null,
    moduleName: opts.moduleName || 'INFO',
    requester: opts.requester,
    fields: opts.fields,
    image: opts.image,
  });
}

module.exports = { info };
