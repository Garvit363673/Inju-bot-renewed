'use strict';

const { cleanEmbed, kv } = require('../factories/clean');
const { fieldKV, formatRow, blockquote, EMPTY } = require('../factories/field');
const { userAvatar } = require('../tokens/avatar');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { icon, iconUnicode } = require('../../utils/iconMap');
const { claimBtn, transcriptBtn, reopenBtn } = (() => {
  const b = require('../components/buttons');
  return {
    claimBtn: b.claimBtn,
    transcriptBtn: b.transcriptBtn,
    reopenBtn: b.reopenBtn,
  };
})();

function TicketPanel(client, ticket, opener, opts = {}) {
  const isOpen = (ticket.status || 'open') === 'open';
  const ts = d => (d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:R>` : '—');

  const fields = [
    kv('Status', [isOpen ? '🟢 Open' : '🔴 Closed', `Response: ${isOpen ? 'Pending' : 'Completed'}`]),
    kv('User', [opener?.id ? `<@${opener.id}>` : 'Unknown']),
    kv('Category', [ticket.category || 'general']),
    kv('Channel', [ticket.channelId ? `<#${ticket.channelId}>` : '—']),
    kv('Created', [ts(ticket.createdAt)]),
    kv('Updated', [ts(ticket.updatedAt)]),
  ];
  if (ticket.subject) fields.push({ name: '▾ Subject', value: String(ticket.subject).slice(0, 1024), inline: false });

  const embed = cleanEmbed({
    client,
    title: `Ticket ${ticket.ticketId || ''}`.trim(),
    fields,
    thumbnail: userAvatar(opener),
    moduleName: 'TICKET',
    requester: opts.requester,
    image: opts.image || null,
  });

  const row = new ActionRowBuilder();

  if (isOpen) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`btn:support:claim:${ticket.ticketId || ''}`)
        .setLabel('Claim')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn:support:close:${ticket.ticketId || ''}`)
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`btn:support:transcript:${ticket.ticketId || ''}`)
        .setLabel('Transcript')
        .setStyle(ButtonStyle.Secondary),
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`btn:support:reopen:${ticket.ticketId || ''}`)
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`btn:support:transcript:${ticket.ticketId || ''}`)
        .setLabel('Transcript')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  return { embeds: [embed], components: [row] };
}

module.exports = { TicketPanel };
