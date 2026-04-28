import { Game } from './game';

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
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __davinci_game_store__: GameStore | undefined;
}

export const gameStore: GameStore =
  globalThis.__davinci_game_store__ ?? (globalThis.__davinci_game_store__ = new GameStore());

export const sanitizeCode = (raw: string): string => raw.trim().toUpperCase().slice(0, 6);
