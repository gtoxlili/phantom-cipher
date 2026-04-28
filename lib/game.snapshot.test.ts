/**
 * Round-trip invariants for Game.toSnapshot ↔ Game.fromSnapshot.
 *
 * The persistence layer (lib/db.ts) treats `toSnapshot()` as the
 * canonical serialization — anyone editing Game is one missed field
 * away from silent data loss across restarts. These tests freeze a
 * handful of states, rebuild from snapshot, and assert deep equality
 * of the resulting snapshot. Anything that survives toSnapshot must
 * survive a rebuild.
 */

import { describe, expect, it } from 'vitest';
import { Game } from './game';

function freshGame(playerCount = 3): Game {
  const g = new Game('TEST', 'host-id');
  g.addPlayer('host-id', 'HOST');
  for (let i = 1; i < playerCount; i++) g.addPlayer(`p${i}`, `P${i}`);
  return g;
}

function rebuild(game: Game): Game {
  return Game.fromSnapshot(game.toSnapshot());
}

describe('Game snapshot round-trip', () => {
  it('preserves a freshly-created waiting room', () => {
    const g = new Game('AB12', 'host-id');
    g.addPlayer('host-id', 'JOKER');
    expect(rebuild(g).toSnapshot()).toEqual(g.toSnapshot());
  });

  it('preserves a multi-player waiting room', () => {
    const g = freshGame(4);
    expect(rebuild(g).toSnapshot()).toEqual(g.toSnapshot());
  });

  it('preserves a started in-flight game (hands, decks, turn)', () => {
    const g = freshGame(3);
    g.start('host-id');
    expect(g.phase).not.toBe('waiting');
    expect(rebuild(g).toSnapshot()).toEqual(g.toSnapshot());
  });

  it('preserves the pending-draw state mid-turn', () => {
    const g = freshGame(2);
    g.start('host-id');
    const cur = g.players[g.currentIdx];
    // Pick a color with cards still in the pile (start-of-game both
    // piles are non-empty for any 2–4-player config).
    const color = g.deckBlack.length > 0 ? 'black' : 'white';
    g.drawTile(cur.id, color);
    expect(['guessing', 'placing']).toContain(g.phase);
    const snap = g.toSnapshot();
    const rebuilt = rebuild(g);
    expect(rebuilt.toSnapshot()).toEqual(snap);
    // The pending-draw must round-trip identically — that's the most
    // delicate piece of state, since it belongs to a player but isn't
    // part of their committed hand yet.
    expect(rebuilt.players[g.currentIdx].pendingDraw).toEqual(
      g.players[g.currentIdx].pendingDraw,
    );
  });

  it('preserves the joker placing state', () => {
    // Jokers are randomly slotted, so we may need a few attempts
    // before the active player draws one. Cap retries to keep the
    // test deterministic in time even though the deal is random.
    let g: Game | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = freshGame(2);
      candidate.start('host-id');
      const cur = candidate.players[candidate.currentIdx];
      // Drain whichever pile holds a joker first.
      const colors: ('black' | 'white')[] = ['black', 'white'];
      for (const color of colors) {
        const pile = color === 'black' ? candidate.deckBlack : candidate.deckWhite;
        if (pile.length === 0) continue;
        // Peek without mutating to see whether the top is a joker.
        const top = pile[pile.length - 1];
        if (!top.joker) continue;
        candidate.drawTile(cur.id, color);
        if (candidate.phase === 'placing') {
          g = candidate;
          break;
        }
      }
      if (g) break;
    }
    if (!g) {
      // Extremely unlikely (joker-on-top combinatorics for a single
      // turn), but skip rather than fail flakily.
      return;
    }
    expect(g.phase).toBe('placing');
    expect(rebuild(g).toSnapshot()).toEqual(g.toSnapshot());
  });

  it('preserves an ended game', () => {
    const g = freshGame(2);
    g.start('host-id');
    // Force the game to end by leaving everyone but one player.
    const survivors = g.players.slice();
    while (g.phase !== 'ended' && survivors.length > 1) {
      const victim = survivors.pop()!;
      g.leave(victim.id);
    }
    expect(g.phase).toBe('ended');
    expect(rebuild(g).toSnapshot()).toEqual(g.toSnapshot());
  });

  it('preserves logCounter so log ids stay monotonic across restarts', () => {
    const g = freshGame(3);
    g.start('host-id');
    const before = g.logCounter;
    expect(before).toBeGreaterThan(0);
    const rebuilt = rebuild(g);
    expect(rebuilt.logCounter).toBe(before);
    // A subsequent log entry on the rebuilt game continues the
    // sequence rather than restarting from 1 — protects against
    // duplicate keys in the React-rendered log panel.
    rebuilt.reset('host-id');
    const lastId = rebuilt.log[rebuilt.log.length - 1].id;
    expect(lastId).toBeGreaterThan(before);
  });

  it('rebuilt game accepts further mutations without divergence', () => {
    const g = freshGame(3);
    g.start('host-id');
    const rebuilt = rebuild(g);
    // Both should advance the same way given the same input.
    const cur = g.players[g.currentIdx];
    const color = g.deckBlack.length > 0 ? 'black' : 'white';
    g.drawTile(cur.id, color);
    rebuilt.drawTile(cur.id, color);
    expect(rebuilt.toSnapshot()).toEqual(g.toSnapshot());
  });

  it('strips the connected flag (rehydrate sees everyone offline)', () => {
    const g = freshGame(2);
    expect(g.players.every((p) => p.connected)).toBe(true);
    const rebuilt = rebuild(g);
    expect(rebuilt.players.every((p) => p.connected === false)).toBe(true);
  });
});
