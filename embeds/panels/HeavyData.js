'use strict';

const { cleanEmbed, kv } = require('../factories/clean');
const { formatTable } = require('../tokens/table');
const { asciiRule, thinRule } = require('../tokens/divider');
const { tsRelative, tsFull } = require('../tokens/timestamp');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userAvatar } = require('../tokens/avatar');
const { section, EMPTY } = require('../factories/field');
const { icon, iconUnicode } = require('../../utils/iconMap');

function _fmt(n) {
  if (n == null || n === '') return '—';
  if (typeof n === 'string' && isNaN(Number(n))) return n;
  return Number(n).toLocaleString('en-US');
}

function _medal(rank) {
  if (rank === 1) return icon('MEDAL_1');
  if (rank === 2) return icon('MEDAL_2');
  if (rank === 3) return icon('MEDAL_3');
  return `\`#${rank}\``;
}

function HeavyData(client, data = {}) {
  const {
    title = 'Details',
    subject = null,
    sections = [],
    metrics = [],
    progress = [],
    pagination = null,
    requester = null,
    moduleName = 'DATA',
    image = null,
  } = data;

  const fields = [];

  if (subject) {
    const mention = subject.mention || (subject.id ? `<@${subject.id}>` : '`—`');
    const lines = [mention];
    if (subject.tag || subject.username) lines.push(`\`${subject.tag || subject.username}\``);
    fields.push(kv('Subject', lines));
  }

  for (const m of metrics) {
    const delta = m.delta != null ? (m.delta > 0 ? ` (▲ +${_fmt(m.delta)})` : ` (▼ ${_fmt(m.delta)})`) : '';
    fields.push(kv(String(m.label || 'Value'), [`${_fmt(m.value)}${delta}`]));
  }

  for (const p of progress) {
    fields.push(kv(String(p.label || 'Progress'), [`${_fmt(p.value || 0)} / ${_fmt(p.max || 100)}`]));
  }

  for (const sec of sections) {
    fields.push({ name: `▾ ${sec.title || 'Details'}`, value: String(sec.body || '—').slice(0, 1024), inline: false });
  }

  const embed = cleanEmbed({
    client,
    title,
    fields,
    thumbnail: subject ? userAvatar(subject) : null,
    image,
    moduleName,
    requester,
  });

  const components = [];
  if (pagination) {
    const prev = new ButtonBuilder()
      .setCustomId(`btn:${(moduleName || 'data').toLowerCase()}:page:${(pagination.page || 1) - 1}`)
      .setLabel('◀ PREV')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!(pagination.page > 1));
    const next = new ButtonBuilder()
      .setCustomId(`btn:${(moduleName || 'data').toLowerCase()}:page:${(pagination.page || 1) + 1}`)
      .setLabel('NEXT ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!(pagination.page < pagination.totalPages));
    const refresh = new ButtonBuilder()
      .setCustomId(`btn:${(moduleName || 'data').toLowerCase()}:refresh`)
      .setLabel(`${iconUnicode('BTN_REFRESH')} REFRESH`)
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(prev, refresh, next);
    components.push(row);
  }

  return { embeds: [embed], components };
}

module.exports = { HeavyData };
