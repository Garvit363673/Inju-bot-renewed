'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const theme = require('../utils/theme');
const { ticketPanelEmbed } = require('../utils/embeds');
const ui = require('../utils/ui');
const { getHeroGif } = require('../utils/emojis');
const eb = require('../utils/embedBuilder');
const { cleanEmbed, kv } = require('../embeds/factories/clean');
const assets = require('../utils/assets');
const { icon } = require('../utils/iconMap');

const TICKET_CATEGORIES = [
  { value: 'general',     label: 'General Support',     emoji: icon('STATUS_INFO'),     description: 'General questions and support' },
  { value: 'billing',     label: 'Billing / Payments',  emoji: icon('ICON_BALANCE'),   description: 'Payments, subscriptions, account issues' },
  { value: 'bug',         label: 'Bug Report',          emoji: icon('BTN_REFRESH'),    description: 'Report bugs or technical issues' },
  { value: 'partnership', label: 'Partnership',         emoji: icon('CROWN_GOLD'),     description: 'Partnership inquiries' },
];

function buildTicketSelector() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('Choose a category…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      TICKET_CATEGORIES.map(c => ({
        value: c.value,
        label: c.label,
        description: c.description,
        emoji: c.emoji,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

function buildTicketConfirmEmbed(channel, categoryLabel) {
  return cleanEmbed({
    title: 'Ticket Opened',
    description: `Your ticket has been created in ${channel}.\nA team member will assist you shortly.`,
    fields: [kv('Category', [categoryLabel])],
  });
}

async function execute(message) {
  const client = message.client;
  const openRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open_panel')
      .setLabel('OPEN TICKET')
      .setEmoji(icon('BTN_TICKET_OPEN'))
      .setStyle(ButtonStyle.Primary)
  );
  try {
    await message.channel.send({
      embeds: [ticketPanelEmbed(client)],
      components: [openRow],
    });
  } catch (err) {
    try { require('../utils/logger').error(`Ticket panel failed: ${err.stack || err.message}`); } catch (_) {}
    await message.channel.send({
      embeds: [ui.error(client, 'Panel Error', err.message || 'Failed to send ticket panel.', 'Check bot channel permissions.')],
    }).catch(() => {});
  }
}


module.exports = {
  name: 'ticket',
  execute,
  buildTicketSelector,
  buildTicketConfirmEmbed,
  TICKET_CATEGORIES,
};
