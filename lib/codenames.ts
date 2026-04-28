import { random } from 'radash';

/**
 * P5-flavored codename pool used by the SHUFFLE button on the home
 * landing form and the in-room name prompt. Mixes Phantom Thieves
 * codenames, persona names, and 怪盗-themed Chinese aliases — all
 * under 16 chars to fit the server-side NAME_MAX cap.
 */
export const CODENAMES = [
  // Phantom Thieves codenames
  'JOKER', 'SKULL', 'FOX', 'QUEEN', 'NOIR', 'CROW',
  'PANTHER', 'ORACLE', 'MONA', 'VIOLET',
  // Personas & literary thieves
  'ARSÈNE', 'GOEMON', 'ROBIN', 'ZORRO', 'MILADY', 'RAOUL', 'CARMEN',
  // 怪盗 / Da Vinci flavor
  '怪盗A', '影武者', '夜行者', '密码师', '月光骑士',
  '黑桃Q', '紅蔷薇', '無名氏', '紳士A', '達·芬奇',
];

/**
 * Pick a random codename, optionally avoiding the previous index so
 * consecutive shuffles produce a different name. Returns both the
 * name and the picked index — caller is expected to hold the index
 * (e.g. via useRef) and pass it back next time.
 */
export function pickRandomCodename(excludeIndex = -1): { name: string; index: number } {
  let idx = random(0, CODENAMES.length - 1);
  while (idx === excludeIndex && CODENAMES.length > 1) {
    idx = random(0, CODENAMES.length - 1);
  }
  return { name: CODENAMES[idx], index: idx };
}
