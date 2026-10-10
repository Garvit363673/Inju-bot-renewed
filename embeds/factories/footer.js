'use strict';

const { footerFor } = require('./clean');

function buildFooter(client, moduleName, requester) {
  return footerFor(client, moduleName, requester);
}

module.exports = { buildFooter };
