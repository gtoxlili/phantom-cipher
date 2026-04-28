import { Game } from './game';
import { deleteRoom, loadAllRoomSnapshots } from './db';

class GameStore {
  private games = new Map<string, Game>();

  has(code: string): boolean {
    return this.games.has(code);
  }
  get(code: string): Game | undefined {
    return this.games.get(code);
  }
  set(code: string, game: Game): void {
    this.games.set(code, game);
  }
  delete(code: string): void {
    this.games.delete(code);
  }
  size(): number {
    return this.games.size;
  }

  /** Drop empty rooms (no players) — call after each leave. */
  cleanup(code: string): void {
    const g = this.games.get(code);
    if (!g) return;
    if (g.players.length === 0 && g.subscriberCount() === 0) {
      this.games.delete(code);
      // Empty room → no one will ever rejoin via the same code, so
      // drop the persisted snapshot too. Otherwise restarts would
      // resurrect ghost rooms forever.
      deleteRoom(code);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __davinci_game_store__: GameStore | undefined;
}

/**
 * On first construction, pull every persisted room back into memory.
 * Connections from SSE clients reattach lazily — until then the games
 * just sit there with `connected: false` players. The pending `notify()`
 * fires the first time someone rejoins.
 */
function buildStore(): GameStore {
  const store = new GameStore();
  for (const snap of loadAllRoomSnapshots()) {
    try {
      store.set(snap.code, Game.fromSnapshot(snap));
    } catch (err) {
      console.error(`[gameStore] skipping room ${snap.code} — invalid snapshot:`, err);
      deleteRoom(snap.code);
    }
  }
  return store;
}

export const gameStore: GameStore =
  globalThis.__davinci_game_store__ ?? (globalThis.__davinci_game_store__ = buildStore());

export const sanitizeCode = (raw: string): string => raw.trim().toUpperCase().slice(0, 6);
