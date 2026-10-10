'use strict';

const { baseEmbed } = require('../factories/base');

function success(client, title, body, opts = {}) {
  return baseEmbed({
    palette: 'SUCCESS',
    client,
    title: `✅ ${title || 'Success'}`,
    description: body || null,
    moduleName: opts.moduleName || 'STATUS',
    requester: opts.requester,
    image: opts.image,
    fields: opts.fields,
  });
}

module.exports = { success };
