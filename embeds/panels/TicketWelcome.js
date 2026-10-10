'use strict';

const { cleanEmbed, kv } = require('../factories/clean');
const { userAvatar } = require('../tokens/avatar');

function TicketWelcome(client, user, categoryLabel, opts = {}) {
  return cleanEmbed({
    client,
    title: 'Ticket Opened',
    description: 'A staff member will be with you shortly.\n\nBe respectful, describe your issue in detail, and attach screenshots when relevant.',
    fields: [
      kv('Member', [user?.id ? `<@${user.id}>` : 'Unknown']),
      kv('Category', [categoryLabel || 'General']),
    ],
    thumbnail: userAvatar(user),
    moduleName: 'TICKET',
    requester: user,
  });
}

module.exports = { TicketWelcome };
