'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config/bot');
const theme  = require('../utils/theme');
const EMOJI  = require('../utils/emojis');
const ui     = require('../utils/ui');
const eb     = require('../utils/embedBuilder');
const ce     = require('../utils/customEmojis');
const { icon, iconUnicode } = require('../utils/iconMap');

function safeUpper(value, fallback = 'UNKNOWN') {
  if (value === null || value === undefined) return fallback;
  return String(value).toUpperCase();
}

const CATEGORIES = {
  social: {
    emoji:       iconUnicode('CAT_SOCIAL'),
    glyph:       iconUnicode('CAT_SOCIAL'),
    banner:      icon('CAT_SOCIAL'),
    label:       'Social & Reputation',
    description: 'Vouches, reputation tiers, community tools',
    color:       theme.BLUEBLACK,
    commands: [
      { name: '!vouch [@user] [note]', desc: 'Add a vouch to a member\'s reputation card' },
      { name: '!vouch [@user]',        desc: 'View someone\'s full vouch history and tier badge' },
      { name: '!ticket',               desc: 'Open a support ticket — category selector appears' },
      { name: '!support',              desc: 'Direct-link shortcut to open a support ticket' },
    ],
  },
  moderation: {
    emoji:       iconUnicode('CAT_MODERATION'),
    glyph:       iconUnicode('CAT_MODERATION'),
    banner:      icon('CAT_MODERATION'),
    label:       'Moderation',
    description: 'Ban management and member actions',
    color:       theme.DANGER,
    commands: [
      { name: '!ban @user|<id> [reason]',       desc: 'Ban a member — accepts @mention or raw user ID' },
      { name: '!unban @user|<id> [reason]',    desc: 'Unban a member — accepts @mention or raw user ID' },
      { name: '!kick @user [reason]',          desc: 'Kick a member from the server' },
      { name: '!timeout @user <min> [reason]', desc: 'Timeout a member for X minutes' },
      { name: '!warn @user <reason>',          desc: 'Issue a warning to a member' },
      { name: '!warnings [@user]',             desc: 'View warning history for a member' },
      { name: '!slowmode <seconds>',           desc: 'Set channel slowmode (0 = off)' },
      { name: '!lock',                         desc: 'Lock the current channel' },
      { name: '!unlock',                       desc: 'Unlock the current channel' },
      { name: '!say <message>',                desc: 'Send a message as the bot' },
      { name: '!role <add|remove> @user @role', desc: 'Add or remove a role from a member' },
    ],
  },
  tools: {
    emoji:       iconUnicode('CAT_TOOLS'),
    glyph:       iconUnicode('CAT_TOOLS'),
    banner:      icon('CAT_TOOLS'),
    label:       'Tools & Utilities',
    description: 'Formatting helpers, profile tools, messaging',
    color:       theme.DARK_BLUE,
    commands: [
      { name: '!avatar [@user]',         desc: 'High-res avatar card with download links for 4 sizes' },
      { name: '!userinfo [@user]',       desc: 'Discord profile card — ID, timestamps, roles, account age' },
      { name: '!serverinfo',             desc: 'Detailed server stats — members, channels, roles, boosts' },
      { name: '!botinfo',               desc: 'Bot version, uptime, health, command stats' },
      { name: '!info',                  desc: 'Server info — member count, creation date, boost level' },
      { name: '!hyperlink <url> <text>', desc: 'Generate a masked hyperlink — [text](url) format' },
      { name: '!dm @user <message>',    desc: 'Send a DM to a member via the bot' },
      { name: '!invite [@user]',        desc: 'Show how many people a member has invited' },
    ],
  },
};


const SITE_URL     = 'https://aslsite.vercel.app/';
const HIDELINK_URL = 'https://aslv2h.vvzx.workers.dev/';
const BOT_NAME     = 'BADDIES';
const EMBED_COLOR  = 0x2b2d31;

const OVERVIEW_KEY = 'overview';

function _categoryList() {
  return Object.entries(CATEGORIES).map(([key, cat]) => ({
    value:       key,
    label:       cat.label,
    description: cat.description,
    emoji:       cat.emoji,
  }));
}

// Short inline summary shown under each dropdown option, e.g. "+stats, +daily"
function _summary(cat, max = 5) {
  const names = cat.commands.map(c => c.name.split(' ')[0]);
  const shown = [...new Set(names)].slice(0, max).join(', ');
  return shown.length > 100 ? shown.slice(0, 97) + '…' : shown;
}

function _footer(client, user) {
  const e = { text: `Requested by ${user ? user.username : 'unknown'} • ${BOT_NAME} Bot` };
  if (user && typeof user.displayAvatarURL === 'function') e.iconURL = user.displayAvatarURL({ size: 64 });
  return e;
}

function buildHubEmbed(client, user) {
  const ping = client && client.ws && Number.isFinite(client.ws.ping) && client.ws.ping >= 0
    ? `${Math.round(client.ws.ping)}ms` : 'N/A';
  const p = config.prefix;
  const links = [`[Main Site ➜](${SITE_URL})`];
  if (HIDELINK_URL) links.push(`[Hidden Tool ➜](${HIDELINK_URL})`);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`${BOT_NAME} Commands`)
    .addFields(
      { name: '▾ System Info',   value: `▾ **Status:** Online\n▾ **Latency:** ${ping}`, inline: true },
      { name: 'Configuration',   value: `▾ **Prefix:** \`${p}\`\n▾ **Access:** Public`,   inline: true },
      { name: 'Direct Links',    value: links.map(l => `▾ ${l}`).join('\n'),              inline: true },
      {
        name: 'Navigation',
        value: '• Pick a category from the dropdown below to view commands.\n• Click the buttons below or the links above to open tools.',
        inline: false,
      },
    )
    .setFooter(_footer(client, user));

  if (client && client.user) embed.setThumbnail(client.user.displayAvatarURL({ size: 128 }));
  const gif = require('../embeds/tokens/gifs').randomGif();
  if (gif) embed.setImage(gif);
  return embed;
}

function buildCategoryEmbed(key, client, user) {
  if (key === OVERVIEW_KEY) return buildHubEmbed(client, user);
  const cat = CATEGORIES[key];
  if (!cat) return new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Unknown Category').setDescription('That category does not exist.');

  const lines = cat.commands.map(c => `**\`${c.name}\`**\n${c.desc}`).join('\n\n');
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`${cat.label}`)
    .setDescription(`${cat.description}\n\n${lines}`.slice(0, 4096))
    .setFooter(_footer(client, user));
  if (client && client.user) embed.setThumbnail(client.user.displayAvatarURL({ size: 128 }));
  const gif = require('../embeds/tokens/gifs').randomGif();
  if (gif) embed.setImage(gif);
  return embed;
}

function buildHelpSelector(selected = OVERVIEW_KEY) {
  const p = config.prefix;
  const options = [{
    label: 'Overview',
    value: OVERVIEW_KEY,
    description: 'Bot status and quick info',
    emoji: '🏠',
    default: selected === OVERVIEW_KEY,
  }];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const summary = cat.commands.slice(0, 5).map(c => p + c.name.replace(/^!/, '').split(' ')[0]).join(', ');
    options.push({
      label: cat.label,
      value: key,
      description: summary.slice(0, 100),
      emoji: cat.emoji,
      default: selected === key,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Select a category…')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function buildLinkRow() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Main Site').setStyle(ButtonStyle.Link).setURL(SITE_URL),
  );
  if (HIDELINK_URL) {
    row.addComponents(new ButtonBuilder().setLabel('Hidden Tool').setStyle(ButtonStyle.Link).setURL(HIDELINK_URL));
  }
  return row;
}

function buildHelpComponents(selected = OVERVIEW_KEY) {
  return [buildHelpSelector(selected), buildLinkRow()];
}

async function execute(message, args, client) {
  const c = client || message.client;
  await message.reply({
    embeds:     [buildHubEmbed(c, message.author)],
    components: buildHelpComponents(OVERVIEW_KEY),
  });
}

module.exports = {
  name: 'help', execute,
  buildCategoryEmbed, buildHubEmbed, buildHelpSelector, buildHelpComponents, CATEGORIES, OVERVIEW_KEY,
};
