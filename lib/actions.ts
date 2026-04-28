'use server';

import { tryit } from 'radash';
import { archiveMatch, persistRoom } from './db';
import { Game } from './game';
import { gameStore, sanitizeCode } from './game-store';

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });
const err = (error: string): ActionResult<never> => ({ ok: false, error });

const guard = (game: Game | undefined): ActionResult | null =>
  game ? null : err('房间不存在');

/**
 * Mirror the latest game state to the persistence layer. When phase is
 * 'ended', also archive the finished match — archiveMatch is idempotent
 * via UNIQUE(code, started_at), so multiple calls (a player rejoining
 * the post-game scoreboard, a restart, a leave) collapse to a single
 * matches row. The live snapshot stays in `rooms` until the host
 * resets or the room empties out.
 */
function persist(game: Game): void {
  if (game.phase === 'ended' && game.startedAt != null) {
    const winner = game.players.find((p) => p.id === game.winnerId);
    archiveMatch({
      code: game.code,
      winnerId: game.winnerId ?? null,
      winnerName: winner?.name ?? null,
      playerCount: game.players.length,
      startedAt: game.startedAt,
      endedAt: Date.now(),
      log: game.log,
      participants: game.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        isWinner: p.id === game.winnerId,
        isHost: p.id === game.hostId,
      })),
    });
  }
  persistRoom(game.toSnapshot());
}

const run = async (code: string, mutate: (game: Game) => void): Promise<ActionResult> => {
  const game = gameStore.get(sanitizeCode(code));
  const fail = guard(game);
  if (fail) return fail;
  const [error] = await tryit(async () => mutate(game!))();
  if (error) return err((error as Error).message);
  persist(game!);
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
    persist(game);
    game.notify();
    return ok();
  }

  if (game.players.some((p) => p.id === playerId)) {
    game.addPlayer(playerId, name);
    persist(game);
    game.notify();
    return ok();
  }

  if (asHost) return err('房间已存在，请改为加入');
  if (game.phase !== 'waiting') return err('对局已开始，无法加入');
  if (game.players.length >= 4) return err('房间已满');
  if (game.hasPlayerName(name)) return err('昵称已被占用');

  game.addPlayer(playerId, name);
  persist(game);
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
  // reset() clears startedAt, so the next end-of-game gets a fresh
  // (code, started_at) tuple and archives as a new match row.
  return run(code, (g) => g.reset(playerId));
}

export async function leaveRoom(code: string, playerId: string): Promise<ActionResult> {
  const c = sanitizeCode(code);
  const game = gameStore.get(c);
  if (!game) return ok();
  game.leave(playerId);
  // leave() can flip the game to 'ended' (last-alive-standing); cover
  // that case before we possibly drop the room.
  persist(game);
  game.notify();
  // gameStore.cleanup also deletes the persisted row when empty.
  gameStore.cleanup(c);
  return ok();
}
