'use strict';

const { baseEmbed } = require('../factories/base');

function error(client, title, reason, hint = null, opts = {}) {
  let body = reason || 'An unknown error occurred.';
  if (hint) body += `\n\n**Hint:** ${hint}`;
  return baseEmbed({
    palette: 'ERROR',
    client,
    title: `❌ ${title || 'Error'}`,
    description: body,
    moduleName: opts.moduleName || 'STATUS',
    requester: opts.requester,
    image: opts.image,
  });
}

module.exports = { error };
