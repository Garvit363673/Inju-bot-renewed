'use strict';

// One shared "clean" look for every embed: plain title, inline ▾ fields,
// neutral dark colour and a "Requested by <user> • BADDIES Bot" footer.

const { EmbedBuilder } = require('discord.js');
const { isHttpUrl, botAvatar } = require('../tokens/avatar');

const BOT_NAME = 'BADDIES';
const NEUTRAL  = 0x2b2d31;
const STATUS_COLORS = {
  SUCCESS: 0x57f287,
  ERROR:   0xed4245,
  WARNING: 0xfee75c,
};

/** 'FETCH FAILED' -> 'Fetch Failed'. Text that already has lowercase letters is left alone. */
function pretty(text) {
  if (text == null) return text;
  const s = String(text).replace(/^\[\s*|\s*\]$/g, '').trim();
  if (!s) return s;
  if (s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s\-_/·•])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

function colorFor(palette, explicit) {
  const key = palette ? String(palette).toUpperCase() : '';
  if (STATUS_COLORS[key]) return STATUS_COLORS[key];
  return NEUTRAL;
}

function footerFor(client, moduleName, requester) {
  if (requester) {
    const name = requester.username || requester.tag || requester.user?.username || 'unknown';
    const out = { text: `Requested by ${name} • ${BOT_NAME} Bot` };
    const u = typeof requester.displayAvatarURL === 'function' ? requester : requester.user;
    if (u && typeof u.displayAvatarURL === 'function') out.iconURL = u.displayAvatarURL({ size: 64 });
    return out;
  }
  const mod = moduleName ? ` • ${pretty(String(moduleName))}` : '';
  const out = { text: `${BOT_NAME} Bot${mod}` };
  const icon = botAvatar(client);
  if (isHttpUrl(icon)) out.iconURL = icon;
  return out;
}

/**
 * options: title, authorTitle (used as title if no title), description, fields[], thumbnail,
 * autoThumbnail (bot avatar, off by default), image (only if explicit), palette, client,
 * moduleName, requester, timestamp (Date | true)
 */
function cleanEmbed(options = {}) {
  const {
    palette = null, client = null, title = null, authorTitle = null, description = null,
    fields = null, thumbnail = null, image = null, moduleName = null, requester = null,
    timestamp = null, autoThumbnail = false,
  } = options;

  const em = new EmbedBuilder().setColor(colorFor(palette));

  const t = pretty(title || authorTitle);
  if (t) em.setTitle(String(t).slice(0, 256));
  if (description) em.setDescription(String(description).slice(0, 4096));

  if (Array.isArray(fields)) {
    const ok = fields.filter(f => f && f.name != null && f.value != null && String(f.value) !== '')
      .slice(0, 25)
      .map(f => ({ name: String(f.name).slice(0, 256) || '​', value: String(f.value).slice(0, 1024), inline: !!f.inline }));
    if (ok.length) em.addFields(ok);
  }

  const thumb = thumbnail || (autoThumbnail ? botAvatar(client) : null);
  if (isHttpUrl(thumb)) em.setThumbnail(thumb);
  if (isHttpUrl(image)) em.setImage(image);

  em.setFooter(footerFor(client, moduleName, requester));
  if (timestamp instanceof Date) em.setTimestamp(timestamp);
  else if (timestamp === true) em.setTimestamp();
  return em;
}

/** Builds a "▾ Name" inline field from lines of text. */
function kv(name, lines, inline = true) {
  const arr = Array.isArray(lines) ? lines : [lines];
  const value = arr.filter(l => l != null && l !== '').map(l => `▾ ${l}`).join('\n');
  return { name: `▾ ${name}`, value: value || '—', inline };
}

module.exports = { cleanEmbed, kv, pretty, footerFor, NEUTRAL, STATUS_COLORS, BOT_NAME };
