'use strict';

const { EmbedBuilder } = require('discord.js');
const { resolvePalette, SURFACE } = require('../tokens/colors');
const { buildAuthor } = require('./author');
const { buildFooter } = require('./footer');
const { botAvatar, isHttpUrl } = require('../tokens/avatar');
const { ZERO } = require('../tokens/zeroWidth');
const { cleanEmbed } = require('./clean');

const DEFAULT_GIF_KEY = 'default';

function _truthy(value) {
  return value != null && value !== '' && value !== undefined;
}

function _resolveGifUrl(gifKey) {
  if (gifKey === false) return null;
  const key = gifKey || DEFAULT_GIF_KEY;
  try {
    const assets = require('../../utils/assets');
    const url = assets.getHeroGif ? assets.getHeroGif(key) : null;
    return isHttpUrl(url) ? url : null;
  } catch (_) {
    return null;
  }
}

function baseEmbed(options = {}) {
  return cleanEmbed(options);
}

module.exports = { baseEmbed, SURFACE, DEFAULT_GIF_KEY };
