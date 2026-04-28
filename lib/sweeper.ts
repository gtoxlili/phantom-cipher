/**
 * Idle-room sweeper.
 *
 * Closing a browser tab doesn't trigger a `leaveRoom` action — only a
 * `markDisconnected` call from the SSE close handler. In `waiting`
 * phase the player stays in the array; in any phase, the room stays
 * alive even if everyone walks away. After a server restart, those
 * rooms come back from disk and never clean themselves up. This
 * sweeper scans the `rooms` table on a fixed interval and evicts any
 * code whose `updated_at` is past a phase-aware TTL.
 *
 * "Don't sweep something that's actively held": if the in-memory Game
 * still has SSE subscribers, we leave it alone — those clients'
 * mutations will bump `updated_at` shortly anyway.
 */

import { deleteRoom, listStaleRoomCodes } from './db';
import { gameStore } from './game-store';

const WAITING_TTL_MS = 60 * 60 * 1_000;        // 1 hour: lobbies, scoreboards
const ACTIVE_TTL_MS = 6 * 60 * 60 * 1_000;     // 6 hours: actual in-flight games
const SWEEP_INTERVAL_MS = 5 * 60 * 1_000;      // every 5 minutes

declare global {
  // eslint-disable-next-line no-var
  var __phantom_cipher_sweeper__: NodeJS.Timeout | undefined;
}

function sweepOnce(): void {
  let codes: string[];
  try {
    codes = listStaleRoomCodes(Date.now(), WAITING_TTL_MS, ACTIVE_TTL_MS);
  } catch (err) {
    console.error('[sweeper] listStaleRoomCodes failed:', err);
    return;
  }
  if (codes.length === 0) return;

  let removed = 0;
  for (const code of codes) {
    const game = gameStore.get(code);
    // Someone is connected right now — let them keep playing. Their
    // next action will refresh updated_at and remove the row from the
    // stale set on the next pass.
    if (game && game.subscriberCount() > 0) continue;
    gameStore.delete(code);
    deleteRoom(code);
    removed++;
  }
  if (removed > 0) {
    console.log(`[sweeper] removed ${removed} idle room(s) (${codes.length - removed} skipped: still connected)`);
  }
}

/**
 * Idempotent: a globalThis flag prevents Next.js dev HMR from stacking
 * up duplicate intervals across module reloads. Sweeps once
 * immediately to clear anything left behind by a previous process.
 */
export function startSweeper(): void {
  if (globalThis.__phantom_cipher_sweeper__) return;
  sweepOnce();
  globalThis.__phantom_cipher_sweeper__ = setInterval(sweepOnce, SWEEP_INTERVAL_MS);
  // Don't keep the event loop alive just for this — if everything
  // else exits, the process should still shut down cleanly.
  globalThis.__phantom_cipher_sweeper__.unref?.();
}
