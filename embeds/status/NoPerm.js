'use strict';

const { baseEmbed } = require('../factories/base');

function noPerm(client, required = 'Administrator', opts = {}) {
  return baseEmbed({
    palette: 'ERROR',
    client,
    title: '❌ Access Denied',
    description: `You need **${String(required || 'Administrator')}** permissions to use this command.`,
    moduleName: opts.moduleName || 'ACCESS',
    requester: opts.requester,
    image: opts.image,
  });
}

module.exports = { noPerm };
