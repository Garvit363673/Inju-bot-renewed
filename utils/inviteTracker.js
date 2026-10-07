'use strict';

const logger = require('./logger');

/* guildId -> Map(code -> { uses, maxUses, inviterId }) */
const cache = new Map();

function snapshot(invites) {
  const map = new Map();
  for (const inv of invites.values()) {
    map.set(inv.code, {
      uses: inv.uses ?? 0,
      maxUses: inv.maxUses ?? 0,
      inviterId: inv.inviter?.id ?? null,
    });
  }
  return map;
}

async function cacheGuild(guild) {
  try {
    const invites = await guild.invites.fetch();
    cache.set(guild.id, snapshot(invites));
  } catch (err) {
    // Usually means the bot lacks "Manage Server"
    logger.warn(`Invite cache failed for ${guild.name}: ${err.message}`);
  }
}

/** Works out which invite a new member used. Always safe: falls back to Unknown. */
async function resolveInvite(member) {
  const unknown = { invitedBy: 'Unknown', inviteCode: 'Unknown' };
  const guild = member.guild;

  try {
    const before = cache.get(guild.id);
    const invites = await guild.invites.fetch();
    const after = snapshot(invites);
    cache.set(guild.id, after);

    if (!before) return unknown;

    let used = null;

    // 1) An invite whose use count went up
    for (const inv of invites.values()) {
      const old = before.get(inv.code);
      if (old && (inv.uses ?? 0) > old.uses) { used = inv; break; }
      if (!old && (inv.uses ?? 0) > 0) { used = inv; break; } // brand new invite, used instantly
    }

    // 2) A single-use / limited invite that vanished after its last use
    if (!used) {
      for (const [code, old] of before) {
        if (!after.has(code) && old.maxUses > 0 && old.uses + 1 >= old.maxUses) {
          return {
            invitedBy: old.inviterId ? `<@${old.inviterId}>` : 'Unknown',
            inviteCode: code,
          };
        }
      }
    }

    if (used) {
      return {
        invitedBy: used.inviter ? `<@${used.inviter.id}>` : 'Unknown',
        inviteCode: used.code,
      };
    }

    // 3) Vanity URL
    if (guild.vanityURLCode) {
      return { invitedBy: 'Vanity URL', inviteCode: guild.vanityURLCode };
    }
  } catch (err) {
    logger.warn(`Invite lookup failed: ${err.message}`);
  }

  return unknown;
}

/** Call once after the client is created. */
function init(client) {
  const cacheAll = () => {
    for (const guild of client.guilds.cache.values()) cacheGuild(guild);
  };

  client.once('ready', cacheAll);
  if (client.isReady && client.isReady()) cacheAll();

  client.on('guildCreate', cacheGuild);
  client.on('inviteCreate', (invite) => {
    if (!invite.guild) return;
    const map = cache.get(invite.guild.id) ?? new Map();
    map.set(invite.code, {
      uses: invite.uses ?? 0,
      maxUses: invite.maxUses ?? 0,
      inviterId: invite.inviter?.id ?? null,
    });
    cache.set(invite.guild.id, map);
  });
  client.on('inviteDelete', (invite) => {
    // keep the entry so an invite deleted right after its last use can still be matched
    const map = cache.get(invite.guild?.id);
    if (!map) return;
    const old = map.get(invite.code);
    if (old && old.maxUses > 0 && old.uses + 1 >= old.maxUses) return;
    map.delete(invite.code);
  });
}

module.exports = { init, resolveInvite };
