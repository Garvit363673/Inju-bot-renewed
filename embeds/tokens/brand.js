'use strict';

const BOT_NAME = 'BADDIES';
const BRAND_DOMAIN = 'ASTRAL V2';
const BRAND_URL = 'https://aslsite.vercel.app';

function footerText(moduleName) {
  if (!moduleName) return `${BOT_NAME} Bot`;
  const m = String(moduleName);
  const nice = m === m.toUpperCase() ? m.charAt(0) + m.slice(1).toLowerCase() : m;
  return `${BOT_NAME} Bot • ${nice}`;
}

function requesterTag(user) {
  if (!user) return 'Unknown';
  return user.tag || user.username || `User#${user.discriminator || '0000'}`;
}

module.exports = { BOT_NAME, BRAND_DOMAIN, BRAND_URL, footerText, requesterTag };
