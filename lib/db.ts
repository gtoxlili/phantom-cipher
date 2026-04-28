/**
 * node:sqlite-backed persistence layer.
 *
 * Two responsibilities, kept on disk so a restart doesn't wipe the
 * world:
 *   1. Active rooms — every Server-Action mutation snapshots the Game
 *      into `rooms`, so an in-flight game survives a deploy.
 *   2. Finished matches — when phase transitions to 'ended', the row
 *      moves out of `rooms` and into `matches` + `match_players` for
 *      stats / leaderboards.
 *
 * Synchronous on purpose. node:sqlite (stable in Node 22+, our images
 * ship Node 24) exposes a sync API; game mutations in lib/game.ts are
 * already synchronous; matching the call style avoids adding await
 * sprinkles that buy nothing on a single-process app.
 *
 * No native module: ships with the Node binary, so the distroless
 * runner image stays as-is.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameSnapshot, LogEntry } from './types';

const DB_PATH = process.env.DB_PATH ?? 'data/phantom.db';

function open(): DatabaseSync {
  if (DB_PATH !== ':memory:') {
    // SQLite creates the file but not its parent directory. mkdir is
    // idempotent with `recursive: true`, so cheap to call every boot.
    mkdirSync(dirname(DB_PATH), { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);

  // WAL allows readers to not block the single writer; busy_timeout
  // smooths over the brief contention window when SQLite is mid-flush.
  // synchronous=NORMAL trades a sliver of crash-durability (one fsync
  // per checkpoint, not per commit) for ~10x write throughput — plenty
  // safe for a game whose worst-case loss is "the last move replays".
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code        TEXT PRIMARY KEY,
      snapshot    TEXT NOT NULL,
      phase       TEXT NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_phase ON rooms(phase);

    CREATE TABLE IF NOT EXISTS matches (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT NOT NULL,
      winner_id     TEXT,
      winner_name   TEXT,
      player_count  INTEGER NOT NULL,
      started_at    INTEGER NOT NULL,
      ended_at      INTEGER NOT NULL,
      duration_ms   INTEGER NOT NULL,
      log           TEXT NOT NULL,
      -- Idempotency key for archival. After a crash-restart, the
      -- 'ended' room may still live in the rooms table — repeated
      -- archive attempts must not create duplicate match rows.
      UNIQUE (code, started_at)
    );
    CREATE INDEX IF NOT EXISTS idx_matches_ended_at ON matches(ended_at DESC);
    CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);

    CREATE TABLE IF NOT EXISTS match_players (
      match_id    INTEGER NOT NULL,
      player_id   TEXT NOT NULL,
      name        TEXT NOT NULL,
      is_winner   INTEGER NOT NULL,
      is_host     INTEGER NOT NULL,
      PRIMARY KEY (match_id, player_id),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_match_players_pid ON match_players(player_id);

    CREATE TABLE IF NOT EXISTS players (
      id              TEXT PRIMARY KEY,
      display_name    TEXT NOT NULL,
      matches_played  INTEGER NOT NULL DEFAULT 0,
      matches_won     INTEGER NOT NULL DEFAULT 0,
      first_seen      INTEGER NOT NULL,
      last_seen       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_players_won ON players(matches_won DESC);
  `);

  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var __phantom_cipher_db__: DatabaseSync | undefined;
}

/**
 * Lazy connection accessor. Opening the DB at module load broke the
 * production build under Turbopack — Next.js evaluates each route
 * module from multiple workers in parallel during "collect page
 * data", and parallel `PRAGMA journal_mode = WAL` writes against the
 * same file race onto SQLite's "database is locked" error. Deferring
 * to first use means the build evaluates routes without touching disk.
 */
function db(): DatabaseSync {
  if (globalThis.__phantom_cipher_db__) return globalThis.__phantom_cipher_db__;
  globalThis.__phantom_cipher_db__ = open();
  return globalThis.__phantom_cipher_db__;
}

// Lazy-prepared, per-connection statement cache. Re-using prepared
// statements across calls avoids the parse cost on the hot path
// (every game action triggers persistRoom).
interface Stmts {
  upsertRoom: ReturnType<DatabaseSync['prepare']>;
  deleteRoom: ReturnType<DatabaseSync['prepare']>;
  loadRooms: ReturnType<DatabaseSync['prepare']>;
  listStaleRooms: ReturnType<DatabaseSync['prepare']>;
  insertMatch: ReturnType<DatabaseSync['prepare']>;
  insertMatchPlayer: ReturnType<DatabaseSync['prepare']>;
  upsertPlayer: ReturnType<DatabaseSync['prepare']>;
  topPlayers: ReturnType<DatabaseSync['prepare']>;
  recentMatches: ReturnType<DatabaseSync['prepare']>;
  totals: ReturnType<DatabaseSync['prepare']>;
  begin: ReturnType<DatabaseSync['prepare']>;
  commit: ReturnType<DatabaseSync['prepare']>;
  rollback: ReturnType<DatabaseSync['prepare']>;
}

const stmtCache = new WeakMap<DatabaseSync, Stmts>();

function s(): Stmts {
  const conn = db();
  let stmts = stmtCache.get(conn);
  if (stmts) return stmts;
  stmts = {
    upsertRoom: conn.prepare(
      `INSERT INTO rooms (code, snapshot, phase, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         snapshot = excluded.snapshot,
         phase = excluded.phase,
         updated_at = excluded.updated_at`,
    ),
    deleteRoom: conn.prepare(`DELETE FROM rooms WHERE code = ?`),
    loadRooms: conn.prepare(`SELECT snapshot FROM rooms`),
    // Two TTL thresholds in one query: tighter for idle waiting/ended
    // rooms (tab-closed lobbies, post-game scoreboards), looser for
    // genuinely in-flight matches that might span a longer session.
    listStaleRooms: conn.prepare(
      `SELECT code FROM rooms
       WHERE (phase IN ('waiting','ended') AND updated_at < ?)
          OR (phase NOT IN ('waiting','ended') AND updated_at < ?)`,
    ),
    insertMatch: conn.prepare(
      `INSERT INTO matches
         (code, winner_id, winner_name, player_count, started_at, ended_at, duration_ms, log)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code, started_at) DO NOTHING
       RETURNING id`,
    ),
    insertMatchPlayer: conn.prepare(
      `INSERT INTO match_players (match_id, player_id, name, is_winner, is_host)
       VALUES (?, ?, ?, ?, ?)`,
    ),
    upsertPlayer: conn.prepare(
      `INSERT INTO players (id, display_name, matches_played, matches_won, first_seen, last_seen)
       VALUES (?, ?, 1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         matches_played = matches_played + 1,
         matches_won = matches_won + excluded.matches_won,
         last_seen = excluded.last_seen`,
    ),
    topPlayers: conn.prepare(
      `SELECT id, display_name, matches_played, matches_won,
              CAST(matches_won AS REAL) / matches_played AS win_rate
       FROM players
       WHERE matches_played > 0
       ORDER BY matches_won DESC, win_rate DESC, matches_played DESC
       LIMIT ?`,
    ),
    recentMatches: conn.prepare(
      `SELECT id, code, winner_name, player_count, ended_at, duration_ms
       FROM matches
       ORDER BY ended_at DESC
       LIMIT ?`,
    ),
    totals: conn.prepare(
      `SELECT
         (SELECT COUNT(*) FROM matches) AS matches,
         (SELECT COUNT(*) FROM players) AS players,
         (SELECT COUNT(*) FROM rooms WHERE phase NOT IN ('waiting','ended')) AS in_flight`,
    ),
    begin: conn.prepare('BEGIN'),
    commit: conn.prepare('COMMIT'),
    rollback: conn.prepare('ROLLBACK'),
  };
  stmtCache.set(conn, stmts);
  return stmts;
}

/** Snapshot a room's current state. Best-effort — failures are logged. */
export function persistRoom(snap: GameSnapshot): void {
  try {
    s().upsertRoom.run(snap.code, JSON.stringify(snap), snap.phase, Date.now());
  } catch (err) {
    console.error('[db] persistRoom failed:', err);
  }
}

export function deleteRoom(code: string): void {
  try {
    s().deleteRoom.run(code);
  } catch (err) {
    console.error('[db] deleteRoom failed:', err);
  }
}

/**
 * Codes of rooms whose persisted state hasn't changed in too long.
 * `waitingTtlMs` covers waiting + ended (cheap to evict — no game in
 * flight); `activeTtlMs` covers everything in between.
 */
export function listStaleRoomCodes(
  now: number,
  waitingTtlMs: number,
  activeTtlMs: number,
): string[] {
  try {
    const rows = s().listStaleRooms.all(
      now - waitingTtlMs,
      now - activeTtlMs,
    ) as unknown as { code: string }[];
    return rows.map((r) => r.code);
  } catch (err) {
    console.error('[db] listStaleRoomCodes failed:', err);
    return [];
  }
}

export function loadAllRoomSnapshots(): GameSnapshot[] {
  try {
    const rows = s().loadRooms.all() as unknown as { snapshot: string }[];
    const out: GameSnapshot[] = [];
    for (const row of rows) {
      try {
        out.push(JSON.parse(row.snapshot) as GameSnapshot);
      } catch (err) {
        console.error('[db] skipping malformed room snapshot:', err);
      }
    }
    return out;
  } catch (err) {
    console.error('[db] loadAllRoomSnapshots failed:', err);
    return [];
  }
}

export interface ArchiveParticipant {
  playerId: string;
  name: string;
  isWinner: boolean;
  isHost: boolean;
}

export interface ArchiveInput {
  code: string;
  winnerId: string | null;
  winnerName: string | null;
  playerCount: number;
  startedAt: number;
  endedAt: number;
  log: LogEntry[];
  participants: ArchiveParticipant[];
}

/**
 * Move a finished room into the historical tables and update player
 * profiles. Idempotent: the matches table has UNIQUE(code, started_at),
 * and the INSERT uses ON CONFLICT DO NOTHING — a duplicate call
 * returns 0 inserted rows, no participants are added, and no player
 * counters are bumped. Wrapped in a single transaction so a partial
 * archive can't leave the DB inconsistent.
 */
export function archiveMatch(input: ArchiveInput): void {
  const stmts = s();
  try {
    stmts.begin.run();
    const inserted = stmts.insertMatch.get(
      input.code,
      input.winnerId,
      input.winnerName,
      input.playerCount,
      input.startedAt,
      input.endedAt,
      input.endedAt - input.startedAt,
      JSON.stringify(input.log),
    ) as unknown as { id: number | bigint } | undefined;
    if (!inserted) {
      // Already archived in a previous process — nothing to do.
      stmts.commit.run();
      return;
    }
    const matchId = Number(inserted.id);
    for (const p of input.participants) {
      stmts.insertMatchPlayer.run(
        matchId,
        p.playerId,
        p.name,
        p.isWinner ? 1 : 0,
        p.isHost ? 1 : 0,
      );
      stmts.upsertPlayer.run(
        p.playerId,
        p.name,
        p.isWinner ? 1 : 0,
        input.endedAt,
        input.endedAt,
      );
    }
    stmts.commit.run();
  } catch (err) {
    try {
      s().rollback.run();
    } catch {
      /* best-effort */
    }
    console.error('[db] archiveMatch failed:', err);
  }
}

// ---------- read-only helpers for the stats endpoint ----------

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  matches_played: number;
  matches_won: number;
  win_rate: number;
}

export interface RecentMatch {
  id: number;
  code: string;
  winner_name: string | null;
  player_count: number;
  ended_at: number;
  duration_ms: number;
}

export interface Totals {
  matches: number;
  players: number;
  in_flight: number;
}

export function leaderboard(limit = 20): LeaderboardEntry[] {
  return s().topPlayers.all(limit) as unknown as LeaderboardEntry[];
}

export function recentMatches(limit = 20): RecentMatch[] {
  return s().recentMatches.all(limit) as unknown as RecentMatch[];
}

export function totals(): Totals {
  return s().totals.get() as unknown as Totals;
}
