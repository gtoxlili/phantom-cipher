//! Wire types — exact shape mirror of the original lib/types.ts.
//!
//! All structs derive Serialize/Deserialize so they can travel over
//! both MessagePack (the binary WebSocket transport we use for
//! state pushes) and JSON (the stats endpoint, where humans want
//! to read responses).
//!
//! Field naming uses serde's `rename_all = "camelCase"` so the
//! frontend gets `currentPlayerId` / `pendingDraw` / etc. exactly
//! the way the original Node implementation emitted them. The
//! browser code can keep its existing TS interfaces unchanged.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Color {
    Black,
    White,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Waiting,
    Drawing,
    Placing,
    Guessing,
    Continuing,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tile {
    pub id: String,
    pub number: Option<u8>,
    pub color: Color,
    pub revealed: bool,
    pub joker: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicTile {
    pub id: String,
    pub position: u8,
    pub color: Color,
    pub revealed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub joker: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicPlayer {
    pub id: String,
    pub name: String,
    pub tiles: Vec<PublicTile>,
    pub alive: bool,
    pub connected: bool,
    /// 该玩家断线后的 forfeit 截止时间（ms epoch）。在 `disconnect`
    /// 模块 schedule 时被服务端设上、cancel/leave 时清掉。前端拿
    /// 这个跟 Date.now() 减一下显示倒计时，给"队友看着对手 30 秒
    /// 出局"那一段一个具体进度感
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_forfeit_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: u64,
    pub text: String,
    pub ts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevealInfo {
    #[serde(rename = "tileId")]
    pub tile_id: String,
    #[serde(rename = "targetPlayerId")]
    pub target_player_id: String,
    #[serde(rename = "guesserId")]
    pub guesser_id: String,
    pub correct: bool,
    // 猜错时这三个字段一律为 None：joker 是真实属性，对其他玩家是机密；
    // color 虽然牌背面就能看出，但没必要在 wire 上重复；number 是猜测者
    // 自己输入的，命中时等于真实值，不命中时干脆不发，前端反正只用 correct
    // + tileId + guesserId 做命中/失手动画
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<Color>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub joker: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicGameState {
    pub code: String,
    pub phase: Phase,
    pub players: Vec<PublicPlayer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_player_id: Option<String>,
    pub host_id: String,
    pub deck_black_count: usize,
    pub deck_white_count: usize,
    pub log: Vec<LogEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub winner_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reveal: Option<RevealInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateState {
    pub my_id: String,
    pub my_hand: Vec<Tile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_tile_id: Option<String>,
}

/// On-disk shape — the canonical persistence format. Mirrors
/// GameSnapshot from lib/types.ts. The subscriber map and the
/// runtime `connected` flag are intentionally absent; both reset
/// on rehydrate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotPlayer {
    pub id: String,
    pub name: String,
    pub hand: Vec<Tile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_draw: Option<Tile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_position: Option<usize>,
    pub alive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSnapshot {
    pub code: String,
    pub host_id: String,
    pub players: Vec<SnapshotPlayer>,
    pub deck_black: Vec<Tile>,
    pub deck_white: Vec<Tile>,
    pub phase: Phase,
    pub current_idx: usize,
    pub log: Vec<LogEntry>,
    pub log_counter: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub winner_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reveal: Option<RevealInfo>,
    pub started_at: Option<i64>,
}

// ---- WebSocket envelope ----
//
// The browser opens one WebSocket per player. We push three event
// kinds (public state / private state / reveal) tagged by the
// `t` field so the client can dispatch by tag without inspecting
// the payload shape. Keeping the tag short (1 byte vs "type":
// 8 bytes) shaves a noticeable percentage off MessagePack frames
// at the rates we run.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "t", content = "d")]
pub enum ServerEvent {
    #[serde(rename = "p")]
    Public(PublicGameState),
    #[serde(rename = "v")]
    Private(PrivateState),
    #[serde(rename = "r")]
    Reveal(RevealInfo),
}

// ---- Action requests (REST / WebSocket inbound) ----
//
// Inbound mutations come over a separate POST endpoint per action,
// keeping mutation routing simple and cacheable-friendly. The body
// is JSON because the volume is low (one POST per turn) and human
// debuggability matters more than the few bytes saved by msgpack.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinRequest {
    pub player_id: String,
    pub name: String,
    pub as_host: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerIdOnly {
    pub player_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawRequest {
    pub player_id: String,
    pub color: Color,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuessRequest {
    pub player_id: String,
    pub target_player_id: String,
    pub tile_id: String,
    pub number: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaceJokerRequest {
    pub player_id: String,
    pub position: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContinueRequest {
    pub player_id: String,
    #[serde(rename = "continue")]
    pub cont: bool,
}
