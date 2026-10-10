'use strict';

const { cleanEmbed, kv } = require('../factories/clean');
const { openTicketBtn, dashLink, statusBtn, statsBtn, ticketMenuRow } = require('../components/buttons');
const { BRAND_URL } = require('../tokens/brand');
const { icon } = require('../../utils/iconMap');

function DashboardPanel(client, opts = {}) {
  const embed = cleanEmbed({
    client,
    title: 'Support Dashboard',
    description: 'Open a private ticket and our staff will respond shortly.',
    fields: [
      kv('Open Ticket', ['Launch a new support thread']),
      kv('Category', ['Choose one below']),
      kv('Status', ['View your open tickets']),
    ],
    autoThumbnail: true,
    moduleName: 'DASHBOARD',
  });

  const row1 = new (require('discord.js').ActionRowBuilder)().addComponents(
    openTicketBtn('btn:support:open'),
  );


  const row2 = new (require('discord.js').ActionRowBuilder)().addComponents(
    statusBtn(), statsBtn(),
  );

  return {
    embeds: [embed],
    components: [row1, ticketMenuRow(), row2],
  };
}

module.exports = { DashboardPanel };
