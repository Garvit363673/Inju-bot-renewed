const express = require('express');
const axios = require('axios');
const config = require('../config/bot');
const User = require('../database/models/User');
const VerificationSession = require('../database/models/VerificationSession');
const logger = require('../utils/logger');

const router = express.Router();
let _client = null;

function setClient(client) {
  _client = client;
}

function getOAuthURL(state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

router.get('/oauth/login', (req, res) => {
  const { state, guildId } = req.query;
  if (!state || !guildId) {
    return res.status(400).send('Missing parameters');
  }
  const url = getOAuthURL(state);
  res.redirect(url);
});

router.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  try {
    const session = await VerificationSession.findOne({ state });
    if (!session) {
      return res.status(400).send('Invalid or expired session');
    }

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = tokenRes.data;
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userRes.data;

    await User.findOneAndUpdate(
      { discordId: discordUser.id },
      {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name || discordUser.username,
        avatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null,
        accessToken: access_token,
        verified: true,
        verifiedAt: new Date(),
      },
      { upsert: true }
    );

    await VerificationSession.deleteOne({ state });

    if (_client) {
      try {
        const { EmbedBuilder } = require('discord.js');
        const user = await _client.users.fetch(discordUser.id).catch(() => null);
        if (user) {
          const verifiedEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Verification Successful')
            .setDescription('You have been granted access to the server.')
            .addFields(
              { name: '▾ Discord', value: `▾ ${discordUser.username}`, inline: true },
              { name: '▾ Linked',  value: `▾ <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            )
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'BADDIES Bot • Verification', iconURL: _client.user.displayAvatarURL() });
          await user.send({ embeds: [verifiedEmbed] });
        }
      } catch (dmErr) {
        logger.warn('Could not send verification DM: ' + dmErr.message);
      }
    }

    res.send(`
      <html>
        <head><style>
          body { background: #0a0a0a; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: monospace; }
          .container { text-align: center; }
          .check { color: #39ff14; font-size: 64px; margin-bottom: 16px; }
          h1 { color: #39ff14; font-size: 28px; letter-spacing: 4px; text-transform: uppercase; }
          p { color: #666; font-size: 14px; margin-top: 8px; }
          .badge { color: #222; font-size: 12px; margin-top: 32px; }
        </style></head>
        <body>
          <div class="container">
            <div class="check">OK</div>
            <h1>VERIFIED</h1>
            <p>You may close this tab</p>
            <div class="badge">BADDIES  •  elite system</div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    logger.error('OAuth callback error: ' + err.message);

    if (_client) {
      try {
        const user = await _client.users.fetch(session?.discordId).catch(() => null);
        if (user) {
          const { EmbedBuilder } = require('discord.js');
          const failEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Verification Failed')
            .setDescription('Something went wrong. Please try again later.')
            .setFooter({ text: 'BADDIES Bot • Verification', iconURL: _client.user.displayAvatarURL() });
          await user.send({ embeds: [failEmbed] });
        }
      } catch {}
    }

    res.status(500).send(`
      <html>
        <head><style>
          body { background: #0a0a0a; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: monospace; }
          .container { text-align: center; }
          .x { color: #ff1744; font-size: 64px; margin-bottom: 16px; }
          h1 { color: #ff1744; font-size: 24px; }
          p { color: #666; font-size: 14px; }
        </style></head>
        <body>
          <div class="container">
            <div class="x">✗</div>
            <h1>VERIFICATION FAILED</h1>
            <p>Please try again.</p>
          </div>
        </body>
      </html>
    `);
  }
});

module.exports = { router, setClient };
