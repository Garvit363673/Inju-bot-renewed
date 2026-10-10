'use strict';

const { EmbedBuilder } = require('discord.js');
const { resolvePalette, PALETTES } = require('../tokens/colors');
const { buildAuthor } = require('../factories/author');
const { buildFooter } = require('../factories/footer');
const { botAvatar, isHttpUrl } = require('../tokens/avatar');
const { ZERO } = require('../tokens/zeroWidth');
const { icon, ICON_MAP } = require('../../utils/iconMap');
const { getPinnedBanner, getRandomHero, isValidGifUrl } = require('../../utils/assets');
const { cleanEmbed } = require('../factories/clean');

const PREMIUM = {
  GOLD:       0xFFD700,
  CYAN:       0x00D4FF,
  MAGENTA:    0x8A2BE2,
  AMBER:      0xFFB347,
  ROYAL:      0x6A0DAD,
  STEEL:      0x2C2F36,
  OBSIDIAN:   0x07060F,
  DIAMOND:    0xB9F2FF,
  CRIMSON:    0xFF3344,
  EMERALD:    0x00FF7F,
};

const ACCENT = {
  SUCCESS: PREMIUM.EMERALD,
  ERROR:   PREMIUM.CRIMSON,
  WARNING: PREMIUM.AMBER,
  ADMIN:   PREMIUM.CRIMSON,
  UTILITY: PREMIUM.CYAN,
  SYSTEM:  PREMIUM.MAGENTA,
  PREMIUM: PREMIUM.GOLD,
  ELITE:   PREMIUM.GOLD,
};

const RULE_GOLD = '━';

function premiumRule(label, width = 32) {
  if (!label) return RULE_GOLD.repeat(width);
  const labelText = `  ${String(label).toUpperCase()}  `;
  const sideLen = Math.max(3, Math.floor((width - labelText.length) / 2));
  return RULE_GOLD.repeat(sideLen) + labelText + RULE_GOLD.repeat(sideLen);
}

function premiumHeader(iconSlot, text) {
  const ic = iconSlot ? icon(iconSlot) : null;
  const prefix = ic ? `${ic}  ` : '';
  return `${prefix}**${String(text).toUpperCase()}**`;
}

function premiumField(name, value, inline = true) {
  if (value == null || value === '') return null;
  return { name: String(name || ZERO), value: String(value), inline };
}

function premiumFooter(client, moduleName, requester) {
  return buildFooter(client, moduleName, requester);
}

function premiumDivider() {
  return '';
}

function resolveAccent(palette) {
  if (!palette) return ACCENT.UTILITY;
  const upper = String(palette).toUpperCase();
  return ACCENT[upper] || ACCENT.UTILITY;
}

function resolveBaseColor(palette) {
  if (!palette) return PREMIUM.OBSIDIAN;
  const upper = String(palette).toUpperCase();
  if (ACCENT[upper]) return ACCENT[upper];
  const pal = PALETTES[upper];
  return pal?.bg ?? PREMIUM.OBSIDIAN;
}

function premiumEmbed(options = {}) {
  return cleanEmbed(options);
}

module.exports = {
  PREMIUM,
  ACCENT,
  premiumRule,
  premiumDivider,
  premiumHeader,
  premiumField,
  premiumFooter,
  resolveAccent,
  resolveBaseColor,
  premiumEmbed,
  RULE_GOLD,
  ICON_MAP,
};
