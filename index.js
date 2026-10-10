require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config/bot');
const { connectDB } = require('./database/connection');
const { startServer } = require('./services/server');
const antiCrash = require('./utils/antichrash');
const logger = require('./utils/logger');

antiCrash();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
  ],
});

global.client = client;
require('./utils/inviteTracker').init(client);
require('./utils/giveaway').init(client);
require('./utils/serverLogs').init(client);

async function bootstrap() {
  await connectDB(config.mongoUri);
  startServer(client);

  client.on('ready', () => {
    const readyHandler = require('./events/ready');
    readyHandler.execute(client);
  });

  client.on('messageCreate', (message) => {
    const msgHandler = require('./events/messageCreate');
    msgHandler.execute(message);
  });

  client.on('guildMemberAdd', (member) => {
    const gmaHandler = require('./events/guildMemberAdd');
    gmaHandler.execute(member);
  });

  client.on('interactionCreate', (interaction) => {
    const interactionHandler = require('./events/interactionCreate');
    interactionHandler.execute(interaction);
  });

  await client.login(config.token);
}

bootstrap().catch((err) => {
  logger.error('Fatal error: ' + err.message);
  process.exit(1);
});

module.exports = client;
