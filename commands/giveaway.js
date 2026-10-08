'use strict';

const ui = require('../utils/ui');
const gw = require('../utils/giveaway');

const USAGE =
  '`!giveaway <duration> <winners> [@host] <prize>`\n' +
  'Example: `!giveaway 1d 1 @someone 31K Robux Giveaway`\n' +
  '`!giveaway end <messageId>` · `!giveaway reroll <messageId>`';

async function execute(message, args) {
  if (!gw.isAllowed(message.member)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Staff')] });
  }

  const sub = (args[0] || '').toLowerCase();

  if (sub === 'end' || sub === 'reroll') {
    const id = (args[1] || '').trim();
    if (!id) return message.reply({ embeds: [ui.error(message.client, 'Missing ID', `Usage: \`!giveaway ${sub} <messageId>\``)] });

    if (sub === 'end') {
      const done = await gw.endByMessageId(message.client, message.guild.id, id);
      return message.reply(done ? '✅ Giveaway ended.' : '❌ I could not find an **active** giveaway with that message ID.');
    }
    const res = await gw.rerollGiveaway(message.client, message.guild.id, id);
    return message.reply(res.error ? `❌ ${res.error}` : '✅ Picked new winner(s).');
  }

  const durationMs = gw.parseDuration(args[0]);
  const winners = parseInt(args[1], 10);
  if (!durationMs || !Number.isInteger(winners) || winners < 1 || winners > 20) {
    return message.reply({ embeds: [ui.error(message.client, 'Invalid Usage', USAGE)] });
  }
  if (durationMs < gw.MIN_MS || durationMs > gw.MAX_MS) {
    return message.reply({ embeds: [ui.error(message.client, 'Invalid Duration', 'The duration must be between **10 seconds** and **30 days**.')] });
  }

  let rest = args.slice(2);
  let hostId = message.author.id;
  const mention = (rest[0] || '').match(/^<@!?(\d{15,25})>$/);
  if (mention) { hostId = mention[1]; rest = rest.slice(1); }

  const prize = rest.join(' ').trim();
  if (!prize) return message.reply({ embeds: [ui.error(message.client, 'Missing Prize', USAGE)] });

  try {
    await gw.createGiveaway({
      guild: message.guild,
      channel: message.channel,
      hostId,
      prize: prize.slice(0, 200),
      winners,
      durationMs,
    });
    message.delete().catch(() => {});
  } catch (err) {
    message.reply(`❌ ${err.message}`).catch(() => {});
  }
}

module.exports = { name: 'giveaway', execute };
