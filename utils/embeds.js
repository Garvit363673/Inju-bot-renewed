'use strict';

const e = require('../embeds');
const { baseEmbed } = e.factories.base;
const theme = require('./theme');
const { icon } = require('./iconMap');

const SEP = e.tokens.zeroWidth.SEP;
const PAD = e.tokens.zeroWidth.PAD;
const COLORS = theme.COLORS;
const { formatTable, alignRight } = e.tokens.table;
const { tsRelative, tsDate, tsFull, tsNow } = e.tokens.timestamp;
const { fieldKV } = e.factories.field;

function _userAvatar(user) {
  if (!user) return null;
  if (typeof user.displayAvatarURL === 'function') return user.displayAvatarURL({ size: 1024, dynamic: true, format: 'png' });
  return null;
}

function _botAvatar(client) {
  if (client && client.user && typeof client.user.displayAvatarURL === 'function') {
    return client.user.displayAvatarURL({ size: 1024, dynamic: true, format: 'png' });
  }
  return undefined;
}

function checkEmbed(results, opts = {}) {
  const client = opts.client;
  const metrics = [
    { label: 'WS', value: results.wsConnected ? 'ONLINE' : 'OFFLINE' },
    { label: 'API', value: results.apiReachable ? 'ONLINE' : 'OFFLINE' },
    { label: 'DB', value: results.dbAlive ? 'ONLINE' : 'OFFLINE' },
  ];
  if (results.uptime != null) metrics.push({ label: 'Uptime', value: `${results.uptime}s` });
  if (results.heapUsedMB != null) metrics.push({ label: 'Heap', value: `${results.heapUsedMB}MB` });
  return e.HeavyData(client, { title: 'System Check', moduleName: 'CHECK', metrics }).embeds[0];
}

function banEmbed(target, moderator, reason, opts = {}, client) {
  const c = opts.client || client;
  return e.AdminRecord(c, {
    caseId: opts.caseId || `BAN-${Date.now()}`,
    action: 'PERMANENT BAN',
    target, moderator, reason,
    scope: 'GUILD', duration: 'PERMANENT', appealable: true,
  }).embeds[0];
}

function banResultEmbed(target, moderator, reason, action = 'ban') {
  const isUnban = String(action).toLowerCase() === 'unban';
  const actionText = isUnban ? 'UNBAN' : 'PERMANENT BAN';
  return e.AdminRecord(null, {
    caseId: `${isUnban ? 'UNBAN' : 'BAN'}-${Date.now()}`,
    action: actionText,
    target, moderator, reason,
    scope: 'GUILD',
    duration: isUnban ? 'REVOKED' : 'PERMANENT',
    appealable: !isUnban,
  }).embeds[0];
}

function vouchEmbed(target, vouches, opts = {}) {
  const { EmbedBuilder } = require('discord.js');
  const PAGE_SIZE = 5;
  const list = Array.isArray(vouches) ? vouches : [];
  const totalPages = Math.max(1, opts.totalPages || Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, opts.page || 0), totalPages - 1);
  const slice = list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  let tier = null;
  try { tier = require('../commands/vouch').getVouchTier(list.length); } catch (_) { /* optional */ }

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('Vouch Ledger')
    .addFields(
      { name: '▾ Subject',    value: `▾ ${target ? `<@${target.id}>` : 'Unknown'}\n▾ \`${target ? target.username : '—'}\``, inline: true },
      { name: '▾ Reputation', value: `▾ **Tier:** ${tier ? tier.label : 'New'}\n▾ **Vouches:** ${list.length}`, inline: true },
      { name: '▾ Page',       value: `▾ ${page + 1} / ${totalPages}`, inline: true },
    );

  if (!slice.length) {
    embed.addFields({ name: 'Vouches', value: '*No vouches yet.*' });
  } else {
    slice.forEach((v, i) => {
      const n = list.length - (page * PAGE_SIZE + i);
      const when = v.timestamp ? ` • <t:${Math.floor(Number(v.timestamp) / 1000)}:R>` : '';
      const by = v.vouchedBy ? `<@${v.vouchedBy}>` : '`unknown`';
      const note = v.note ? String(v.note).replace(/\n+/g, ' ').slice(0, 200) : '*No message*';
      const proof = v.proof ? `\n[📎 View Proof](${v.proof})` : '';
      embed.addFields({ name: `▾ Vouch #${n}`, value: `From ${by}${when}\n> ${note}${proof}`.slice(0, 1024) });
    });
  }

  if (target && typeof target.displayAvatarURL === 'function') embed.setThumbnail(target.displayAvatarURL({ size: 128 }));
  const rq = opts.requester;
  const footer = { text: `Requested by ${rq ? rq.username : 'unknown'} • BADDIES Bot` };
  if (rq && typeof rq.displayAvatarURL === 'function') footer.iconURL = rq.displayAvatarURL({ size: 64 });
  embed.setFooter(footer);
  const g = require('../embeds/tokens/gifs').randomGif();
  if (g) embed.setImage(g);
  return embed;
}

function ticketPanelEmbed(client) {
  return e.DashboardPanel(client).embeds[0];
}

function ticketWelcomeEmbed(user, categoryLabel) {
  return e.TicketWelcome(null, user, categoryLabel);
}

function ticketCloseConfirmEmbed() {
  return e.confirmPrompt(null, 'Close Ticket', 'Are you sure you want to close this ticket?', 'btn:support:close:confirm', 'btn:support:close:cancel').embeds[0];
}

function helpEmbed(commands, page, totalPages, category, client) {
  return e.HelpCategory(client, category || 'All', commands, page, totalPages).embeds[0];
}

function userInfoEmbed(memberOrUser, opts = {}) {
  return e.HeavyData(opts.client, {
    title: 'User Intelligence',
    subject: memberOrUser,
    moduleName: 'USERINFO',
    sections: opts.badges ? [{ title: 'Badges', body: opts.badges.map(b => '`' + (b.label || b) + '`').join(' ') }] : [],
  }).embeds[0];
}

function serverInfoEmbed(guild, opts = {}) {
  const { kv } = e.factories.clean;
  return e.factories.clean.cleanEmbed({
    client: opts.client,
    title: guild.name,
    fields: [
      kv('Members', [`${guild.memberCount}`]),
      kv('Server', [`${guild.channels?.cache?.size ?? 0} channels`, `${guild.roles?.cache?.size ?? 0} roles`, `${guild.premiumSubscriptionCount || 0} boosts`]),
      kv('Created', [`<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`]),
    ],
    thumbnail: typeof guild.iconURL === 'function' ? guild.iconURL({ size: 256 }) : null,
    requester: opts.requester,
  });
}

function helpHubEmbed(client, opts = {}) {
  return e.HelpHub(client, opts).embeds[0];
}

function helpCategoryEmbed(client, category, commands, page, totalPages, opts = {}) {
  return e.HelpCategory(client, category, commands, page, totalPages, opts).embeds[0];
}

function credentialsEmbed(client) {
  return e.info(client, 'Credentials', '**STATUS**  `UPDATED`\n**ACTION**  `Reconnecting WebSocket…`', { moduleName: 'SETTOKEN' });
}

function warningEmbed(client, title, body) {
  return e.warning(client, title, body, null, { moduleName: 'WARN' });
}

function domainsEmbed(domains) {
  const avail = (domains || []).filter(d => d.available).length;
  return e.HeavyData(null, { title: 'Domain Topology', moduleName: 'DOMAINS', metrics: [{ label: 'Available', value: `${avail} / ${(domains||[]).length}` }] }).embeds[0];
}

function apiStatusEmbed(online, ms) {
  const dot = icon(online === 'online' ? 'DOT_GREEN' : 'DOT_RED');
  return e.info(null, 'API Status', online === 'online' ? `${dot} REST API is operational.` : `${dot} REST API is unreachable.`, { moduleName: 'API' });
}

function domainCheckEmbed(domains) {
  return e.HeavyData(null, { title: 'Domain Health', moduleName: 'CHECK', sections: [{ title: 'Results', body: (domains||[]).map(d => `\`${d.name}\`  ${d.status === 'online' ? icon('DOT_GREEN') : icon('DOT_RED')}`).join('\n') }] }).embeds[0];
}

function hyperlinkEmbed(original, masked) {
  return e.info(null, 'Hyperlink', `**MASKED**  \`${masked}\`\n**ORIGINAL**  \`${original}\``, { moduleName: 'HYPERLINK' });
}

function setTokenEmbed(client) {
  return credentialsEmbed(client);
}

function siteEmbed(url, opts) {
  return e.info(opts && opts.client, 'Site', `**URL**  \`${url}\``, { moduleName: 'SITE' });
}

function supportEmbed(client) {
  return e.info(client, 'Support', `${icon('DIAMOND')} Use the dashboard to open a ticket.`, { moduleName: 'SUPPORT' });
}

function avatarEmbed(user, opts = {}) {
  return e.HeavyData(opts.client, { title: 'Avatar', subject: user, moduleName: 'AVATAR' });
}

function errorEmbed(client, title, reason, hint) {
  return e.error(client, title, reason, hint, { moduleName: 'STATUS' });
}

function successEmbed(client, title, body) {
  return e.success(client, title, body, { moduleName: 'STATUS' });
}

function loadingEmbed(client, label) {
  return e.processing(client, label, { moduleName: 'SYSTEM' });
}

function infoEmbed(client, title, body) {
  return e.info(client, title, body, { moduleName: 'INFO' });
}

function cooldownEmbed(client, cmd, secs) {
  return e.cooldown(client, cmd, secs, { moduleName: 'COOLDOWN' });
}

function noPermEmbed(client, required) {
  return e.noPerm(client, required, { moduleName: 'ACCESS' });
}

function securityAlertEmbed(client, type, detail) {
  return e.error(client, type, detail, null, { moduleName: 'SECURITY' });
}

function dmEmbed(client, title, desc) {
  return e.info(client, title, desc, { moduleName: 'DM' });
}

const COMPONENTS = {
  button: e.buttons,
  paginationRow: (page, total, extras = []) => e.buttons.navRow(`btn:generic:page:${page-1}`, `btn:generic:page:${page+1}`, page, total).components.concat(extras),
  confirmRow: e.buttons.confirmRow,
  closeRow: e.buttons.closeRow,
  verifyRow: e.buttons.verifyRow,
  dashRow: e.buttons.dashRow,
  ticketMenu: e.buttons.ticketMenuRow,
};

const BTN = e.buttons;

const _medal = r => ({ 1: icon('MEDAL_1'), 2: icon('MEDAL_2'), 3: icon('MEDAL_3') }[r]) ?? `#${r}`;

const fmt = n => (n == null ? '—' : new Intl.NumberFormat('en-US').format(n));
const delta = (n) => {
  if (n == null || n === 0) return '';
  return n > 0 ? ` ▲+${fmt(n)}` : ` ▼${fmt(n)}`;
};
const medal = _medal;
const field = (name, value, inline = false) =>
  value != null && value !== '' && value !== '—' ? [{ name, value: String(value), inline }] : [];

function _paletteFor(color) {
  const t = require('./theme');
  if (color === t.ERROR || color === t.DANGER) return 'ERROR';
  if (color === t.SUCCESS) return 'SUCCESS';
  if (color === t.WARNING) return 'WARNING';
  return 'UTILITY';
}

function base(color) {
  return baseEmbed({ color, palette: _paletteFor(color), enforceBrand: false });
}

function branded(color) { return base(color); }

function baseEmbedLegacy(message, color, title) {
  return baseEmbed({ color, palette: _paletteFor(color), authorTitle: title, enforceBrand: false });
}

function createEmbed(options = {}) {
  const {
    color = null,
    palette = 'UTILITY',
    client = null,
    authorName = null,
    authorTitle = null,
    description = null,
    image = null,
    thumbnail = null,
    fields = [],
    footer = null,
    timestamp = null,
    enforceBrand = false,
    useBotAvatarThumb = false,
    autoThumbnail = false,
    moduleName = null,
  } = options || {};

  return baseEmbed({
    color,
    palette,
    client,
    authorTitle: authorTitle || authorName || null,
    thumbnail: thumbnail || null,
    description,
    image,
    fields,
    footer,
    timestamp,
    enforceBrand,
    autoThumbnail: autoThumbnail || useBotAvatarThumb,
    moduleName,
  });
}

function makeEmbed(message, desc, color, title) {
  return baseEmbed({ color, palette: _paletteFor(color), authorTitle: title, description: desc, enforceBrand: false });
}

function make(opts) {
  return baseEmbed({ ...opts, palette: opts.palette || 'UTILITY' });
}

function makeError(message, text) {
  return e.error(null, 'Error', text);
}

function makeSuccess(message, text) {
  return e.success(null, 'Success', text);
}

function sendError(message, text) {
  if (message && message.channel && typeof message.channel.send === 'function') {
    return message.channel.send({ embeds: [makeError(message, text)] });
  }
  return null;
}

function botAvatar(client) { return _botAvatar(client); }
function userAvatar(user, size = 4096) { return _userAvatar(user); }
function guildIcon(guild, size = 4096) {
  if (!guild) return null;
  if (typeof guild.iconURL === 'function') return guild.iconURL({ size, dynamic: true, format: 'png' });
  return null;
}
function systemFooter(client) {
  return { text: 'BADDIES  ·  injuries.to  ·  SYSTEM', iconURL: _botAvatar(client) };
}
function requesterFooter(requester) {
  return { text: `Requested by ${requester?.tag || 'Unknown'}  ·  BADDIES SYSTEM`, iconURL: _userAvatar(requester) };
}

function ts(date) { return tsRelative(date); }
function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  if (typeof n === 'number') return n.toLocaleString();
  return String(n);
}

const FOOTER_TEXT = 'BADDIES  ·  injuries.to';
const PANEL_WIDTH = 42;
const WIDE_PANEL_WIDTH = 52;

function statusLabel(s) {
  const map = { online: 'Online', live: 'Live', connected: 'Connected', open: 'Open', verified: 'Verified', available: 'Available', degraded: 'Degraded', limited: 'Limited', issues: 'Issues', offline: 'Offline', closed: 'Closed', error: 'Error', idle: 'Idle', dnd: 'DND' };
  return map[s?.toLowerCase()] || String(s || 'Unknown');
}

function statusDot(s) {
  const green = icon('DOT_GREEN');
  const red = icon('DOT_RED');
  const gray = icon('DOT_GRAY');
  const yellow = icon('STATUS_WARNING');
  const map = { online: green, live: green, connected: green, open: green, verified: green, available: green, degraded: yellow, limited: yellow, issues: yellow, offline: red, closed: red, error: red, idle: yellow, dnd: red, unknown: gray };
  return map[String(s || '').toLowerCase()] || gray;
}

function statusRow(label, status) {
  return `**${String(label).toUpperCase()}**  ${statusDot(status)} ${statusLabel(status)}`;
}

function formatRow(label, value) {
  return `**${String(label).toUpperCase()}**  ${value || '—'}`;
}

function section(title) {
  return title ? `\n__**${title}**__\n` : '\n';
}
const HR = '\n';
const SPACER = ' ';
function tag(t) { return '`' + t + '`'; }
function badge(text) { return '`' + text + '`'; }
function dividerLabel(text) { return text ? `\n__${text}__\n` : '\n'; }
function highlight(text) { return '**' + text + '**'; }

const fmtNum = fmt;
const fmtDelta = delta;

function buildPanel(title, rows, opts) {
  const label = (title || 'INFO').toUpperCase();
  const content = (typeof rows === 'string' ? rows : (rows || []).join('\n'));
  let p = content ? `**${label}**\n${content}` : `**${label}**`;
  if (opts && opts.footer) p += `\n_ _\nPage ${opts.footer.page + 1} / ${opts.footer.total}`;
  return p;
}
const ansiPanel = buildPanel;
const createPanel = buildPanel;
function createTerminal(lines) { return Array.isArray(lines) ? lines.join('\n') : String(lines); }
function createCard(title, items) { return `**${title}**\n` + items.map(([k,v]) => `**${k}**  ${v}`).join('\n'); }
function createAnalyticsBlock(items) {
  return items.map(i => {
    const c = i.change ? ` ${i.change > 0 ? '▲' : '▼'}${Math.abs(i.change)}` : '';
    return `**${i.label}**  \`${i.value}\`${c}`;
  }).join('\n');
}
function createLeaderboardRow(rank, username, value) {
  const m = rank === 1 ? icon('MEDAL_1') : rank === 2 ? icon('MEDAL_2') : rank === 3 ? icon('MEDAL_3') : `**${rank}.**`;
  return `${m}  **${username}**  —  ${icon('ICON_BALANCE')} \`${value}\``;
}
const rankRow = createLeaderboardRow;
function legacyRow(label, value) { return formatRow(label, value); }
function loadingPanel(label) { return `${icon('STATUS_LOADING')}  **${label || 'Loading'}**`; }
function rankBadge(rank) {
  if (rank === 1) return `${icon('MEDAL_1')} #1`;
  if (rank === 2) return `${icon('MEDAL_2')} #2`;
  if (rank === 3) return `${icon('MEDAL_3')} #3`;
  return `**#${rank}**`;
}
function repTier(count) {
  if (count >= 50) return `${icon('CROWN_GOLD')} Elite`;
  if (count >= 25) return `${icon('CROWN_PURPLE')} Trusted`;
  if (count >= 10) return `${icon('CROWN_RED')} Regular`;
  if (count >= 3) return `${icon('MEDAL_3')} New`;
  return `${icon('MEDAL_3')} Unknown`;
}
function metricRow(label, value, deltaVal) {
  const d = deltaVal ? (deltaVal > 0 ? ` ▲+${deltaVal}` : ` ▼${deltaVal}`) : '';
  return `**${label}**  \`${value}\`${d}`;
}
function badgeRow(badges) { return badges.map(b => '`' + (b.label || b) + '`').join(' '); }
function ansi(content) { return String(content); }
function stripAnsi(s) { return String(s).replace(/\u001b\[[0-9;]*m/g, ''); }
function rawLen(s) { return stripAnsi(s).length; }
function padAnsi(s, len) { return String(s).padEnd(len); }
function padAnsiL(s, len) { return String(s).padStart(len); }

module.exports = {
  COLORS, SEP, PAD,
  fmt, delta, medal, field,
  tsRelative, tsDate, tsFull, tsNow, ts,
  base, baseEmbed: baseEmbedLegacy, branded, makeEmbed, make, makeError, makeSuccess, sendError,
  baseEmbedLegacy, createEmbed,
  checkEmbed, banEmbed, banResultEmbed,
  vouchEmbed, ticketPanelEmbed, ticketWelcomeEmbed, ticketCloseConfirmEmbed,
  ticketEmbed: ticketPanelEmbed,
  helpEmbed, helpHubEmbed, helpCategoryEmbed,
  userinfoEmbed: userInfoEmbed, userInfoEmbed,
  serverInfoEmbed, domainsEmbed, apiStatusEmbed, domainCheckEmbed,
  hyperlinkEmbed, setTokenEmbed, credentialsEmbed, warningEmbed,
  siteEmbed, supportEmbed, avatarEmbed,
  errorEmbed, successEmbed, loadingEmbed, infoEmbed,
  cooldownEmbed, noPermEmbed, securityEmbed: securityAlertEmbed, securityAlertEmbed, dmEmbed,
  COMPONENTS, BTN,
  row: e.buttons.row, paginationRow: COMPONENTS.paginationRow, confirmRow: e.buttons.confirmRow,
  closeRow: e.buttons.closeRow, verifyRow: e.buttons.verifyRow, dashRow: e.buttons.dashRow,
  ticketMenuRow: e.buttons.ticketMenuRow,
  buildPanel, ansiPanel, createPanel, createTerminal, createCard,
  createAnalyticsBlock, createLeaderboardRow, rankRow,
  legacyRow, formatRow, statusRow, statusLabel, statusDot,
  section, HR, SPACER, formatNumber,
  ansi, stripAnsi, rawLen, padAnsi, padAnsiL,
  tag, badge, dividerLabel, highlight, loadingPanel,
  rankBadge, repTier, metricRow, badgeRow,
  ratingStars: null,
  botAvatar, userAvatar, guildIcon, systemFooter, requesterFooter, FOOTER_TEXT,
  PANEL_WIDTH, WIDE_PANEL_WIDTH,
  fmtNum, fmtDelta,
  alignRight, fieldKV, formatTable, computeWidths: e.tokens.table.computeWidths,
  premiumEmbed: make,
  embed: branded,
};
