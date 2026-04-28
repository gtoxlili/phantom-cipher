// Direct port of lib/codenames.ts.

export const CODENAMES = [
  'JOKER', 'SKULL', 'FOX', 'QUEEN', 'NOIR', 'CROW',
  'PANTHER', 'ORACLE', 'MONA', 'VIOLET',
  'ARSÈNE', 'GOEMON', 'ROBIN', 'ZORRO', 'MILADY', 'RAOUL', 'CARMEN',
  '怪盗A', '影武者', '夜行者', '密码师', '月光骑士',
  '黑桃Q', '紅蔷薇', '無名氏', '紳士A', '達·芬奇',
];

export function pickRandomCodename(excludeIndex = -1): { name: string; index: number } {
  let idx = Math.floor(Math.random() * CODENAMES.length);
  while (idx === excludeIndex && CODENAMES.length > 1) {
    idx = Math.floor(Math.random() * CODENAMES.length);
  }
  return { name: CODENAMES[idx], index: idx };
}
