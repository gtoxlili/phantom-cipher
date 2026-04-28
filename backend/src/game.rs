//! Core rule engine — direct port of lib/game.ts.
//!
//! All phase transitions live here. Mutating callers (HTTP handlers
//! in routes/) hold an exclusive lock on the Room and call methods
//! on the Game; the Room then re-publishes the cached snapshot to
//! every subscriber. The class has no awareness of broadcasting;
//! it stays a pure state machine.

use crate::types::{
    Color, GameSnapshot, LogEntry, Phase, PrivateState, PublicGameState, PublicPlayer, PublicTile,
    RevealInfo, SnapshotPlayer, Tile,
};
use rand::RngExt;
use rand::seq::SliceRandom;
use thiserror::Error;

const NAME_MAX: usize = 16;
const LOG_CAP: usize = 80;
const PUBLIC_LOG_TAIL: usize = 30;

#[derive(Debug, Error)]
pub enum GameError {
    #[error("房间不存在")]
    RoomNotFound,
    #[error("对局已经开始")]
    AlreadyStarted,
    #[error("只有房主可以开始")]
    NotHostStart,
    #[error("只有房主可以重开")]
    NotHostReset,
    #[error("至少需要 2 位玩家")]
    NeedTwoPlayers,
    #[error("最多 4 位玩家")]
    TooManyPlayers,
    #[error("当前不能抽牌")]
    CannotDraw,
    #[error("不是你的回合")]
    NotYourTurn,
    #[error("你已经抽过了")]
    AlreadyDrew,
    #[error("{0}牌堆已空")]
    DeckEmpty(&'static str),
    #[error("当前不在放置阶段")]
    NotPlacing,
    #[error("没有待放置的赖子")]
    NoPendingJoker,
    #[error("位置无效")]
    InvalidPosition,
    #[error("当前不能猜测")]
    CannotGuess,
    #[error("不能猜自己")]
    CannotGuessSelf,
    #[error("目标玩家不存在")]
    TargetNotFound,
    #[error("该玩家已出局")]
    TargetEliminated,
    #[error("目标牌不存在")]
    TileNotFound,
    #[error("该牌已亮明")]
    AlreadyRevealed,
    #[error("数字超出范围")]
    NumberOutOfRange,
    #[error("当前没有可选动作")]
    NoActionAvailable,
    #[error("房间已存在，请改为加入")]
    RoomExists,
    #[error("对局已开始，无法加入")]
    GameInProgress,
    #[error("房间已满")]
    RoomFull,
    #[error("昵称已被占用")]
    NameTaken,
    #[error("请提供房间码、玩家与昵称")]
    MissingArgs,
}

pub type GameResult<T> = Result<T, GameError>;

#[derive(Debug, Clone)]
pub struct ServerPlayer {
    pub id: String,
    pub name: String,
    pub hand: Vec<Tile>,
    pub pending_draw: Option<Tile>,
    pub pending_position: Option<usize>,
    pub alive: bool,
    /// In-memory only: never persisted, never serialized into snapshots.
    pub connected: bool,
}

#[derive(Debug)]
pub struct Game {
    pub code: String,
    pub host_id: String,
    pub players: Vec<ServerPlayer>,
    pub deck_black: Vec<Tile>,
    pub deck_white: Vec<Tile>,
    pub phase: Phase,
    pub current_idx: usize,
    pub log: Vec<LogEntry>,
    pub log_counter: u64,
    pub winner_id: Option<String>,
    pub last_reveal: Option<RevealInfo>,
    pub started_at: Option<i64>,
}

fn cn(c: Color) -> &'static str {
    match c {
        Color::Black => "黑",
        Color::White => "白",
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn build_deck() -> Vec<Tile> {
    let mut d = Vec::with_capacity(26);
    for n in 0..=11u8 {
        d.push(Tile {
            id: format!("b{n}"),
            number: Some(n),
            color: Color::Black,
            revealed: false,
            joker: false,
        });
        d.push(Tile {
            id: format!("w{n}"),
            number: Some(n),
            color: Color::White,
            revealed: false,
            joker: false,
        });
    }
    d.push(Tile {
        id: "jb".into(),
        number: None,
        color: Color::Black,
        revealed: false,
        joker: true,
    });
    d.push(Tile {
        id: "jw".into(),
        number: None,
        color: Color::White,
        revealed: false,
        joker: true,
    });
    d
}

/// Sort order between two NUMBERED tiles. Jokers fall through to
/// the end if compared accidentally — same semantics as the TS
/// implementation.
fn compare_tiles(a: &Tile, b: &Tile) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    if a.joker || b.joker {
        return match (a.joker, b.joker) {
            (true, true) => {
                if a.color == Color::Black {
                    Ordering::Less
                } else {
                    Ordering::Greater
                }
            }
            (true, _) => Ordering::Greater,
            _ => Ordering::Less,
        };
    }
    let an = a.number.unwrap_or(0);
    let bn = b.number.unwrap_or(0);
    match an.cmp(&bn) {
        Ordering::Equal => {
            if a.color == Color::Black {
                Ordering::Less
            } else {
                Ordering::Greater
            }
        }
        other => other,
    }
}

impl Game {
    pub fn new(code: String, host_id: String) -> Self {
        Self {
            code,
            host_id,
            players: Vec::new(),
            deck_black: Vec::new(),
            deck_white: Vec::new(),
            phase: Phase::Waiting,
            current_idx: 0,
            log: Vec::new(),
            log_counter: 0,
            winner_id: None,
            last_reveal: None,
            started_at: None,
        }
    }

    pub fn add_player(&mut self, player_id: &str, raw_name: &str) -> &ServerPlayer {
        if let Some(idx) = self.players.iter().position(|p| p.id == player_id) {
            self.players[idx].connected = true;
            if matches!(self.phase, Phase::Waiting) {
                self.players[idx].alive = true;
            }
            return &self.players[idx];
        }
        let trimmed: String = raw_name.trim().chars().take(NAME_MAX).collect();
        let name = if trimmed.is_empty() {
            format!("玩家{}", self.players.len() + 1)
        } else {
            trimmed
        };
        let log_msg = format!("{name} 入局");
        let player = ServerPlayer {
            id: player_id.to_string(),
            name,
            hand: Vec::new(),
            pending_draw: None,
            pending_position: None,
            alive: true,
            connected: true,
        };
        self.players.push(player);
        self.add_log(log_msg);
        self.players.last().unwrap()
    }

    pub fn has_player_name(&self, name: &str) -> bool {
        let target = name.trim();
        self.players.iter().any(|p| p.name == target)
    }

    pub fn mark_disconnected(&mut self, player_id: &str) {
        if let Some(p) = self.players.iter_mut().find(|p| p.id == player_id) {
            p.connected = false;
        }
    }

    pub fn mark_connected(&mut self, player_id: &str) -> bool {
        if let Some(p) = self.players.iter_mut().find(|p| p.id == player_id) {
            let was = p.connected;
            p.connected = true;
            !was
        } else {
            false
        }
    }

    pub fn leave(&mut self, player_id: &str) {
        let Some(idx) = self.players.iter().position(|p| p.id == player_id) else {
            return;
        };
        if matches!(self.phase, Phase::Waiting) {
            let p = self.players.remove(idx);
            self.add_log(format!("{} 离场", p.name));
            if self.host_id == player_id && !self.players.is_empty() {
                self.host_id = self.players[0].id.clone();
            }
        } else if !matches!(self.phase, Phase::Ended) {
            let was_current = self
                .players
                .get(self.current_idx)
                .map(|p| p.id == player_id)
                .unwrap_or(false);
            let was_alive = self.players[idx].alive;
            self.players[idx].connected = false;
            self.players[idx].alive = false;
            if let Some(pd) = self.players[idx].pending_draw.take() {
                let mut pending = pd;
                pending.revealed = true;
                let insert_at = if pending.joker {
                    self.players[idx].hand.len()
                } else {
                    Self::find_sorted_index(&self.players[idx].hand, &pending)
                };
                self.players[idx].hand.insert(insert_at, pending);
                self.players[idx].pending_position = None;
            }
            let name = self.players[idx].name.clone();
            if was_alive {
                self.add_log(format!("{name} 离场，自动出局"));
            }
            self.check_end_or_advance(was_current);
        } else {
            self.players[idx].connected = false;
        }
    }

    pub fn start(&mut self, initiator: &str) -> GameResult<()> {
        if !matches!(self.phase, Phase::Waiting) {
            return Err(GameError::AlreadyStarted);
        }
        if initiator != self.host_id {
            return Err(GameError::NotHostStart);
        }
        if self.players.len() < 2 {
            return Err(GameError::NeedTwoPlayers);
        }
        if self.players.len() > 4 {
            return Err(GameError::TooManyPlayers);
        }

        let mut shuffled = build_deck();
        shuffled.shuffle(&mut rand::rng());
        let hand_size = if self.players.len() == 4 { 3 } else { 4 };

        for p in self.players.iter_mut() {
            p.hand.clear();
            p.alive = true;
            p.pending_draw = None;
            p.pending_position = None;
        }
        for i in 0..self.players.len() {
            for _ in 0..hand_size {
                if let Some(t) = shuffled.pop() {
                    self.players[i].hand.push(t);
                }
            }
            // Sort numbered tiles, then re-insert jokers at random
            // positions — initial joker placement is by chance, so
            // the slot doesn't leak info on round one.
            let (mut numbered, jokers): (Vec<_>, Vec<_>) =
                self.players[i].hand.drain(..).partition(|t| !t.joker);
            numbered.sort_by(compare_tiles);
            self.players[i].hand = numbered;
            let mut rng = rand::rng();
            for j in jokers {
                let pos = rng.random_range(0..=self.players[i].hand.len());
                self.players[i].hand.insert(pos, j);
            }
        }
        self.deck_black = shuffled
            .iter()
            .filter(|t| t.color == Color::Black)
            .cloned()
            .collect();
        self.deck_white = shuffled
            .iter()
            .filter(|t| t.color == Color::White)
            .cloned()
            .collect();
        self.deck_black.shuffle(&mut rand::rng());
        self.deck_white.shuffle(&mut rand::rng());

        self.current_idx = rand::rng().random_range(0..self.players.len());
        self.phase = Phase::Drawing;
        self.winner_id = None;
        self.last_reveal = None;
        self.started_at = Some(now_ms());
        let starter = self.players[self.current_idx].name.clone();
        self.add_log(format!("一局开始 — 由 {starter} 先手"));
        Ok(())
    }

    pub fn reset(&mut self, initiator: &str) -> GameResult<()> {
        if initiator != self.host_id {
            return Err(GameError::NotHostReset);
        }
        self.phase = Phase::Waiting;
        self.deck_black.clear();
        self.deck_white.clear();
        self.winner_id = None;
        self.last_reveal = None;
        self.started_at = None;
        for p in self.players.iter_mut() {
            p.hand.clear();
            p.alive = true;
            p.pending_draw = None;
            p.pending_position = None;
        }
        self.add_log("房主重置了对局".into());
        Ok(())
    }

    pub fn draw_tile(&mut self, player_id: &str, color: Color) -> GameResult<()> {
        if !matches!(self.phase, Phase::Drawing) {
            return Err(GameError::CannotDraw);
        }
        let cur_idx = self.current_idx;
        if self.players[cur_idx].id != player_id {
            return Err(GameError::NotYourTurn);
        }
        if self.players[cur_idx].pending_draw.is_some() {
            return Err(GameError::AlreadyDrew);
        }

        if self.deck_black.is_empty() && self.deck_white.is_empty() {
            self.phase = Phase::Guessing;
            let name = self.players[cur_idx].name.clone();
            self.add_log(format!("{name} —— 两堆牌均已空，直接猜测"));
            return Ok(());
        }

        let target = match color {
            Color::Black => &mut self.deck_black,
            Color::White => &mut self.deck_white,
        };
        if target.is_empty() {
            return Err(GameError::DeckEmpty(cn(color)));
        }
        let drawn = target.pop().unwrap();
        let is_joker = drawn.joker;
        let cur_name = self.players[cur_idx].name.clone();
        self.players[cur_idx].pending_draw = Some(drawn);

        if is_joker {
            self.players[cur_idx].pending_position = None;
            self.phase = Phase::Placing;
            self.add_log(format!("{cur_name} 抽到了赖子，待选位置"));
        } else {
            // Borrow split: take the pending out, compute position, put back.
            let pending = self.players[cur_idx]
                .pending_draw
                .as_ref()
                .unwrap()
                .clone();
            let idx = Self::find_sorted_index(&self.players[cur_idx].hand, &pending);
            self.players[cur_idx].pending_position = Some(idx);
            self.phase = Phase::Guessing;
            let label = cn(color);
            self.add_log(format!("{cur_name} 从{label}牌堆抽了一张"));
        }
        Ok(())
    }

    pub fn place_joker(&mut self, player_id: &str, position: usize) -> GameResult<()> {
        if !matches!(self.phase, Phase::Placing) {
            return Err(GameError::NotPlacing);
        }
        let cur_idx = self.current_idx;
        if self.players[cur_idx].id != player_id {
            return Err(GameError::NotYourTurn);
        }
        let cur = &mut self.players[cur_idx];
        let Some(pd) = &cur.pending_draw else {
            return Err(GameError::NoPendingJoker);
        };
        if !pd.joker {
            return Err(GameError::NoPendingJoker);
        }
        if position > cur.hand.len() {
            return Err(GameError::InvalidPosition);
        }
        cur.pending_position = Some(position);
        let cur_name = cur.name.clone();
        self.phase = Phase::Guessing;
        self.add_log(format!("{cur_name} 把赖子放在第 {} 位", position + 1));
        Ok(())
    }

    pub fn guess(
        &mut self,
        player_id: &str,
        target_player_id: &str,
        tile_id: &str,
        number: Option<u8>,
    ) -> GameResult<RevealInfo> {
        if !matches!(self.phase, Phase::Guessing | Phase::Continuing) {
            return Err(GameError::CannotGuess);
        }
        let cur_idx = self.current_idx;
        if self.players[cur_idx].id != player_id {
            return Err(GameError::NotYourTurn);
        }
        if target_player_id == player_id {
            return Err(GameError::CannotGuessSelf);
        }
        let target_idx = self
            .players
            .iter()
            .position(|p| p.id == target_player_id)
            .ok_or(GameError::TargetNotFound)?;
        if !self.players[target_idx].alive {
            return Err(GameError::TargetEliminated);
        }
        let tile_idx = self.players[target_idx]
            .hand
            .iter()
            .position(|t| t.id == tile_id)
            .ok_or(GameError::TileNotFound)?;
        if self.players[target_idx].hand[tile_idx].revealed {
            return Err(GameError::AlreadyRevealed);
        }
        if let Some(n) = number {
            if n > 11 {
                return Err(GameError::NumberOutOfRange);
            }
        }

        let tile_snapshot = self.players[target_idx].hand[tile_idx].clone();
        let correct = match number {
            None => tile_snapshot.joker,
            Some(n) => !tile_snapshot.joker && tile_snapshot.number == Some(n),
        };
        let reveal = RevealInfo {
            tile_id: tile_snapshot.id.clone(),
            target_player_id: target_player_id.to_string(),
            guesser_id: player_id.to_string(),
            correct,
            number,
            color: tile_snapshot.color,
            joker: tile_snapshot.joker,
        };
        self.last_reveal = Some(reveal.clone());

        let guess_label = match number {
            None => format!("{}-", cn(tile_snapshot.color)),
            Some(n) => format!("{}{}", cn(tile_snapshot.color), n),
        };
        let truth_label = if tile_snapshot.joker {
            format!("{}-", cn(tile_snapshot.color))
        } else {
            format!(
                "{}{}",
                cn(tile_snapshot.color),
                tile_snapshot.number.unwrap_or(0)
            )
        };
        let cur_name = self.players[cur_idx].name.clone();
        let target_name = self.players[target_idx].name.clone();

        if correct {
            self.players[target_idx].hand[tile_idx].revealed = true;
            self.add_log(format!(
                "{cur_name} 猜测 {target_name} 的 {guess_label} ✓︎ 命中"
            ));
            if self.players[target_idx].hand.iter().all(|t| t.revealed) {
                self.players[target_idx].alive = false;
                self.add_log(format!("{target_name} 全数翻明，出局"));
            }
            let alive_others = self
                .players
                .iter()
                .enumerate()
                .filter(|(i, p)| *i != cur_idx && p.alive)
                .count();
            if alive_others == 0 {
                self.phase = Phase::Ended;
                self.winner_id = Some(self.players[cur_idx].id.clone());
                let winner_name = self.players[cur_idx].name.clone();
                self.add_log(format!("{winner_name} 获得胜利！"));
                return Ok(reveal);
            }
            self.phase = Phase::Continuing;
        } else {
            self.add_log(format!(
                "{cur_name} 猜测 {target_name} 的 {guess_label} ✗︎ — 实为 {truth_label}"
            ));
            if let Some(mut pd) = self.players[cur_idx].pending_draw.take() {
                pd.revealed = true;
                let drawn_label = if pd.joker {
                    "赖子".to_string()
                } else {
                    format!("{}{}", cn(pd.color), pd.number.unwrap_or(0))
                };
                let pos = self.players[cur_idx]
                    .pending_position
                    .take()
                    .unwrap_or_else(|| self.players[cur_idx].hand.len());
                let pos = pos.min(self.players[cur_idx].hand.len());
                self.players[cur_idx].hand.insert(pos, pd);
                self.add_log(format!("{cur_name} 翻明了所抽 {drawn_label}"));
            }
            if self.players[cur_idx].hand.iter().all(|t| t.revealed) {
                self.players[cur_idx].alive = false;
                let cur_name2 = self.players[cur_idx].name.clone();
                self.add_log(format!("{cur_name2} 全数翻明，出局"));
            }
            self.advance_turn();
        }
        Ok(reveal)
    }

    pub fn decide_continue(&mut self, player_id: &str, cont: bool) -> GameResult<()> {
        if !matches!(self.phase, Phase::Continuing) {
            return Err(GameError::NoActionAvailable);
        }
        let cur_idx = self.current_idx;
        if self.players[cur_idx].id != player_id {
            return Err(GameError::NotYourTurn);
        }
        let cur_name = self.players[cur_idx].name.clone();
        if cont {
            self.phase = Phase::Guessing;
            self.add_log(format!("{cur_name} 继续猜测"));
        } else {
            if let Some(pd) = self.players[cur_idx].pending_draw.take() {
                let pos = self.players[cur_idx]
                    .pending_position
                    .take()
                    .unwrap_or_else(|| self.players[cur_idx].hand.len());
                let pos = pos.min(self.players[cur_idx].hand.len());
                self.players[cur_idx].hand.insert(pos, pd);
            }
            self.add_log(format!("{cur_name} 收手，结束回合"));
            self.advance_turn();
        }
        Ok(())
    }

    fn find_sorted_index(hand: &[Tile], tile: &Tile) -> usize {
        let mut i = 0;
        while i < hand.len() {
            if hand[i].joker {
                i += 1;
                continue;
            }
            if compare_tiles(&hand[i], tile) != std::cmp::Ordering::Less {
                break;
            }
            i += 1;
        }
        i
    }

    fn advance_turn(&mut self) {
        let alive = self.players.iter().filter(|p| p.alive).count();
        if alive <= 1 {
            self.phase = Phase::Ended;
            if let Some(w) = self.players.iter().find(|p| p.alive) {
                self.winner_id = Some(w.id.clone());
                let n = w.name.clone();
                self.add_log(format!("{n} 获得胜利！"));
            } else {
                self.add_log("对局结束".into());
            }
            return;
        }
        loop {
            self.current_idx = (self.current_idx + 1) % self.players.len();
            if self.players[self.current_idx].alive {
                break;
            }
        }
        self.phase = Phase::Drawing;
    }

    fn check_end_or_advance(&mut self, was_current: bool) {
        let alive = self.players.iter().filter(|p| p.alive).count();
        if alive <= 1 {
            self.phase = Phase::Ended;
            if let Some(w) = self.players.iter().find(|p| p.alive) {
                self.winner_id = Some(w.id.clone());
                let n = w.name.clone();
                self.add_log(format!("{n} 获得胜利！"));
            }
            return;
        }
        if was_current {
            loop {
                self.current_idx = (self.current_idx + 1) % self.players.len();
                if self.players[self.current_idx].alive {
                    break;
                }
            }
            self.phase = Phase::Drawing;
        }
    }

    fn add_log(&mut self, text: String) {
        self.log_counter += 1;
        self.log.push(LogEntry {
            id: self.log_counter,
            text,
            ts: now_ms(),
        });
        if self.log.len() > LOG_CAP {
            self.log.remove(0);
        }
    }

    pub fn subscriber_count_hint(&self) -> usize {
        self.players.iter().filter(|p| p.connected).count()
    }

    // ---------- Snapshots ----------

    pub fn to_snapshot(&self) -> GameSnapshot {
        GameSnapshot {
            code: self.code.clone(),
            host_id: self.host_id.clone(),
            players: self
                .players
                .iter()
                .map(|p| SnapshotPlayer {
                    id: p.id.clone(),
                    name: p.name.clone(),
                    hand: p.hand.clone(),
                    pending_draw: p.pending_draw.clone(),
                    pending_position: p.pending_position,
                    alive: p.alive,
                })
                .collect(),
            deck_black: self.deck_black.clone(),
            deck_white: self.deck_white.clone(),
            phase: self.phase,
            current_idx: self.current_idx,
            log: self.log.clone(),
            log_counter: self.log_counter,
            winner_id: self.winner_id.clone(),
            last_reveal: self.last_reveal.clone(),
            started_at: self.started_at,
        }
    }

    pub fn from_snapshot(snap: GameSnapshot) -> Self {
        Self {
            code: snap.code,
            host_id: snap.host_id,
            players: snap
                .players
                .into_iter()
                .map(|p| ServerPlayer {
                    id: p.id,
                    name: p.name,
                    hand: p.hand,
                    pending_draw: p.pending_draw,
                    pending_position: p.pending_position,
                    alive: p.alive,
                    connected: false,
                })
                .collect(),
            deck_black: snap.deck_black,
            deck_white: snap.deck_white,
            phase: snap.phase,
            current_idx: snap.current_idx,
            log: snap.log,
            log_counter: snap.log_counter,
            winner_id: snap.winner_id,
            last_reveal: snap.last_reveal,
            started_at: snap.started_at,
        }
    }

    pub fn to_public_state(&self) -> PublicGameState {
        PublicGameState {
            code: self.code.clone(),
            phase: self.phase,
            players: self.players.iter().map(|p| self.to_public_player(p)).collect(),
            current_player_id: self.players.get(self.current_idx).map(|p| p.id.clone()),
            host_id: self.host_id.clone(),
            deck_black_count: self.deck_black.len(),
            deck_white_count: self.deck_white.len(),
            log: self
                .log
                .iter()
                .rev()
                .take(PUBLIC_LOG_TAIL)
                .cloned()
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect(),
            winner_id: self.winner_id.clone(),
            last_reveal: self.last_reveal.clone(),
        }
    }

    fn to_public_player(&self, p: &ServerPlayer) -> PublicPlayer {
        struct Cell {
            tile: Tile,
            pending: bool,
        }
        let mut cells: Vec<Cell> = p
            .hand
            .iter()
            .map(|t| Cell {
                tile: t.clone(),
                pending: false,
            })
            .collect();
        // Only surface pending tile to opponents once its slot is decided.
        if let (Some(pd), Some(pos)) = (&p.pending_draw, p.pending_position) {
            let pos = pos.min(cells.len());
            cells.insert(
                pos,
                Cell {
                    tile: pd.clone(),
                    pending: true,
                },
            );
        }
        let tiles = cells
            .into_iter()
            .enumerate()
            .map(|(i, c)| PublicTile {
                id: c.tile.id,
                position: i as u8,
                color: c.tile.color,
                revealed: c.tile.revealed,
                number: if c.tile.revealed && !c.tile.joker {
                    c.tile.number
                } else {
                    None
                },
                joker: if c.tile.revealed && c.tile.joker {
                    Some(true)
                } else {
                    None
                },
                pending: if c.pending { Some(true) } else { None },
            })
            .collect();
        PublicPlayer {
            id: p.id.clone(),
            name: p.name.clone(),
            tiles,
            alive: p.alive,
            connected: p.connected,
        }
    }

    pub fn to_private_state(&self, player_id: &str) -> Option<PrivateState> {
        let me = self.players.iter().find(|p| p.id == player_id)?;
        let mut all = me.hand.clone();
        let mut pending_id = None;
        if let Some(pd) = &me.pending_draw {
            let pos = me.pending_position.unwrap_or(all.len());
            let pos = pos.min(all.len());
            all.insert(pos, pd.clone());
            pending_id = Some(pd.id.clone());
        }
        Some(PrivateState {
            my_id: me.id.clone(),
            my_hand: all,
            pending_tile_id: pending_id,
        })
    }
}
