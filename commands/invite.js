'use strict';

const { EmbedBuilder } = require('discord.js');

const EMBED_COLOR = 0x2b2d31;
// NOTE: Discord attachment links expire. For a permanent GIF, upload it to your GitHub repo
// (e.g. assets/invite.gif) and set INVITE_GIF_URL in Railway to its raw.githubusercontent.com link.
const GIF_URL = process.env.INVITE_GIF_URL || null; // optional fixed GIF; otherwise a random one

function footer(user) {
  const f = { text: `Requested by ${user.username} • BADDIES Bot` };
  f.iconURL = user.displayAvatarURL({ size: 64 });
  return f;
}

function errorEmbed(user, title, desc) {
  return new EmbedBuilder().setColor(EMBED_COLOR).setTitle(title).setDescription(desc).setFooter(footer(user));
}

async function execute(message) {
  if (!message.guild) {
    return message.reply({ embeds: [errorEmbed(message.author, 'Server Only', 'Use this command inside a server.')] });
  }

  const target = message.mentions.users.first() ?? message.author;

  let invites;
  try {
    invites = await message.guild.invites.fetch();
  } catch (err) {
    return message.reply({
      embeds: [errorEmbed(message.author, 'Cannot Read Invites', 'I need the **Manage Server** permission to read invite counts.')],
    });
  }

  const mine = [...invites.values()].filter(inv => inv.inviter && inv.inviter.id === target.id);
  const total = mine.reduce((sum, inv) => sum + (inv.uses ?? 0), 0);
  const top = mine
    .filter(inv => (inv.uses ?? 0) > 0)
    .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0))
    .slice(0, 5)
    .map(inv => `▾ \`${inv.code}\` — **${inv.uses}** use${inv.uses === 1 ? '' : 's'}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('Invite Records')
    .addFields(
      { name: '▾ Member',        value: `▾ <@${target.id}>\n▾ \`${target.username}\``, inline: true },
      { name: '▾ Total Invites', value: `▾ **${total}**`,                               inline: true },
      { name: '▾ Active Links',  value: `▾ **${mine.length}**`,                         inline: true },
      { name: 'Top Invite Links', value: top || '*No invite uses yet.*' },
    )
    .setThumbnail(target.displayAvatarURL({ size: 128 }))
    .setImage(GIF_URL || require('../embeds/tokens/gifs').randomGif())
    .setFooter(footer(message.author));

  await message.reply({ embeds: [embed] });
}

module.exports = { name: 'invite', execute };
