const config = require('../config/bot');
const logger = require('../utils/logger');
const cooldown = require('../utils/cooldown');
const { tryClaim } = require('../utils/dedup');
const { baseEmbed, COLORS } = require('../utils/embeds');

if (!global._baddiesCommandCount) global._baddiesCommandCount = 0;
if (!global._baddiesProcessed) global._baddiesProcessed = new Map();

const commands = new Map();

const PROCESSED_TTL_MS = 30000;
const PROCESSED_CLEANUP_MS = 60000;

setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of global._baddiesProcessed) {
    if (now - ts > PROCESSED_TTL_MS) global._baddiesProcessed.delete(id);
  }
}, PROCESSED_CLEANUP_MS).unref();

function registerCommands() {
  const commandFiles = [
    'help', 'stats', 'daily', 'domains', 'check', 'check-s', 'check-d',
    'site', 'support', 'info', 'userinfo', 'avatar', 'ban', 'unban', 'ticket', 'vouch', 'hyperlink', 'dm', 'dualhook', 'purge',
    'kick', 'timeout', 'warn', 'warnings', 'slowmode', 'lock', 'unlock', 'say', 'role', 'serverinfo', 'botinfo', 'embed', 'welcome', 'giveaway', 'invite',
  ];

  for (const name of commandFiles) {
    try {
      const cmd = require(`../commands/${name}`);
      commands.set(cmd.name || name, cmd);
    } catch (err) {
      logger.error(`Failed to load command ${name}: ${err.message}`);
    }
  }
}

registerCommands();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (global._baddiesProcessed.has(message.id)) return;
    global._baddiesProcessed.set(message.id, Date.now());
    if (!message.content || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    let commandName = args.shift().toLowerCase();

    const aliasMap = { support: 'ticket', invites: 'invite' };
    if (aliasMap[commandName]) commandName = aliasMap[commandName];

    const command = commands.get(commandName);
    if (!command) return;

    const cd = cooldown.check(message.author.id, commandName, 2000);
    if (cd.onCooldown) return;

    const claimed = await tryClaim(message.id);
    if (!claimed) return;

    global._baddiesCommandCount++;

    try {
      await command.execute(message, args, message.client, commandName);
    } catch (err) {
      logger.error(`Command ${commandName} error: ${err.message}`);
      logger.error(err.stack);
      message.channel.send({
        embeds: [baseEmbed(message, COLORS.ERROR)
          .setDescription(`\u274C **${err.message.substring(0, 100)}**`)],
      }).catch(() => {});
    }
  },
};
