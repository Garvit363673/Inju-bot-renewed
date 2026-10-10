'use strict';

const { cleanEmbed, kv } = require('../factories/clean');
const { fieldKV, formatRow, blockquote, EMPTY } = require('../factories/field');
const { asciiRule } = require('../tokens/divider');
const { tsFull, tsRelative } = require('../tokens/timestamp');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userAvatar } = require('../tokens/avatar');
const { icon, iconUnicode } = require('../../utils/iconMap');

const EMDASH = '—';

function AdminRecord(client, data = {}) {
  const {
    caseId = 'CASE-UNKNOWN',
    action = 'ACTION',
    target = null,
    moderator = null,
    reason = 'No reason provided',
    evidence = null,
    scope = 'GUILD',
    duration = EMDASH,
    appealable = true,
    requestedBy = null,
    timestamp = null,
  } = data;

  const targetMention = target?.id ? `<@${target.id}>` : '`Unknown`';
  const targetTag = target?.tag || target?.username;
  const modMention = moderator?.id ? `<@${moderator.id}>` : '`Unknown`';
  const evidenceText = evidence
    ? (Array.isArray(evidence) ? evidence.join('\n') : String(evidence))
    : null;

  const fields = [
    kv('Case', [`\`${caseId}\``]),
    kv('Action', [String(action)]),
    kv('Scope', [String(scope)]),
    kv('Target', [targetMention, targetTag ? `\`${targetTag}\`` : null]),
    kv('Moderator', [modMention]),
    kv('Duration', [String(duration)]),
    { name: '▾ Reason', value: String(reason || 'No reason provided').slice(0, 1024), inline: false },
  ];
  if (evidenceText) fields.push({ name: '▾ Evidence', value: evidenceText.slice(0, 1024), inline: false });
  fields.push(kv('Appealable', [appealable ? 'Yes' : 'No']));

  const embed = cleanEmbed({
    client,
    title: 'Moderation Record',
    fields,
    thumbnail: userAvatar(target),
    moduleName: 'ADMIN',
    requester: requestedBy,
    timestamp: timestamp || null,
  });

  const isPermanent = String(action).toLowerCase().includes('permanent') ||
                      String(duration).toLowerCase() === 'permanent';
  const isBan = String(action).toLowerCase().includes('ban');

  const unbanBtn = new ButtonBuilder()
    .setCustomId(`btn:moderation:unban:${target?.id || 'unknown'}`)
    .setLabel(isPermanent ? 'Unban (Permanent)' : 'Unban')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!isBan);

  const viewBtn = new ButtonBuilder()
    .setCustomId(`btn:moderation:view:${target?.id || 'unknown'}`)
    .setLabel('View User')
    .setStyle(ButtonStyle.Secondary);

  const appealBtn = new ButtonBuilder()
    .setCustomId(`btn:moderation:appeal:${caseId}`)
    .setLabel('Appeal')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!appealable);

  const row = new ActionRowBuilder().addComponents(unbanBtn, viewBtn, appealBtn);

  return { embeds: [embed], components: [row] };
}

module.exports = { AdminRecord };
