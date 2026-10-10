require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  MONGO_URI: z.string().optional().default(''),
  LOGGED_X_ID: z.string().optional().default(''),
  LOGGED_X_TOKEN: z.string().optional().default(''),
  OWNER_ID: z.string().optional().default(''),
  API_BASE_URL: z.string().url().default('https://api.injuries.to'),
  WS_URL: z.string().min(1).default('wss://ws.injuries.to'),
  SUPPORT_ROLE_ID: z.string().optional().default(''),
  MEMBER_ROLE_ID: z.string().optional().default(''),
  FOUNDER_ROLE_ID: z.string().optional().default(''),
  DEVELOPER_ROLE_ID: z.string().optional().default(''),
  HEAD_MANAGER_ROLE_ID: z.string().optional().default(''),
  LEAD_ADMIN_ROLE_ID: z.string().optional().default(''),
  EXECUTIVE_ADMIN_ROLE_ID: z.string().optional().default(''),
  HEAD_SUPPORT_ROLE_ID: z.string().optional().default(''),
  CONTENT_CREATOR_ROLE_ID: z.string().optional().default(''),
  HITTER_1_ROLE_ID: z.string().optional().default(''),
  HITTER_2_ROLE_ID: z.string().optional().default(''),
  HITTER_3_ROLE_ID: z.string().optional().default(''),
  BOT_ROLE_ID: z.string().optional().default(''),
  BOOSTER_ROLE_ID: z.string().optional().default(''),
  VERIFY_CHANNEL_ID: z.string().optional().default(''),
  VOUCH_CHANNEL_ID: z.string().optional().default(''),
  SUPPORT_CHANNEL_ID: z.string().optional().default('1532405619028529334'),
  GUILD_ID: z.string().optional().default(''),
  LOG_CHANNEL_ID: z.string().optional().default(''),
  LOG_WEBHOOK_URL: z.string().optional().default(''),
  VOUCH_WEBHOOK_URL: z.string().optional().default(''),
  PORT: z.string().optional().default('3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

const config = {
  token: parsed.data.DISCORD_TOKEN,
  clientId: parsed.data.DISCORD_CLIENT_ID,
  clientSecret: parsed.data.DISCORD_CLIENT_SECRET,
  redirectUri: parsed.data.DISCORD_REDIRECT_URI,
  mongoUri: parsed.data.MONGO_URI,
  xId: parsed.data.LOGGED_X_ID,
  xToken: parsed.data.LOGGED_X_TOKEN,
  ownerId: parsed.data.OWNER_ID,
  apiBaseUrl: parsed.data.API_BASE_URL,
  wsUrl: parsed.data.WS_URL,
  supportRoleId: parsed.data.SUPPORT_ROLE_ID,
  memberRoleId: parsed.data.MEMBER_ROLE_ID,
  founderRoleId: parsed.data.FOUNDER_ROLE_ID,
  developerRoleId: parsed.data.DEVELOPER_ROLE_ID,
  headManagerRoleId: parsed.data.HEAD_MANAGER_ROLE_ID,
  leadAdminRoleId: parsed.data.LEAD_ADMIN_ROLE_ID,
  executiveAdminRoleId: parsed.data.EXECUTIVE_ADMIN_ROLE_ID,
  headSupportRoleId: parsed.data.HEAD_SUPPORT_ROLE_ID,
  contentCreatorRoleId: parsed.data.CONTENT_CREATOR_ROLE_ID,
  hitter1RoleId: parsed.data.HITTER_1_ROLE_ID,
  hitter2RoleId: parsed.data.HITTER_2_ROLE_ID,
  hitter3RoleId: parsed.data.HITTER_3_ROLE_ID,
  botRoleId: parsed.data.BOT_ROLE_ID,
  boosterRoleId: parsed.data.BOOSTER_ROLE_ID,
  verifyChannelId: parsed.data.VERIFY_CHANNEL_ID,
  vouchChannelId: parsed.data.VOUCH_CHANNEL_ID,
  supportChannelId: parsed.data.SUPPORT_CHANNEL_ID,
  guildId: parsed.data.GUILD_ID,
  logChannelId: parsed.data.LOG_CHANNEL_ID,
  logWebhookUrl: parsed.data.LOG_WEBHOOK_URL,
  vouchWebhookUrl: parsed.data.VOUCH_WEBHOOK_URL,
  port: parseInt(parsed.data.PORT, 10) || 3000,


  prefix: '!',
  embedColor: 0x07060f,
  accentColor: 0x00d4ff,
  glowColor: '#00d4ff',
  footerText: 'BADDIES BOT • elite system',
  footerIcon: '',
};

module.exports = config;
