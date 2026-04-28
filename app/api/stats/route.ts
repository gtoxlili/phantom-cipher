import type { NextRequest } from 'next/server';
import { leaderboard, recentMatches, totals } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public read-only stats endpoint. Three slices in one response so a
 * future stats page can render in a single fetch:
 *   - totals: site-wide counters (matches, players, in-flight rooms)
 *   - leaderboard: top players by wins
 *   - recent: most recent finished matches
 *
 * Query params:
 *   ?leaderboard=20  cap on leaderboard rows (1–100, default 20)
 *   ?recent=20       cap on recent matches (1–100, default 20)
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const lbLimit = clampInt(url.searchParams.get('leaderboard'), 1, 100, 20);
  const recentLimit = clampInt(url.searchParams.get('recent'), 1, 100, 20);

  return Response.json(
    {
      totals: totals(),
      leaderboard: leaderboard(lbLimit),
      recent: recentMatches(recentLimit),
    },
    {
      headers: {
        // Tiny TTL keeps a refresh-spam attacker from hammering the DB
        // while still feeling live (~one fresh read per leaderboard
        // page view per visitor).
        'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=30',
      },
    },
  );
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
