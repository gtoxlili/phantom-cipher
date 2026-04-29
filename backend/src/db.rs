//! SQLite 持久化层。
//!
//! - WAL + busy_timeout + synchronous=NORMAL：单写多读，足够本场景
//! - r2d2 池子 8 条连接：动作和统计能并行，互不阻塞
//! - 房间快照存 BLOB（msgpack）而不是 TEXT（JSON），列名照旧但
//!   payload 小 ~30%
//! - matches 表 UNIQUE(code, started_at) + INSERT ON CONFLICT DO
//!   NOTHING 让归档天然幂等，重复调不会脏数据

use crate::types::{GameSnapshot, LogEntry, Phase};
use anyhow::Result;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use std::path::Path;

fn phase_str(p: Phase) -> &'static str {
    match p {
        Phase::Waiting => "waiting",
        Phase::Drawing => "drawing",
        Phase::Placing => "placing",
        Phase::Guessing => "guessing",
        Phase::Continuing => "continuing",
        Phase::Ended => "ended",
    }
}

pub type DbPool = Pool<SqliteConnectionManager>;

const SCHEMA: &str = r#"
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    snapshot    BLOB NOT NULL,
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
    log           BLOB NOT NULL,
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
"#;

pub fn open(path: &str) -> Result<DbPool> {
    if path != ":memory:" {
        if let Some(parent) = Path::new(path).parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)?;
            }
        }
    }
    let manager = SqliteConnectionManager::file(path);
    let pool = Pool::builder()
        .max_size(8)
        .build(manager)?;
    {
        let conn = pool.get()?;
        conn.execute_batch(SCHEMA)?;
    }
    Ok(pool)
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Best-effort: errors are logged but not propagated to action handlers.
/// In-memory state remains authoritative even if disk is briefly unhappy.
pub fn persist_room(pool: &DbPool, snap: &GameSnapshot) {
    if let Err(e) = persist_room_inner(pool, snap) {
        tracing::error!(?e, "persist_room failed");
    }
}

fn persist_room_inner(pool: &DbPool, snap: &GameSnapshot) -> Result<()> {
    let bytes = rmp_serde::to_vec_named(snap)?;
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO rooms (code, snapshot, phase, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
            snapshot = excluded.snapshot,
            phase = excluded.phase,
            updated_at = excluded.updated_at",
        params![snap.code, bytes, phase_str(snap.phase), now_ms()],
    )?;
    Ok(())
}

pub fn delete_room(pool: &DbPool, code: &str) {
    let result = (|| -> Result<usize> {
        let conn = pool.get()?;
        let n = conn.execute("DELETE FROM rooms WHERE code = ?", params![code])?;
        Ok(n)
    })();
    if let Err(e) = result {
        tracing::error!(?e, code, "delete_room failed");
    }
}

pub fn load_all_room_snapshots(pool: &DbPool) -> Vec<GameSnapshot> {
    let Ok(conn) = pool.get() else {
        return Vec::new();
    };
    let Ok(mut stmt) = conn.prepare("SELECT snapshot FROM rooms") else {
        return Vec::new();
    };
    let rows = stmt
        .query_map([], |row| row.get::<_, Vec<u8>>(0))
        .map(|iter| iter.collect::<Vec<_>>())
        .unwrap_or_default();
    rows.into_iter()
        .filter_map(|row| match row {
            Ok(bytes) => match rmp_serde::from_slice::<GameSnapshot>(&bytes) {
                Ok(snap) => Some(snap),
                Err(e) => {
                    tracing::warn!(?e, "skipping malformed room snapshot");
                    None
                }
            },
            Err(_) => None,
        })
        .collect()
}

pub fn list_stale_room_codes(
    pool: &DbPool,
    now: i64,
    waiting_ttl_ms: i64,
    active_ttl_ms: i64,
) -> Vec<String> {
    let Ok(conn) = pool.get() else { return Vec::new(); };
    let Ok(mut stmt) = conn.prepare(
        "SELECT code FROM rooms
         WHERE (phase IN ('waiting','ended') AND updated_at < ?)
            OR (phase NOT IN ('waiting','ended') AND updated_at < ?)",
    ) else {
        return Vec::new();
    };
    stmt.query_map(
        params![now - waiting_ttl_ms, now - active_ttl_ms],
        |row| row.get::<_, String>(0),
    )
    .map(|iter| iter.filter_map(Result::ok).collect())
    .unwrap_or_default()
}

pub struct ArchiveParticipant {
    pub player_id: String,
    pub name: String,
    pub is_winner: bool,
    pub is_host: bool,
}

pub struct ArchiveInput {
    pub code: String,
    pub winner_id: Option<String>,
    pub winner_name: Option<String>,
    pub player_count: usize,
    pub started_at: i64,
    pub ended_at: i64,
    pub log: Vec<LogEntry>,
    pub participants: Vec<ArchiveParticipant>,
}

/// Idempotent: matches.UNIQUE(code, started_at) + DO NOTHING means
/// re-archival on rejoin or restart is a no-op.
pub fn archive_match(pool: &DbPool, input: ArchiveInput) {
    if let Err(e) = archive_match_inner(pool, input) {
        tracing::error!(?e, "archive_match failed");
    }
}

fn archive_match_inner(pool: &DbPool, input: ArchiveInput) -> Result<()> {
    let log_bytes = rmp_serde::to_vec_named(&input.log)?;
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let inserted_id: Option<i64> = tx
        .query_row(
            "INSERT INTO matches
                (code, winner_id, winner_name, player_count, started_at, ended_at, duration_ms, log)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(code, started_at) DO NOTHING
             RETURNING id",
            params![
                input.code,
                input.winner_id,
                input.winner_name,
                input.player_count as i64,
                input.started_at,
                input.ended_at,
                input.ended_at - input.started_at,
                log_bytes,
            ],
            |row| row.get(0),
        )
        .ok();
    let Some(match_id) = inserted_id else {
        tx.commit()?;
        return Ok(());
    };
    for p in &input.participants {
        tx.execute(
            "INSERT INTO match_players (match_id, player_id, name, is_winner, is_host)
             VALUES (?, ?, ?, ?, ?)",
            params![
                match_id,
                p.player_id,
                p.name,
                p.is_winner as i64,
                p.is_host as i64,
            ],
        )?;
        tx.execute(
            "INSERT INTO players (id, display_name, matches_played, matches_won, first_seen, last_seen)
             VALUES (?, ?, 1, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                display_name = excluded.display_name,
                matches_played = matches_played + 1,
                matches_won = matches_won + excluded.matches_won,
                last_seen = excluded.last_seen",
            params![
                p.player_id,
                p.name,
                p.is_winner as i64,
                input.ended_at,
                input.ended_at,
            ],
        )?;
    }
    tx.commit()?;
    Ok(())
}

// ---------- Stats read helpers ----------

#[derive(serde::Serialize)]
pub struct LeaderboardEntry {
    pub id: String,
    pub display_name: String,
    pub matches_played: i64,
    pub matches_won: i64,
    pub win_rate: f64,
}

#[derive(serde::Serialize)]
pub struct RecentMatch {
    pub id: i64,
    pub code: String,
    pub winner_name: Option<String>,
    pub player_count: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
}

#[derive(serde::Serialize)]
pub struct Totals {
    pub matches: i64,
    pub players: i64,
    pub in_flight: i64,
}

pub fn leaderboard(pool: &DbPool, limit: i64) -> Vec<LeaderboardEntry> {
    let Ok(conn) = pool.get() else { return Vec::new(); };
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, display_name, matches_played, matches_won,
                CAST(matches_won AS REAL) / matches_played AS win_rate
         FROM players
         WHERE matches_played > 0
         ORDER BY matches_won DESC, win_rate DESC, matches_played DESC
         LIMIT ?",
    ) else {
        return Vec::new();
    };
    stmt.query_map(params![limit], |row| {
        Ok(LeaderboardEntry {
            id: row.get(0)?,
            display_name: row.get(1)?,
            matches_played: row.get(2)?,
            matches_won: row.get(3)?,
            win_rate: row.get(4)?,
        })
    })
    .map(|iter| iter.filter_map(Result::ok).collect())
    .unwrap_or_default()
}

pub fn recent_matches(pool: &DbPool, limit: i64) -> Vec<RecentMatch> {
    let Ok(conn) = pool.get() else { return Vec::new(); };
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, code, winner_name, player_count, ended_at, duration_ms
         FROM matches
         ORDER BY ended_at DESC
         LIMIT ?",
    ) else {
        return Vec::new();
    };
    stmt.query_map(params![limit], |row| {
        Ok(RecentMatch {
            id: row.get(0)?,
            code: row.get(1)?,
            winner_name: row.get(2)?,
            player_count: row.get(3)?,
            ended_at: row.get(4)?,
            duration_ms: row.get(5)?,
        })
    })
    .map(|iter| iter.filter_map(Result::ok).collect())
    .unwrap_or_default()
}

/// 单玩家档案——给"老用户进 Home 页时预填上次的昵称"用，配合
/// inf-fingerprint 把"我是谁"传递性体现到客户端默认值。
#[derive(serde::Serialize)]
pub struct PlayerProfile {
    pub id: String,
    pub display_name: String,
    pub matches_played: i64,
    pub matches_won: i64,
    pub last_seen: i64,
}

pub fn player_by_id(pool: &DbPool, id: &str) -> Option<PlayerProfile> {
    let conn = pool.get().ok()?;
    conn.query_row(
        "SELECT id, display_name, matches_played, matches_won, last_seen
         FROM players WHERE id = ?",
        params![id],
        |row| {
            Ok(PlayerProfile {
                id: row.get(0)?,
                display_name: row.get(1)?,
                matches_played: row.get(2)?,
                matches_won: row.get(3)?,
                last_seen: row.get(4)?,
            })
        },
    )
    .ok()
}

pub fn totals(pool: &DbPool) -> Totals {
    let Ok(conn) = pool.get() else {
        return Totals {
            matches: 0,
            players: 0,
            in_flight: 0,
        };
    };
    let matches: i64 = conn
        .query_row("SELECT COUNT(*) FROM matches", [], |r| r.get(0))
        .unwrap_or(0);
    let players: i64 = conn
        .query_row("SELECT COUNT(*) FROM players", [], |r| r.get(0))
        .unwrap_or(0);
    let in_flight: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM rooms WHERE phase NOT IN ('waiting','ended')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Totals {
        matches,
        players,
        in_flight,
    }
}
