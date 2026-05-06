const CODENAMES = [
  'JOKER', 'SKULL', 'FOX', 'QUEEN', 'NOIR', 'CROW',
  'PANTHER', 'ORACLE', 'MONA', 'VIOLET',
  'ARSÈNE', 'GOEMON', 'ROBIN', 'ZORRO', 'MILADY', 'RAOUL', 'CARMEN',
  '怪盗A', '影武者', '夜行者', '密码师', '月光骑士',
  '黑桃Q', '紅蔷薇', '無名氏', '紳士A', '達·芬奇',
];

function pickRandomCodename(excludeIndex) {
  const ex = typeof excludeIndex === 'number' ? excludeIndex : -1;
  let idx = Math.floor(Math.random() * CODENAMES.length);
  while (idx === ex && CODENAMES.length > 1) {
    idx = Math.floor(Math.random() * CODENAMES.length);
  }
  return { name: CODENAMES[idx], index: idx };
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

module.exports = { CODENAMES, pickRandomCodename, genRoomCode };
