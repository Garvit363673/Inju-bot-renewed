'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { system } = require('./System');
const { icon, iconUnicode } = require('../../utils/iconMap');

const ICON = icon('STATUS_WARNING');

function confirmPrompt(client, title, body, confirmId = 'confirm', cancelId = 'cancel', opts = {}) {
  const embed = system(client, title || 'Confirm Action', body || 'Are you sure?', {
    moduleName: opts.moduleName || 'AUTHORIZE',
    requester: opts.requester,
  });
  embed.setTitle(`⚠️ ${title || 'Confirm Action'}`);

  const confirm = new ButtonBuilder()
    .setCustomId(confirmId)
    .setLabel(opts.confirmLabel || 'Confirm')
    .setEmoji(opts.confirmEmoji || iconUnicode('STATUS_WARNING'))
    .setStyle(opts.confirmStyle || ButtonStyle.Danger);

  const cancel = new ButtonBuilder()
    .setCustomId(cancelId)
    .setLabel(opts.cancelLabel || 'Cancel')
    .setStyle(opts.cancelStyle || ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirm, cancel);

  return { embeds: [embed], components: [row] };
}

module.exports = { confirmPrompt };
