'use strict';

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const ui = require('../utils/ui');
const { hasAnyStaffRole } = require('../config/roles');
const { toSmallCaps } = require('../utils/smallCaps');

/* ─────────────── Verify panel settings ─────────────── */

const VERIFY_URL   = process.env.VERIFY_URL || 'https://restorecord.com/verify/Astral%20V2';
const BUTTON_LABEL = 'Verify';
const EMBED_COLOR  = 0x0b0b0f;
const IMAGE_URL    =
  'https://media.discordapp.net/attachments/1321694873346113592/1440826447055814757/IMG_4793.gif?ex=6ad1f7f2&is=6ad0a672&hm=9e16d551c6fd3ea33a7204ffd1560c5ee023eca171ba230b0c1863d651214c67&';

function buildVerifyPanel() {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('VERIFY REQUIRED')
    .setDescription([
      '╰┈┈┈➤',
      '',
      '• **Verify To Get Access In All Channel**',
      '• **Verify To Get Access In Site And Tools**',
      `@${toSmallCaps('MEMBER')}`,
    ].join('\n'))
    .setImage(IMAGE_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(BUTTON_LABEL)
      .setStyle(ButtonStyle.Link)
      .setURL(VERIFY_URL),
  );

  return { embeds: [embed], components: [row] };
}

async function execute(message) {
  if (!hasAnyStaffRole(message.member)) {
    return message.reply({ embeds: [ui.noPerm(message.client, 'Staff')] });
  }

  try {
    await message.channel.send(buildVerifyPanel());
    message.delete().catch(() => {});
  } catch (err) {
    message.reply(`❌ I could not post the verify panel: ${err.message}`).catch(() => {});
  }
}

module.exports = { name: 'verify', description: 'Post the verification panel', execute, buildVerifyPanel };
