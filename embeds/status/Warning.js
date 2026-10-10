'use strict';

const { baseEmbed } = require('../factories/base');

function warning(client, title, body, hint = null, opts = {}) {
  let full = body || '';
  if (hint) full += `\n\n**Hint:** ${hint}`;
  return baseEmbed({
    palette: 'WARNING',
    client,
    title: `⚠️ ${title || 'Warning'}`,
    description: full || null,
    moduleName: opts.moduleName || 'STATUS',
    requester: opts.requester,
    image: opts.image,
  });
}

module.exports = { warning };
