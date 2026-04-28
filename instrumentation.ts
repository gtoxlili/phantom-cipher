/**
 * Next.js calls register() once per server process at startup.
 * The Node-only branch is the only one that owns long-lived state
 * (game store, SQLite connection); the Edge runtime can't open a
 * SQLite file or hold setInterval handles, so we keep the sweeper
 * gated to nodejs explicitly.
 *
 * Dynamic import — instrumentation runs ahead of route compilation
 * in some Next.js phases, and a static import would drag the SQLite
 * stack into the Edge bundle.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSweeper } = await import('./lib/sweeper');
    startSweeper();
  }
}
