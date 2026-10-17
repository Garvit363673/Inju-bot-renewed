'use strict';

/**
 * Makes EVERY embed the bot sends black, no matter which file built it
 * (success, error, logs, tickets, giveaways...). Load it once at the top of index.js.
 * To change the colour for the whole bot, edit BLACK below.
 */

const { MessagePayload } = require('discord.js');
const logger = require('./logger');

const BLACK = 0x0b0b0f; // near-black. Pure 0x000000 is shown by Discord as "no colour".

try {
  const originalResolveBody = MessagePayload.prototype.resolveBody;

  MessagePayload.prototype.resolveBody = function resolveBodyBlack(...args) {
    const result = originalResolveBody.apply(this, args);
    try {
      const body = this.body;
      if (body && Array.isArray(body.embeds)) {
        body.embeds = body.embeds.map((embed) => {
          if (!embed || typeof embed !== 'object') return embed;
          const json = typeof embed.toJSON === 'function' ? embed.toJSON() : embed;
          return { ...json, color: BLACK };
        });
      }
    } catch (err) {
      logger.warn(`Black embeds: skipped one message (${err.message})`);
    }
    return result;
  };
} catch (err) {
  logger.warn(`Black embeds could not be enabled: ${err.message}`);
}

module.exports = { BLACK };
