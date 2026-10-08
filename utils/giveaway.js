'use strict';

const {
  SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./logger');
const { hasAnyStaffRole } = require('../config/roles');
const Giveaway = require('../database/models/Giveaway');

/* ─────────────── Giveaway card settings ─────────────── */

const BULLET        = '▼';
const EMBED_COLOR   = 0x0b0b0f;
const BUTTON_LABEL  = 'Enter Giveaway';
const BUTTON_EMOJI  = '🎉';
const MIN_MS        = 10 * 1000;
const MAX_MS        = 30 * 24 * 60 * 60 * 1000;
const SWEEP_MS      = 15 * 1000;
// Used when no image is given. Replace with any image/GIF link you like.
const DEFAULT_IMAGE =
  'https://media.discordapp.net/attachments/1388640751101149399/1550588397683212378/a_8f99691930d32be6beff0119641af521.gif?ex=6ac69c7a&is=6ac54afa&hm=e965d84eecc9c36d59d33bffa30254d65b3977978cc4c98c95839fe54ea6455c&width=512&height=180&';

const dbOK = () => mongoose.connection.readyState === 1;

/* ─────────────── Helpers ─────────────── */

/** "1d12h", "30m", "2 h" → milliseconds, or null if it can't be read. */
function parseDuration(input) {
  if (!input) return null;
  const text = String(input).toLowerCase().replace(/\s+/g, '');
  const re = /(\d+)(w|d|h|m|s)/g;
  const units = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };
  let ms = 0, matched = '', m;
  while ((m = re.exec(text))) {
    ms += parseInt(m[1], 10) * units[m[2]];
    matched += m[0];
  }
  return matched.length && matched === text ? ms : null;
}

function formatDate(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(x.getUTCDate())}/${p(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`;
}

function validImage(url) {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim()) ? url.trim() : null;
}

function buildEmbed(gw, guild) {
  const when = Math.floor(new Date(gw.ended ? (gw.endedAt || gw.endsAt) : gw.endsAt).getTime() / 1000);
  const winnersText = gw.ended
    ? (gw.winners.length ? gw.winners.map((id) => `<@${id}>`).join(', ') : '`None`')
    : `\`${gw.winnerCount}\``;

  const lines = [
    `### ${BULLET} ${gw.prize}`,
    gw.ended
      ? `${BULLET} **This giveaway has ended!**`
      : `${BULLET} **Press the Enter Giveaway button to enter!**`,
    '',
    '**Giveaway Info:**',
    `${BULLET} **${gw.ended ? 'Ended' : 'Ends'}:** <t:${when}:R> (<t:${when}:f>)`,
    `${BULLET} **Host:** <@${gw.hostId}>`,
    `${BULLET} **Entries:** \`${gw.entries.length}\``,
    `${BULLET} **Winners:** ${winnersText}`,
  ];

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(gw.prize)
    .setDescription(lines.join('\n'))
    .setImage(gw.imageUrl || DEFAULT_IMAGE)
    .setFooter({ text: formatDate(gw.ended ? (gw.endedAt || gw.endsAt) : gw.endsAt) });

  const icon = guild?.iconURL?.({ extension: 'png', size: 128 });
  if (icon) embed.setThumbnail(icon);
  return embed;
}

function buildRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gw_enter')
      .setLabel(BUTTON_LABEL)
      .setEmoji(BUTTON_EMOJI)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

async function pickWinners(guild, pool, count, exclude = []) {
  const candidates = pool.filter((id) => !exclude.includes(id));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const winners = [];
  for (const id of candidates) {
    if (winners.length >= count) break;
    if (guild) {
      const member = await guild.members.fetch(id).catch(() => null);
      if (!member) continue; // left the server
    }
    winners.push(id);
  }
  return winners;
}

/* ─────────────── Core actions ─────────────── */

async function createGiveaway({ guild, channel, hostId, prize, winners, durationMs, imageUrl }) {
  if (!dbOK()) throw new Error('The database is offline, so giveaways cannot be saved right now.');

  const me = guild.members.me;
  const perms = channel.permissionsFor(me);
  if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    throw new Error(`I need **View Channel**, **Send Messages** and **Embed Links** in ${channel}.`);
  }

  const gw = new Giveaway({
    guildId: guild.id,
    channelId: channel.id,
    hostId,
    prize,
    winnerCount: winners,
    imageUrl: validImage(imageUrl) || undefined,
    endsAt: new Date(Date.now() + durationMs),
  });

  const sent = await channel.send({ embeds: [buildEmbed(gw, guild)], components: [buildRow()] });
  gw.messageId = sent.id;
  await gw.save();
  return { gw, message: sent };
}

async function endGiveaway(client, id) {
  const gw = await Giveaway.findOneAndUpdate(
    { _id: id, ended: false },
    { $set: { ended: true, endedAt: new Date() } },
    { new: true },
  );
  if (!gw) return null;

  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  const guild = channel?.guild || client.guilds.cache.get(gw.guildId);

  gw.winners = await pickWinners(guild, gw.entries, gw.winnerCount);
  await gw.save();

  if (!channel) return gw;

  const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
  if (msg) {
    await msg.edit({ embeds: [buildEmbed(gw, guild)], components: [buildRow(true)] }).catch(() => {});
  }

  const text = gw.winners.length
    ? `🎉 Congratulations ${gw.winners.map((w) => `<@${w}>`).join(', ')}! You won **${gw.prize}**!`
    : `No valid entries, so nobody won **${gw.prize}**.`;
  await channel.send({
    content: text,
    reply: msg ? { messageReference: msg.id, failIfNotExists: false } : undefined,
    allowedMentions: { users: gw.winners },
  }).catch(() => {});

  return gw;
}

async function rerollGiveaway(client, guildId, messageId) {
  const gw = await Giveaway.findOne({ guildId, messageId, ended: true });
  if (!gw) return { error: 'I could not find an **ended** giveaway with that message ID.' };

  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  const guild = channel?.guild || client.guilds.cache.get(gw.guildId);

  let winners = await pickWinners(guild, gw.entries, gw.winnerCount, gw.winners);
  if (!winners.length) winners = await pickWinners(guild, gw.entries, gw.winnerCount);
  if (!winners.length) return { error: 'There are no entries to pick from.' };

  gw.winners = winners;
  await gw.save();

  const msg = channel ? await channel.messages.fetch(gw.messageId).catch(() => null) : null;
  if (msg) await msg.edit({ embeds: [buildEmbed(gw, guild)] }).catch(() => {});
  if (channel) {
    await channel.send({
      content: `🎉 New winner${winners.length > 1 ? 's' : ''}: ${winners.map((w) => `<@${w}>`).join(', ')}! You won **${gw.prize}**!`,
      reply: msg ? { messageReference: msg.id, failIfNotExists: false } : undefined,
      allowedMentions: { users: winners },
    }).catch(() => {});
  }
  return { gw };
}

async function endByMessageId(client, guildId, messageId) {
  const gw = await Giveaway.findOne({ guildId, messageId, ended: false });
  if (!gw) return null;
  return endGiveaway(client, gw._id);
}

/* ─────────────── Live entry counter ─────────────── */

const pendingUpdates = new Map();
function scheduleUpdate(client, messageId) {
  if (pendingUpdates.has(messageId)) return;
  pendingUpdates.set(messageId, setTimeout(async () => {
    pendingUpdates.delete(messageId);
    try {
      const gw = await Giveaway.findOne({ messageId });
      if (!gw || gw.ended) return;
      const channel = await client.channels.fetch(gw.channelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ embeds: [buildEmbed(gw, channel.guild)] });
    } catch (err) {
      logger.warn(`Giveaway counter update failed: ${err.message}`);
    }
  }, 3000));
}

/* ─────────────── Slash command ─────────────── */

const slashCommand = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .addSubcommand((s) => s
    .setName('create')
    .setDescription('Creates a new giveaway')
    .addStringOption((o) => o.setName('duration').setDescription('How long it lasts, e.g. 30m, 2h, 1d, 1d12h').setRequired(true))
    .addIntegerOption((o) => o.setName('winners').setDescription('How many winners').setMinValue(1).setMaxValue(20).setRequired(true))
    .addStringOption((o) => o.setName('prize').setDescription('What is being given away').setMaxLength(200).setRequired(true))
    .addUserOption((o) => o.setName('host').setDescription('Hosted by (defaults to you)'))
    .addChannelOption((o) => o.setName('channel').setDescription('Where to post it (defaults to this channel)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('image').setDescription('Image or GIF link for the banner')))
  .addSubcommand((s) => s
    .setName('end')
    .setDescription('Ends a giveaway right now')
    .addStringOption((o) => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
  .addSubcommand((s) => s
    .setName('reroll')
    .setDescription('Picks new winner(s) for an ended giveaway')
    .addStringOption((o) => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)));

function isAllowed(member) {
  return !!member && (hasAnyStaffRole(member) || member.permissions?.has(PermissionFlagsBits.ManageGuild));
}

const EPHEMERAL = MessageFlags.Ephemeral;

async function handleSlash(interaction) {
  if (!interaction.inGuild()) return;
  if (!isAllowed(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can manage giveaways.', flags: EPHEMERAL });
  }

  await interaction.deferReply({ flags: EPHEMERAL });
  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const durationMs = parseDuration(interaction.options.getString('duration'));
    if (!durationMs) {
      return interaction.editReply('❌ I could not read that duration. Try `30m`, `2h`, `1d` or `1d12h`.');
    }
    if (durationMs < MIN_MS || durationMs > MAX_MS) {
      return interaction.editReply('❌ The duration must be between **10 seconds** and **30 days**.');
    }
    const host = interaction.options.getUser('host') || interaction.user;
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      const { message } = await createGiveaway({
        guild: interaction.guild,
        channel,
        hostId: host.id,
        prize: interaction.options.getString('prize'),
        winners: interaction.options.getInteger('winners'),
        durationMs,
        imageUrl: interaction.options.getString('image'),
      });
      return interaction.editReply(`✅ Giveaway started in ${channel}: ${message.url}`);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }
  }

  const messageId = interaction.options.getString('message_id').trim();

  if (sub === 'end') {
    const gw = await endByMessageId(interaction.client, interaction.guildId, messageId);
    return interaction.editReply(gw ? '✅ Giveaway ended.' : '❌ I could not find an **active** giveaway with that message ID.');
  }

  if (sub === 'reroll') {
    const res = await rerollGiveaway(interaction.client, interaction.guildId, messageId);
    return interaction.editReply(res.error ? `❌ ${res.error}` : '✅ Picked new winner(s).');
  }
}

/* ─────────────── Buttons ─────────────── */

async function handleButton(interaction) {
  const { customId, user } = interaction;

  if (customId === 'gw_enter') {
    if (!dbOK()) return interaction.reply({ content: '❌ Giveaways are unavailable right now.', flags: EPHEMERAL });
    const gw = await Giveaway.findOne({ messageId: interaction.message.id });
    if (!gw || gw.ended || gw.endsAt <= new Date()) {
      return interaction.reply({ content: '❌ This giveaway has ended.', flags: EPHEMERAL });
    }

    if (gw.entries.includes(user.id)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gw_leave_${gw.messageId}`).setLabel('Leave Giveaway').setStyle(ButtonStyle.Danger),
      );
      return interaction.reply({ content: "You're already in this giveaway!", components: [row], flags: EPHEMERAL });
    }

    await Giveaway.updateOne({ _id: gw._id, ended: false }, { $addToSet: { entries: user.id } });
    scheduleUpdate(interaction.client, gw.messageId);
    return interaction.reply({ content: '🎉 You have entered the giveaway. Good luck!', flags: EPHEMERAL });
  }

  if (customId.startsWith('gw_leave_')) {
    const messageId = customId.slice('gw_leave_'.length);
    const gw = await Giveaway.findOne({ messageId });
    if (!gw || gw.ended) {
      return interaction.update({ content: '❌ This giveaway has ended.', components: [] });
    }
    await Giveaway.updateOne({ _id: gw._id }, { $pull: { entries: user.id } });
    scheduleUpdate(interaction.client, messageId);
    return interaction.update({ content: 'You left the giveaway.', components: [] });
  }
}

async function onInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') return await handleSlash(interaction);
    if (interaction.isButton() && interaction.customId.startsWith('gw_')) return await handleButton(interaction);
  } catch (err) {
    logger.error(`Giveaway interaction error: ${err.message}`);
    const payload = { content: '❌ Something went wrong.', flags: EPHEMERAL };
    if (interaction.deferred || interaction.replied) interaction.followUp(payload).catch(() => {});
    else interaction.reply(payload).catch(() => {});
  }
}

/* ─────────────── Startup ─────────────── */

async function registerSlash(guild) {
  try {
    await guild.commands.create(slashCommand.toJSON());
  } catch (err) {
    logger.warn(`Could not register /giveaway in ${guild.name}: ${err.message} (the bot may need the "applications.commands" invite scope; !giveaway still works)`);
  }
}

async function sweep(client) {
  if (!dbOK()) return;
  try {
    const due = await Giveaway.find({ ended: false, endsAt: { $lte: new Date() } });
    for (const gw of due) await endGiveaway(client, gw._id).catch((e) => logger.error(`Giveaway end failed: ${e.message}`));
  } catch (err) {
    logger.error(`Giveaway sweep failed: ${err.message}`);
  }
}

function init(client) {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    for (const guild of client.guilds.cache.values()) registerSlash(guild);
    sweep(client);
    setInterval(() => sweep(client), SWEEP_MS);
    logger.info('Giveaway system ready');
  };

  client.once('ready', start);
  client.once('clientReady', start);
  if (client.isReady && client.isReady()) start();

  client.on('guildCreate', registerSlash);
  client.on('interactionCreate', onInteraction);
}

module.exports = {
  init, parseDuration, buildEmbed, createGiveaway, endByMessageId, rerollGiveaway,
  isAllowed, MIN_MS, MAX_MS, dbOK,
};
