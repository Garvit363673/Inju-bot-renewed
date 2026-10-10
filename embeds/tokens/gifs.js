'use strict';

// Random GIF banner shown under embeds. Add or remove links here.
// Discord CDN links expire (see the ex= value); expired ones are skipped automatically.
// For links that never expire, host the GIF in your GitHub repo and use its raw.githubusercontent.com link.
const GIFS = [
  'https://cdn.discordapp.com/attachments/1321694873346113592/1460836900490444810/IMG_4789.gif?ex=6acb0162&is=6ac9afe2&hm=07afa6c5ac75249ee27ab42115bf5320a9d27236ef4aae832874a0af52c21853&',
  'https://media.tenor.com/aYMfjRBWKaIAAAAC/gojo-satoru-gojo.gif',
  'https://media.tenor.com/GLIZz0wBD4gAAAAC/sukuna-manga-manga-animation.gif',
  'https://i.pinimg.com/originals/d7/fd/6b/d7fd6b15109721cadac2e282abe80928.gif',
  'https://media.discordapp.net/attachments/1426373497411862609/1426373497675845824/416a6258674a32733e5a0d5eb98e2a06.gif?width=512&height=228&ex=6acadf56&is=6ac98dd6&hm=88cd6deea34bd5e58f60b885b7ea2fceb1a76302a3be6a7f0481f296ccc66306&',
  'https://media.discordapp.net/attachments/1388640751101149399/1550588397683212378/a_8f99691930d32be6beff0119641af521.gif?width=512&height=180&ex=6acb39ba&is=6ac9e83a&hm=b7db4c3f0e447ee723d4314d05c68c4f8feea46e8d6c2559d4256eae32c4b6c7&',
  'https://media.discordapp.net/attachments/1525511271552778260/1553753885485830355/a_5c96f91e2a5959b28381cce711a95e74.gif?ex=6acae051&is=6ac98ed1&hm=8123fc76ff3bd84502d10da88b7f0b3e9148326eecab799bcfbc141822473cb2&',
];

function isExpired(url) {
  const m = /[?&]ex=([0-9a-f]+)/i.exec(url);
  if (!m) return false;
  return parseInt(m[1], 16) * 1000 < Date.now();
}

let last = null;

/** A random, still-valid GIF link (never the same one twice in a row when possible). */
function randomGif() {
  const live = GIFS.filter(u => !isExpired(u));
  if (!live.length) return null;
  const pool = live.length > 1 ? live.filter(u => u !== last) : live;
  last = pool[Math.floor(Math.random() * pool.length)];
  return last;
}

module.exports = { GIFS, randomGif };
