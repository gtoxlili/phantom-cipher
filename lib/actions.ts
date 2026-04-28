'use server';

import { tryit } from 'radash';
import { Game } from './game';
import { gameStore, sanitizeCode } from './game-store';

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });
const err = (error: string): ActionResult<never> => ({ ok: false, error });

const guard = (game: Game | undefined): ActionResult | null =>
  game ? null : err('房间不存在');

const run = async (code: string, mutate: (game: Game) => void): Promise<ActionResult> => {
  const game = gameStore.get(sanitizeCode(code));
  const fail = guard(game);
  if (fail) return fail;
  const [error] = await tryit(async () => mutate(game!))();
  if (error) return err((error as Error).message);
  game!.notify();
  return ok();
};

/** Either creates the room and joins, or rejoins an existing one with this playerId. */
export async function joinOrCreateRoom(
  rawCode: string,
  playerId: string,
  name: string,
  asHost: boolean,
): Promise<ActionResult> {
  if (!rawCode || !playerId || !name) return err('请提供房间码、玩家与昵称');
  const code = sanitizeCode(rawCode);

  let game = gameStore.get(code);
  if (!game) {
    game = new Game(code, playerId);
    gameStore.set(code, game);
    game.addPlayer(playerId, name);
    game.notify();
    return ok();
  }

  if (game.players.some((p) => p.id === playerId)) {
    game.addPlayer(playerId, name);
    game.notify();
    return ok();
  }

  if (asHost) return err('房间已存在，请改为加入');
  if (game.phase !== 'waiting') return err('对局已开始，无法加入');
  if (game.players.length >= 4) return err('房间已满');
  if (game.hasPlayerName(name)) return err('昵称已被占用');

  game.addPlayer(playerId, name);
  game.notify();
  return ok();
}

export async function startGame(code: string, playerId: string): Promise<ActionResult> {
  return run(code, (g) => g.start(playerId));
}

export async function drawTile(
  code: string,
  playerId: string,
  color: 'black' | 'white',
): Promise<ActionResult> {
  return run(code, (g) => g.drawTile(playerId, color));
}

export async function guessTile(
  code: string,
  playerId: string,
  targetPlayerId: string,
  tileId: string,
  /** null = guessing the joker ("-"). */
  number: number | null,
): Promise<ActionResult> {
  return run(code, (g) => { g.guess(playerId, targetPlayerId, tileId, number); });
}

export async function placeJoker(
  code: string,
  playerId: string,
  position: number,
): Promise<ActionResult> {
  return run(code, (g) => g.placeJoker(playerId, position));
}

export async function decideContinue(
  code: string,
  playerId: string,
  cont: boolean,
): Promise<ActionResult> {
  return run(code, (g) => g.decideContinue(playerId, cont));
}

export async function resetGame(code: string, playerId: string): Promise<ActionResult> {
  return run(code, (g) => g.reset(playerId));
}

export async function leaveRoom(code: string, playerId: string): Promise<ActionResult> {
  const c = sanitizeCode(code);
  const game = gameStore.get(c);
  if (!game) return ok();
  game.leave(playerId);
  game.notify();
  gameStore.cleanup(c);
  return ok();
}
