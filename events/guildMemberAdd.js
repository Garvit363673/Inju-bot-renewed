const User = require('../database/models/User');
const config = require('../config/bot');
const logger = require('../utils/logger');
const { buildWelcome } = require('../commands/welcome');

function findWelcomeChannel(guild) {
  const id = process.env.WELCOME_CHANNEL_ID;
  if (id) {
    const byId = guild.channels.cache.get(id);
    if (byId) return byId;
  }
  if (guild.systemChannel) return guild.systemChannel;
  return guild.channels.cache.find(
    (c) => c.isTextBased?.() && c.name && c.name.toLowerCase().includes('welcome')
  ) || null;
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.user.bot) return;

    try {
      const user = await User.findOne({ discordId: member.id, verified: true });
      if (user && config.memberRoleId) {
        const role = member.guild.roles.cache.get(config.memberRoleId);
        if (role) {
          await member.roles.add(role);
          logger.info(`Auto-restored role for ${member.user.tag}`);
        }
      }
    } catch (err) {
      logger.error(`guildMemberAdd error: ${err.message}`);
    }

    try {
      const channel = findWelcomeChannel(member.guild);
      if (!channel) {
        logger.warn('Welcome: no channel found. Set WELCOME_CHANNEL_ID in Railway.');
        return;
      }
      await channel.send(buildWelcome(member));
    } catch (err) {
      logger.error(`Welcome message error: ${err.message}`);
    }
  },
};
