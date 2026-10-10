'use strict';

// Server logs: message edits/deletes, role changes, nicknames, timeouts,
// joins, leaves, kicks and bans. Posted to LOG_WEBHOOK_URL (a Discord webhook),
// or to LOG_CHANNEL_ID if no webhook is set.

const { AuditLogEvent, WebhookClient } = require('discord.js');
const config = require('../config/bot');
const logger = require('./logger');
const { cleanEmbed, kv } = require('../embeds/factories/clean');

const COLORS = { red: 0xed4245, green: 0x57f287, amber: 0xfee75c, neutral: 0x2b2d31 };
const AUDIT_WINDOW_MS = 15_000;

function ts(date = new Date()) {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`;
}

function clip(text, max = 1000) {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function userLines(user) {
  if (!user) return ['Unknown'];
  return [`<@${user.id}>`, `\`${user.username ?? user.tag ?? user.id}\``];
}

let _hook = null;
function getWebhook() {
  if (_hook !== null) return _hook || null;
  if (!config.logWebhookUrl) { _hook = false; return null; }
  try { _hook = new WebhookClient({ url: config.logWebhookUrl }); }
  catch (err) { logger.error(`Invalid LOG_WEBHOOK_URL: ${err.message}`); _hook = false; }
  return _hook || null;
}

async function send(client, guild, embed) {
  try {
    const hook = getWebhook();
    if (hook) {
      await hook.send({ username: 'BADDIES Logs', avatarURL: client.user?.displayAvatarURL?.({ size: 128 }), embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }
    const channelId = config.logChannelId;
    if (!channelId || !guild) return;
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (err) {
    logger.warn(`Server log failed: ${err.message}`);
  }
}

function logEmbed({ client, title, color, fields, description, user }) {
  const embed = cleanEmbed({
    client,
    title,
    description,
    fields,
    thumbnail: user && typeof user.displayAvatarURL === 'function' ? user.displayAvatarURL({ size: 128 }) : null,
    moduleName: 'Logs',
    gif: false,
    timestamp: new Date(),
  });
  embed.setColor(color ?? COLORS.neutral);
  return embed;
}

/** Finds who did something, from the audit log (needs the "View Audit Log" permission). */
async function findExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const entry = logs.entries.find(e =>
      e.target?.id === targetId && Date.now() - e.createdTimestamp < AUDIT_WINDOW_MS);
    return entry ? { executor: entry.executor, reason: entry.reason, entry } : null;
  } catch {
    return null;
  }
}

function init(client) {
  if (!config.logWebhookUrl && !config.logChannelId) {
    logger.warn('Server logs are off: set LOG_WEBHOOK_URL in Railway to turn them on.');
  }

  /* ── Messages ── */
  client.on('messageDelete', async (message) => {
    try {
      if (!message.guild || message.channelId === config.logChannelId) return;
      if (message.author?.bot) return;
      const attachments = message.attachments?.size
        ? [...message.attachments.values()].map(a => a.url).join('\n') : null;
      const fields = [
        kv('Author', userLines(message.author)),
        kv('Channel', [`<#${message.channelId}>`]),
        kv('Time', [ts()]),
        { name: '▾ Message', value: clip(message.content || (message.partial ? '*Not cached (sent before the bot started)*' : '*No text*')), inline: false },
      ];
      if (attachments) fields.push({ name: '▾ Attachments', value: clip(attachments), inline: false });
      await send(client, message.guild, logEmbed({ client, title: 'Message Deleted', color: COLORS.red, fields, user: message.author }));
    } catch (err) { logger.warn(`messageDelete log: ${err.message}`); }
  });

  client.on('messageDeleteBulk', async (messages, channel) => {
    try {
      if (!channel?.guild || channel.id === config.logChannelId) return;
      await send(client, channel.guild, logEmbed({
        client, title: 'Messages Purged', color: COLORS.red,
        fields: [kv('Channel', [`<#${channel.id}>`]), kv('Amount', [String(messages.size)]), kv('Time', [ts()])],
      }));
    } catch (err) { logger.warn(`messageDeleteBulk log: ${err.message}`); }
  });

  client.on('messageUpdate', async (oldMsg, newMsg) => {
    try {
      if (!newMsg.guild || newMsg.channelId === config.logChannelId) return;
      if (newMsg.author?.bot) return;
      if (oldMsg.content === newMsg.content) return;
      const fields = [
        kv('Author', userLines(newMsg.author)),
        kv('Channel', [`<#${newMsg.channelId}>`]),
        kv('Jump', [`[Go to message](${newMsg.url})`]),
        { name: '▾ Before', value: clip(oldMsg.content || '*Not cached*'), inline: false },
        { name: '▾ After', value: clip(newMsg.content || '*No text*'), inline: false },
      ];
      await send(client, newMsg.guild, logEmbed({ client, title: 'Message Edited', color: COLORS.amber, fields, user: newMsg.author }));
    } catch (err) { logger.warn(`messageUpdate log: ${err.message}`); }
  });

  /* ── Members: roles, nickname, timeout ── */
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      const guild = newMember.guild;
      const user = newMember.user;

      if (!oldMember.partial) {
        const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

        if (added.size || removed.size) {
          const who = await findExecutor(guild, AuditLogEvent.MemberRoleUpdate, user.id);
          const fields = [kv('Member', userLines(user))];
          if (who?.executor) fields.push(kv('By', userLines(who.executor)));
          fields.push(kv('Time', [ts()]));
          if (added.size) fields.push({ name: '▾ Roles Added', value: clip(added.map(r => `<@&${r.id}>`).join(' ')), inline: false });
          if (removed.size) fields.push({ name: '▾ Roles Removed', value: clip(removed.map(r => `<@&${r.id}>`).join(' ')), inline: false });
          await send(client, guild, logEmbed({
            client, title: added.size && !removed.size ? 'Role Added' : removed.size && !added.size ? 'Role Removed' : 'Roles Updated',
            color: added.size && !removed.size ? COLORS.green : COLORS.amber, fields, user,
          }));
        }

        if (oldMember.nickname !== newMember.nickname) {
          await send(client, guild, logEmbed({
            client, title: 'Nickname Changed', color: COLORS.neutral, user,
            fields: [
              kv('Member', userLines(user)),
              kv('Time', [ts()]),
              { name: '▾ Before', value: oldMember.nickname || '*None*', inline: true },
              { name: '▾ After', value: newMember.nickname || '*None*', inline: true },
            ],
          }));
        }
      }

      const before = oldMember.communicationDisabledUntilTimestamp;
      const after = newMember.communicationDisabledUntilTimestamp;
      if (before !== after) {
        const timedOut = after && after > Date.now();
        const who = await findExecutor(guild, AuditLogEvent.MemberUpdate, user.id);
        const fields = [kv('Member', userLines(user))];
        if (who?.executor) fields.push(kv('By', userLines(who.executor)));
        if (timedOut) fields.push(kv('Until', [`<t:${Math.floor(after / 1000)}:f>`]));
        fields.push(kv('Time', [ts()]));
        if (who?.reason) fields.push({ name: '▾ Reason', value: clip(who.reason), inline: false });
        await send(client, guild, logEmbed({
          client, title: timedOut ? 'Member Timed Out' : 'Timeout Removed',
          color: timedOut ? COLORS.red : COLORS.green, fields, user,
        }));
      }
    } catch (err) { logger.warn(`guildMemberUpdate log: ${err.message}`); }
  });

  /* ── Joins, leaves, kicks ── */
  client.on('guildMemberAdd', async (member) => {
    try {
      const age = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
      await send(client, member.guild, logEmbed({
        client, title: 'Member Joined', color: COLORS.green, user: member.user,
        fields: [
          kv('Member', userLines(member.user)),
          kv('Account Age', [`${age} day${age === 1 ? '' : 's'}`, `Created <t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`]),
          kv('Members', [String(member.guild.memberCount)]),
        ],
      }));
    } catch (err) { logger.warn(`guildMemberAdd log: ${err.message}`); }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const guild = member.guild;
      const user = member.user;
      // Give Discord a moment to write the audit entry
      await new Promise(r => setTimeout(r, 1500));

      const kick = await findExecutor(guild, AuditLogEvent.MemberKick, user.id);
      if (kick) {
        const fields = [kv('Member', userLines(user)), kv('By', userLines(kick.executor)), kv('Time', [ts()])];
        if (kick.reason) fields.push({ name: '▾ Reason', value: clip(kick.reason), inline: false });
        return send(client, guild, logEmbed({ client, title: 'Member Kicked', color: COLORS.red, fields, user }));
      }

      // A ban also removes the member, and it is logged by guildBanAdd instead
      const ban = await findExecutor(guild, AuditLogEvent.MemberBanAdd, user.id);
      if (ban) return;

      const roles = member.roles?.cache?.filter(r => r.id !== guild.id).map(r => `<@&${r.id}>`).join(' ');
      const fields = [kv('Member', userLines(user)), kv('Members', [String(guild.memberCount)]), kv('Time', [ts()])];
      if (member.joinedTimestamp) fields.push(kv('Joined', [`<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`]));
      if (roles) fields.push({ name: '▾ Roles', value: clip(roles), inline: false });
      await send(client, guild, logEmbed({ client, title: 'Member Left', color: COLORS.amber, fields, user }));
    } catch (err) { logger.warn(`guildMemberRemove log: ${err.message}`); }
  });

  /* ── Bans ── */
  client.on('guildBanAdd', async (ban) => {
    try {
      const who = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      const fields = [kv('Member', userLines(ban.user))];
      if (who?.executor) fields.push(kv('By', userLines(who.executor)));
      fields.push(kv('Time', [ts()]));
      const reason = ban.reason || who?.reason;
      fields.push({ name: '▾ Reason', value: clip(reason || 'No reason provided'), inline: false });
      await send(client, ban.guild, logEmbed({ client, title: 'Member Banned', color: COLORS.red, fields, user: ban.user }));
    } catch (err) { logger.warn(`guildBanAdd log: ${err.message}`); }
  });

  client.on('guildBanRemove', async (ban) => {
    try {
      const who = await findExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
      const fields = [kv('Member', userLines(ban.user))];
      if (who?.executor) fields.push(kv('By', userLines(who.executor)));
      fields.push(kv('Time', [ts()]));
      await send(client, ban.guild, logEmbed({ client, title: 'Member Unbanned', color: COLORS.green, fields, user: ban.user }));
    } catch (err) { logger.warn(`guildBanRemove log: ${err.message}`); }
  });
}

module.exports = { init };
