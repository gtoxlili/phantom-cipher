/**
 * Per-player AFK forfeit timers.
 *
 * SSE close on its own only flips `connected=false`; the player stays
 * in the `players` array with `alive=true`. If they happened to be
 * the current turn-holder, every subsequent draw/guess action would
 * throw because `cur.id !== playerId`, locking the round forever.
 *
 * On disconnect we schedule a forfeit via `leaveRoom` after a grace
 * window. A reconnecting client (the same playerId opens a new SSE
 * stream, e.g. on page refresh) cancels the timer before it fires.
 *
 * Singleton-on-globalThis so Next.js's dev HMR doesn't leak a fresh
 * Map per module reload.
 */

import { leaveRoom } from './actions';

const FORFEIT_DELAY_MS = 30 * 1_000;

declare global {
  // eslint-disable-next-line no-var
  var __phantom_disconnect_timers__: Map<string, NodeJS.Timeout> | undefined;
}

const timers: Map<string, NodeJS.Timeout> =
  globalThis.__phantom_disconnect_timers__ ??
  (globalThis.__phantom_disconnect_timers__ = new Map());

const key = (code: string, playerId: string) => `${code}:${playerId}`;

export function cancelForfeit(code: string, playerId: string): void {
  const k = key(code, playerId);
  const t = timers.get(k);
  if (!t) return;
  clearTimeout(t);
  timers.delete(k);
}

export function scheduleForfeit(code: string, playerId: string): void {
  const k = key(code, playerId);
  // Idempotent: replacing any existing timer keeps the window from
  // accumulating extra grace on rapid disconnect/reconnect bursts.
  cancelForfeit(code, playerId);
  const t = setTimeout(() => {
    timers.delete(k);
    void leaveRoom(code, playerId).catch((err) => {
      console.error('[disconnect-timers] leaveRoom failed:', err);
    });
  }, FORFEIT_DELAY_MS);
  // Don't keep the event loop alive just for a forfeit timer.
  t.unref?.();
  timers.set(k, t);
}
