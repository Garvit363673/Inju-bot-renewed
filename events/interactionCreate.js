'use strict';

const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { baseEmbed, COLORS, createTerminal, formatRow, ts, statusLabel, BTN, ticketWelcomeEmbed, ticketCloseConfirmEmbed } = require('../utils/embeds');
const { icon } = require('../utils/iconMap');
const { toSmallCaps } = require('../utils/smallCaps');
const { tryClaim } = require('../utils/dedup');
const Ticket = require('../database/models/Ticket');
const Log = require('../database/models/Log');
const config = require('../config/bot');
const theme = require('../utils/theme');
const { hasAnyStaffRole, hasRole, ROLES } = require('../config/roles');
const logger = require('../utils/logger');
const ui = require('../utils/ui');

const { buildCategoryEmbed } = require('../commands/help');
const { buildVouchEmbed, buildVouchButtons, PAGE_SIZE: VOUCH_PAGE_SIZE } = require('../commands/vouch');
const { getPending, clearPending, buildBanResultEmbed } = require('../commands/ban');

if (!global._baddiesInteractions) global._baddiesInteractions = new Map();

const INTERACTION_TTL_MS     = 30000;
const INTERACTION_CLEANUP_MS = 60000;

// Transcript channel — all closed ticket transcripts are posted here
const TRANSCRIPT_CHANNEL_ID = '1520805770566828132';

// Track who clicked "CLOSE TICKET", keyed by channel ID
const ticketClosePending = new Map();

// Track who clicked "CLAIM" (awaiting include-user choice), keyed by channel ID
const pendingClaim = new Map();   // channelId → { clickerId, welcomeMsgId, ts }

// Track currently-claimed tickets, keyed by channel ID
const claimedTickets = new Map(); // channelId → { claimerId, userId, includeUser }

// Track the welcome message ID for each ticket channel (needed for button swaps)
const ticketWelcomeMsgId = new Map(); // channelId → messageId

setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of global._baddiesInteractions) {
    if (now - ts > INTERACTION_TTL_MS) global._baddiesInteractions.delete(id);
  }
  for (const [channelId, entry] of ticketClosePending) {
    if (now - entry.ts > 60_000) ticketClosePending.delete(channelId);
  }
  for (const [channelId, entry] of pendingClaim) {
    if (now - entry.ts > 120_000) pendingClaim.delete(channelId);
  }
}, INTERACTION_CLEANUP_MS).unref();

function dbOK() { return mongoose.connection.readyState === 1; }

// Shared auth helper: staff OR ticket author
async function canManageTicket(guild, interaction) {
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return false;
  if (hasAnyStaffRole(member)) return true;

  if (dbOK()) {
    const ticket = await Ticket.findOne({ channelId: interaction.channel?.id, status: 'open' }).catch(() => null);
    if (ticket && String(ticket.userId) === interaction.user.id) return true;
  }

  const channelName = interaction.channel?.name ?? '';
  const slug  = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const slug2 = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  return channelName.includes(slug) || channelName.includes(slug2);
}

const LEGACY_CATEGORIES = [
  { label: 'General Support', value: 'general', emoji: '\u2753' },
  { label: 'Account Issue',   value: 'account', emoji: '\uD83D\uDD10' },
  { label: 'Billing',         value: 'billing', emoji: '\uD83D\uDCB3' },
  { label: 'Report',          value: 'report',  emoji: '\uD83D\uDEA8' },
  { label: 'Other',           value: 'other',   emoji: '\uD83D\uDCDD' },
];

// ─── Ticket button rows ───────────────────────────────────────────────────────
function buildNormalTicketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('CLOSE TICKET').setEmoji(icon('BTN_CLOSE')).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('CLAIM').setStyle(ButtonStyle.Secondary),
  );
}

function buildClaimedTicketRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('CLOSE TICKET').setEmoji(icon('BTN_CLOSE')).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('UNCLAIM').setStyle(ButtonStyle.Success),
  );
}

// ─── Auto-transcript sender ───────────────────────────────────────────────────
async function sendTranscript(client, ticket, closerUser, channelName, rawMessages) {
  const transcriptCh = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
  if (!transcriptCh) return;

  // Build sorted message list (oldest → newest), filter system/bot-only lines
  const msgs = (rawMessages || [])
    .filter(m => m.author && !m.system)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const headerEmbed = {
    color: 0x2b2d31,
    title: 'Ticket Transcript',
    fields: [
      { name: '▾ Ticket',    value: `▾ ${ticket?.ticketId || 'Unknown'}`,                            inline: true },
      { name: '▾ Channel',   value: `▾ #${channelName}`,                                             inline: true },
      { name: '▾ Messages',  value: `▾ ${msgs.length}`,                                              inline: true },
      { name: '▾ Opened By', value: `▾ ${ticket?.userId ? `<@${ticket.userId}>` : 'Unknown'}`,      inline: true },
      { name: '▾ Closed By', value: `▾ <@${closerUser.id}>`,                                        inline: true },
      { name: '▾ Closed At', value: `▾ <t:${Math.floor(Date.now() / 1000)}:f>`,                     inline: true },
    ],
    footer: { text: 'BADDIES Bot • Ticket System' },
  };

  // Build the .txt file content — clean, readable, no code blocks needed
  const divider = '━'.repeat(54);
  const now     = new Date();
  const nowStr  = now.toLocaleString('en-GB', { timeZone: 'UTC', hour12: false })
                    .replace(',', '') + ' UTC';

  const lines = msgs.map(m => {
    const d    = new Date(m.timestamp);
    const time = d.toLocaleString('en-GB', { timeZone: 'UTC', hour12: false })
                   .replace(',', '');
    const tag  = m.author || 'Unknown';
    const body = m.content || '[embed / attachment]';
    return `  [ ${time} ]  ${tag}\n  ${body}`;
  });

  const fileText = [
    divider,
    '  BADDIES BOT  ·  TICKET TRANSCRIPT',
    divider,
    '',
    `  Ticket    :  ${ticket?.ticketId || 'Unknown'}`,
    `  Channel   :  #${channelName}`,
    `  Opened By :  ${ticket?.userId ? `<@${ticket.userId}> (ID: ${ticket.userId})` : 'Unknown'}`,
    `  Closed By :  ${closerUser.tag || closerUser.id} (ID: ${closerUser.id})`,
    `  Closed At :  ${nowStr}`,
    `  Messages  :  ${msgs.length}`,
    '',
    divider,
    '  CONVERSATION LOG',
    divider,
    '',
    ...(msgs.length > 0
      ? lines.flatMap(l => [l, ''])
      : ['  (no messages recorded)']),
    divider,
    '  END OF TRANSCRIPT',
    divider,
  ].join('\n');

  const attachment = new AttachmentBuilder(
    Buffer.from(fileText, 'utf-8'),
    { name: `transcript-${(ticket?.ticketId || channelName).replace(/[^a-z0-9-]/gi, '-')}.txt` }
  );

  // Send embed + file in one message — Discord renders .txt inline (click View, no download needed)
  await transcriptCh.send({ embeds: [headerEmbed], files: [attachment] }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      const { customId, user, channel, guild } = interaction;
      if (global._baddiesInteractions.has(interaction.id)) return;
      global._baddiesInteractions.set(interaction.id, Date.now());
      const claimed = await tryClaim(interaction.id);
      if (!claimed) return;
      if (!guild) return interaction.reply({ content: 'This command is only available in servers.', ephemeral: true });

      const msg    = { client: interaction.client, author: user, guild };
      const client = interaction.client;

      if (interaction.isButton()) {

        // ── Ban / Unban confirmation ──────────────────────────────────────────
        if (customId.startsWith('mod_confirm_') || customId.startsWith('mod_cancel_')) {
          const msgId = interaction.message.id;
          const data  = getPending(msgId);

          if (!data) {
            return interaction.reply({
              embeds: [ui.error(client, 'Expired', 'This confirmation has expired or was already used.')],
              ephemeral: true,
            });
          }

          if (interaction.user.id !== data.moderator.id) {
            return interaction.reply({
              embeds: [ui.error(client, 'Not Yours', 'Only the moderator who ran this command can confirm or cancel it.')],
              ephemeral: true,
            });
          }

          await interaction.deferUpdate();
          clearPending(msgId);

          if (customId.startsWith('mod_cancel_')) {
            await interaction.editReply({ embeds: [ui.info(client, 'Cancelled', 'Action was cancelled.')], components: [] });
            return;
          }

          try {
            if (data.action === 'ban') {
              await guild.members.ban(data.target.id, { reason: data.reason ?? undefined });
            } else {
              await guild.bans.remove(data.target.id, data.reason ?? undefined);
            }

            if (dbOK()) {
              await Log.create({
                action: data.action,
                userId: data.target.id,
                moderatorId: data.moderator.id,
                reason: data.reason || null,
                details: { userTag: data.target.tag },
                guildId: guild.id,
              }).catch(() => {});
            }

            await interaction.editReply({
              embeds: [buildBanResultEmbed(data.target, data.moderator, data.reason, data.action)],
              components: [],
            });
          } catch (err) {
            await interaction.editReply({
              embeds: [ui.error(client, 'Action Failed', err.message, 'Check bot permissions.')],
              components: [],
            });
          }
          return;
        }

        // ── Vouch pagination ──────────────────────────────────────────────────
        if (customId.startsWith('vouch_')) {
          const parts       = customId.split('_');
          const dir         = parts[1];
          const curPage     = parseInt(parts[2], 10) || 0;
          const targetId    = parts[3];
          const requesterId = parts[4] ?? null;

          if (requesterId && interaction.user.id !== requesterId) {
            return interaction.reply({
              embeds: [ui.error(client, 'Not Yours', 'Only the person who ran this command can flip the pages.')],
              ephemeral: true,
            });
          }

          await interaction.deferUpdate();

          const target = await interaction.client.users.fetch(targetId).catch(() => null);
          if (!target) {
            await interaction.editReply({ embeds: [ui.error(client, 'User not found', 'Could not resolve that user.')] });
            return;
          }

          let vouches = [];
          if (mongoose.connection.readyState === 1) {
            const VouchModel = require('../database/models/Vouch');
            const docs = await VouchModel.find({ targetUserId: targetId }).sort({ createdAt: -1 }).lean().catch(() => []);
            vouches = docs.map(d => ({
              vouchedBy: d.authorUserId || d.vouchedBy,
              timestamp: d.createdAt?.getTime?.() || d.timestamp || Date.now(),
              note: d.message || d.note || null,
              proof: d.proofUrl || null,
            }));
          }

          const totalPages = Math.max(1, Math.ceil(vouches.length / VOUCH_PAGE_SIZE));
          const nextPage   = dir === 'prev' ? Math.max(0, curPage - 1) : Math.min(totalPages - 1, curPage + 1);

          await interaction.editReply({
            embeds:     [buildVouchEmbed(target, vouches, nextPage, client, interaction.user)],
            components: [buildVouchButtons(nextPage, totalPages, targetId, requesterId)],
          });
          return;
        }

        // ── Ticket: show close-confirmation prompt ────────────────────────────
        if (customId === 'ticket_close') {
          const allowed = await canManageTicket(guild, interaction);
          if (!allowed) {
            return interaction.reply({
              embeds: [ui.error(client, 'Permission Denied', 'Only the ticket owner or staff can close this ticket.')],
              ephemeral: true,
            });
          }

          ticketClosePending.set(interaction.channel.id, { clickerId: interaction.user.id, ts: Date.now() });

          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('CONFIRM').setEmoji(icon('STATUS_SUCCESS')).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('CANCEL').setEmoji(icon('STATUS_ERROR')).setStyle(ButtonStyle.Secondary),
          );
          await interaction.reply({
            embeds: [ticketCloseConfirmEmbed()],
            components: [confirmRow],
          });
          return;
        }

        // ── Ticket: confirm close ─────────────────────────────────────────────
        if (customId === 'ticket_close_confirm') {
          const allowed = await canManageTicket(guild, interaction);
          if (!allowed) {
            return interaction.reply({
              embeds: [ui.error(client, 'Permission Denied', 'Only the ticket owner or staff can close this ticket.')],
              ephemeral: true,
            });
          }

          const closePending = ticketClosePending.get(interaction.channel.id);
          const member  = await guild.members.fetch(interaction.user.id).catch(() => null);
          const isStaff = member && hasAnyStaffRole(member);

          if (closePending && closePending.clickerId !== interaction.user.id && !isStaff) {
            return interaction.reply({
              embeds: [ui.error(client, 'Not Yours', 'Only the person who initiated the close can confirm it.')],
              ephemeral: true,
            });
          }

          ticketClosePending.delete(interaction.channel.id);
          await interaction.deferReply();

          let ticket = null;
          if (dbOK()) {
            ticket = await Ticket.findOne({ channelId: interaction.channel?.id, status: 'open' }).catch(() => null);
          }

          // Collect messages for transcript
          const fetchedMsgs = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => new Map());
          const transcriptMsgs = [...fetchedMsgs.values()]
            .filter(m => !m.system)
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map(m => ({
              author:    m.author?.tag || 'Unknown',
              content:   m.content || '[embed/attachment]',
              timestamp: m.createdAt,
            }));

          if (ticket) {
            ticket.status     = 'closed';
            ticket.closedAt   = new Date();
            ticket.closedBy   = interaction.user.id;
            ticket.transcript = transcriptMsgs;
            await ticket.save().catch(() => {});
          }

          if (dbOK()) {
            await Log.create({
              action: 'ticket_close',
              userId: ticket?.userId ?? interaction.user.id,
              moderatorId: interaction.user.id,
              details: { ticketId: ticket?.ticketId ?? 'unknown', channelId: interaction.channel?.id },
              guildId: guild.id,
            }).catch(() => {});
          }

          // Send auto-transcript to the transcript channel
          await sendTranscript(client, ticket, interaction.user, interaction.channel.name, transcriptMsgs);

          // Clean up claim state if this ticket was claimed
          claimedTickets.delete(interaction.channel.id);
          ticketWelcomeMsgId.delete(interaction.channel.id);

          await interaction.editReply({
            embeds: [baseEmbed(msg, theme.ASTRAL_CORE)
              .setTitle('Ticket Closing')
              .setDescription('This channel will be deleted in 5 seconds.\nTranscript saved.')],
          });
          setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
          return;
        }

        // ── Ticket: cancel close ──────────────────────────────────────────────
        if (customId === 'ticket_close_cancel') {
          const closePending = ticketClosePending.get(interaction.channel.id);
          const member  = await guild.members.fetch(interaction.user.id).catch(() => null);
          const isStaff = member && hasAnyStaffRole(member);

          if (closePending && closePending.clickerId !== interaction.user.id && !isStaff) {
            return interaction.reply({
              embeds: [ui.error(client, 'Not Yours', 'Only the person who initiated the close can cancel it.')],
              ephemeral: true,
            });
          }

          ticketClosePending.delete(interaction.channel.id);
          await interaction.reply({ embeds: [ui.info(client, 'Cancelled', 'Ticket closure cancelled.')], ephemeral: true });
          return;
        }

        // ── Ticket: claim — prompt "include user?" ────────────────────────────
        if (customId === 'ticket_claim') {
          const member = await guild.members.fetch(interaction.user.id).catch(() => null);
          if (!member || !hasAnyStaffRole(member)) {
            return interaction.reply({
              embeds: [ui.error(client, 'Permission Denied', 'Only staff can claim a ticket.')],
              ephemeral: true,
            });
          }

          if (claimedTickets.has(interaction.channel.id)) {
            return interaction.reply({
              embeds: [ui.error(client, 'Already Claimed', 'This ticket is already claimed.')],
              ephemeral: true,
            });
          }

          // Store which message has the buttons so we can swap them after
          pendingClaim.set(interaction.channel.id, {
            clickerId:    interaction.user.id,
            welcomeMsgId: interaction.message.id,
            ts:           Date.now(),
          });

          const choiceRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim_yes').setLabel('YES — they can view').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_claim_no').setLabel('NO — hide from them').setStyle(ButtonStyle.Danger),
          );

          await interaction.reply({
            embeds: [{
              color: 0xFFA500,
              title: `${icon('BTN_CLOSE')}  Claim Ticket`,
              description: 'Should the **ticket owner** be able to **view** this ticket while it is claimed?\n\nFounders only will be able to message and take action.',
            }],
            components: [choiceRow],
            ephemeral: true,
          });
          return;
        }

        // ── Ticket: claim_yes / claim_no ──────────────────────────────────────
        if (customId === 'ticket_claim_yes' || customId === 'ticket_claim_no') {
          const includeUser = customId === 'ticket_claim_yes';
          const claimData   = pendingClaim.get(interaction.channel.id);

          if (!claimData || claimData.clickerId !== interaction.user.id) {
            return interaction.reply({
              embeds: [ui.error(client, 'Expired', 'Claim session expired or was not yours.')],
              ephemeral: true,
            });
          }

          pendingClaim.delete(interaction.channel.id);

          // Get ticket userId for permission overrides
          let ticketUserId = null;
          if (dbOK()) {
            const t = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' }).catch(() => null);
            ticketUserId = t?.userId ?? null;
          }

          // Build overwrite list
          const overwrites = [
            { id: guild.id,                  deny:  [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id,            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
            { id: ROLES.FOUNDER,             allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
          ];

          if (ticketUserId) {
            overwrites.push({
              id: ticketUserId,
              ...(includeUser
                ? { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] }
                : { deny:  [PermissionFlagsBits.ViewChannel] }),
            });
          }

          await interaction.channel.permissionOverwrites.set(overwrites).catch(() => {});

          // Store claim state
          claimedTickets.set(interaction.channel.id, {
            claimerId:   interaction.user.id,
            userId:      ticketUserId,
            includeUser,
          });

          // Swap buttons on the welcome message
          const welcomeMsgId = claimData.welcomeMsgId;
          if (welcomeMsgId) {
            const welcomeMsg = await interaction.channel.messages.fetch(welcomeMsgId).catch(() => null);
            if (welcomeMsg) {
              await welcomeMsg.edit({ components: [buildClaimedTicketRow()] }).catch(() => {});
            }
          }

          // Announce claim in channel
          await interaction.channel.send({
            embeds: [{
              color: 0xFFA500,
              title: `${icon('BTN_CLOSE')}  Ticket Claimed & Frozen`,
              description:
                `This ticket has been **claimed** by <@${interaction.user.id}>.\n\n` +
                `${icon('STATUS_WARNING')} The ticket is now **frozen** — only **Founders** can message or take action.\n` +
                (includeUser
                  ? `${icon('BTN_STATUS')} The ticket owner **can** still view this channel.`
                  : `${icon('STATUS_ERROR')} The ticket owner **cannot** see this channel.`),
              timestamp: new Date().toISOString(),
            }],
          }).catch(() => {});

          await interaction.reply({ content: `${icon('STATUS_SUCCESS')} Ticket claimed.`, ephemeral: true });
          return;
        }

        // ── Ticket: unclaim ───────────────────────────────────────────────────
        if (customId === 'ticket_unclaim') {
          const member = await guild.members.fetch(interaction.user.id).catch(() => null);
          if (!member || !hasRole(member, ROLES.FOUNDER)) {
            return interaction.reply({
              embeds: [ui.error(client, 'Permission Denied', 'Only Founders can unclaim a ticket.')],
              ephemeral: true,
            });
          }

          const claimState = claimedTickets.get(interaction.channel.id);
          claimedTickets.delete(interaction.channel.id);

          // Get ticket info for permission restore
          let ticketUserId = claimState?.userId ?? null;
          if (!ticketUserId && dbOK()) {
            const t = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' }).catch(() => null);
            ticketUserId = t?.userId ?? null;
          }

          // Restore normal ticket permissions
          const overwrites = [
            { id: guild.id,       deny:  [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
          ];
          if (ticketUserId) {
            overwrites.push({ id: ticketUserId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
          }
          if (config.supportRoleId) {
            overwrites.push({ id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory] });
          }

          await interaction.channel.permissionOverwrites.set(overwrites).catch(() => {});

          // Swap buttons back to normal
          const welcomeMsgId = ticketWelcomeMsgId.get(interaction.channel.id);
          if (welcomeMsgId) {
            const welcomeMsg = await interaction.channel.messages.fetch(welcomeMsgId).catch(() => null);
            if (welcomeMsg) {
              await welcomeMsg.edit({ components: [buildNormalTicketRow()] }).catch(() => {});
            }
          }

          await interaction.channel.send({
            embeds: [{
              color: 0x57F287,
              title: `${icon('BTN_REOPEN')}  Ticket Unclaimed`,
              description: `${icon('STATUS_SUCCESS')} Ticket has been **unclaimed** by <@${interaction.user.id}>. Support staff can now access this ticket again.`,
              timestamp: new Date().toISOString(),
            }],
          }).catch(() => {});

          await interaction.reply({ content: `${icon('STATUS_SUCCESS')} Ticket unclaimed.`, ephemeral: true });
          return;
        }

        // ── Verify click ──────────────────────────────────────────────────────
        if (customId === 'verify_click') {
          if (!dbOK()) return interaction.reply({ content: 'Database unavailable.', ephemeral: true });

          const VerificationSession = require('../database/models/VerificationSession');
          const crypto = require('crypto');
          const state  = crypto.randomBytes(16).toString('hex');

          await VerificationSession.create({ discordId: interaction.user.id, state, guildId: guild.id }).catch(() => {});

          const params   = new URLSearchParams({ state, guildId: guild.id });
          const oauthURL = config.redirectUri.replace('/callback', '/login') + '?' + params;

          await interaction.reply({
            embeds: [baseEmbed(msg, COLORS.VERIFY).setTitle('Verification').setDescription(`One-click verification.\n\n[**Authorize with Discord →**](${oauthURL})`)],
            ephemeral: true,
          });
          return;
        }

        // ── Ticket panel open ─────────────────────────────────────────────────
        if (customId === 'ticket_open_panel') {
          const { buildTicketSelector } = require('../commands/ticket');
          await interaction.reply({
            embeds: [baseEmbed(msg, theme.ASTRAL_CORE).setTitle('Open a Ticket').setDescription('Select a category below.')],
            components: [buildTicketSelector()],
            ephemeral: true,
          });
          return;
        }

        // ── Legacy silent handlers ────────────────────────────────────────────
        if (customId.startsWith('help_') || customId.startsWith('pg_') || customId.startsWith('ban_') || customId.startsWith('hl_') || customId.startsWith('tkt_') || customId.startsWith('lb_')) {
          return;
        }
      }

      // ════════════════════════════════════════════════════════════════════════
      if (interaction.isStringSelectMenu()) {

        // ── Help category selector ────────────────────────────────────────────
        if (customId === 'help_category') {
          await interaction.deferUpdate();
          const key = interaction.values[0];
          const { buildCategoryEmbed, buildHelpComponents, CATEGORIES, OVERVIEW_KEY } = require('../commands/help');
          if (key !== OVERVIEW_KEY && !CATEGORIES[key]) {
            await interaction.editReply({ embeds: [ui.error(client, 'Unknown Category', 'That category does not exist.')] });
            return;
          }
          await interaction.editReply({
            embeds:     [buildCategoryEmbed(key, client, interaction.user)],
            components: buildHelpComponents(key),
          });
          return;
        }

        // ── Ticket creation ───────────────────────────────────────────────────
        if (customId === 'ticket_category_select') {
          const { buildTicketConfirmEmbed, TICKET_CATEGORIES } = require('../commands/ticket');
          await interaction.deferUpdate();

          const category = interaction.values[0];
          const user     = interaction.user;
          const guild    = interaction.guild;

          const cat     = TICKET_CATEGORIES.find(c => c.value === category) ?? TICKET_CATEGORIES[0];
          const catSlug = category.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 20);
          const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${catSlug}`.slice(0, 100);

          const existing = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
          if (existing) {
            await interaction.followUp({
              embeds: [ui.warning(client, 'Ticket Exists', `You already have an open ticket: ${existing}`)],
              ephemeral: true,
            });
            return;
          }

          try {
            const isSnowflake = (v) => typeof v === 'string' && /^\d{17,20}$/.test(v);

            // Staff roles that should always see tickets
            const staffRoleIds = [...new Set([
              ROLES.FOUNDER, ROLES.DEVELOPER, ROLES.HEAD_MANAGER, ROLES.LEAD_ADMIN,
              ROLES.EXECUTIVE_ADMIN, ROLES.HEAD_SUPPORT, ROLES.SUPPORT,
            ])].filter(id => isSnowflake(id) && guild.roles.cache.has(id));

            const staffOverwrites = staffRoleIds.map(id => ({
              id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            }));

            // Place the ticket under the same category as the support channel
            let parentId = null;
            if (isSnowflake(config.supportChannelId)) {
              const supportCh = guild.channels.cache.get(config.supportChannelId)
                || await guild.channels.fetch(config.supportChannelId).catch(() => null);
              parentId = supportCh?.parentId ?? null;
            }
            if (!parentId) parentId = interaction.channel?.parentId ?? null;

            const channel = await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: parentId,
              topic: `Support ticket for ${user.tag} — ${cat.label}`,
              permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                ...staffOverwrites,
              ],
            });

            const ticketId = 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase();
            if (dbOK()) {
              await Ticket.create({
                ticketId,
                channelId: channel.id,
                guildId: guild.id,
                userId: user.id,
                username: user.username,
                status: 'open',
              }).catch(() => {});
            }

            const welcomeMsg = await channel.send({
              content: `<@${user.id}>`,
              embeds: [ticketWelcomeEmbed(user, cat.label)],
              components: [buildNormalTicketRow()],
            });

            // Remember which message holds the ticket buttons for CLAIM/UNCLAIM swaps
            ticketWelcomeMsgId.set(channel.id, welcomeMsg.id);

            await interaction.editReply({
              embeds: [buildTicketConfirmEmbed(channel, cat.label)],
              components: [],
            });
          } catch (err) {
            logger.error(`Ticket create failed: ${err.message}`);
            if (err.stack) logger.error(err.stack);
            await interaction.editReply({
              embeds: [ui.error(client, 'Ticket Failed', err.message || 'Unknown error', 'Check bot channel permissions.')],
              components: [],
            }).catch(() => {});
          }

          return;
        }

        // ── Legacy ticket creation ────────────────────────────────────────────
        if (customId === 'ticket_create') {
          if (!dbOK()) return interaction.reply({ content: 'Database unavailable.', ephemeral: true });

          const category = LEGACY_CATEGORIES.find(c => c.value === interaction.values[0]);
          if (!category) return;

          const existing = await Ticket.findOne({ userId: user.id, status: 'open' });
          if (existing) {
            return interaction.reply({
              embeds: [baseEmbed(msg, COLORS.ERROR).setTitle('❌ Ticket Exists').setDescription('You already have an open ticket: <#' + existing.channelId + '>')],
              ephemeral: true,
            });
          }

          await interaction.deferReply({ ephemeral: true });

          const ticketId    = 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase();
          const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: channel?.parent?.id || null,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
              { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
              { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
            ],
          });

          await Ticket.create({ ticketId, channelId: ticketChannel.id, guildId: guild.id, userId: user.id, username: user.username, status: 'open' });

          const embed = baseEmbed(msg, COLORS.TICKET_OPEN)
            .setTitle('Ticket Opened')
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setDescription('Your support channel is ready. Staff will assist you shortly.')
            .addFields(
              { name: '▾ Opened By', value: `▾ ${user}`,                                   inline: true },
              { name: '▾ Category',  value: `▾ ${category.label}`,                         inline: true },
              { name: '▾ Created',   value: `▾ ${ts()}`,                                   inline: true },
            );

          const row = new ActionRowBuilder().addComponents(BTN.danger('tkt_close', 'Close Ticket'));
          await ticketChannel.send({ content: `${user}`, embeds: [embed], components: [row] });
          await interaction.editReply({
            embeds: [baseEmbed(msg, COLORS.TICKET_OPEN).setTitle('Ticket Created').setDescription('Your ticket is ready: ' + ticketChannel)],
          });
          return;
        }
      }
    } catch (err) {
      logger.error(`Interaction error: ${err.message}`);
      logger.error(err.stack);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      } else if (interaction.deferred) {
        interaction.followUp({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
  },
};
