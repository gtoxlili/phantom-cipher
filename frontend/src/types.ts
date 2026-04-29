// Wire types — must match backend/src/types.rs exactly. The Rust
// side serializes with serde + rmp-serde using `rename_all =
// "camelCase"`, so the TS shapes here can stay idiomatic.

export type Color = 'black' | 'white';

export interface Tile {
  id: string;
  number: number | null;
  color: Color;
  revealed: boolean;
  joker: boolean;
}

export interface PublicTile {
  id: string;
  position: number;
  color: Color;
  revealed: boolean;
  number?: number;
  joker?: boolean;
  pending?: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  tiles: PublicTile[];
  alive: boolean;
  connected: boolean;
  /** 玩家断线后的 forfeit 截止时间（ms epoch）。前端用来显示
   *  "X 秒后自动出局"倒计时；undefined 表示没有挂起的 forfeit。 */
  pendingForfeitAt?: number;
}

export type Phase =
  | 'waiting'
  | 'drawing'
  | 'placing'
  | 'guessing'
  | 'continuing'
  | 'ended';

export interface LogEntry {
  id: number;
  text: string;
  ts: number;
}

export interface RevealInfo {
  tileId: string;
  targetPlayerId: string;
  guesserId: string;
  correct: boolean;
  number: number | null;
  color: Color;
  joker: boolean;
}

export interface PublicGameState {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  currentPlayerId?: string;
  hostId: string;
  deckBlackCount: number;
  deckWhiteCount: number;
  log: LogEntry[];
  winnerId?: string;
  lastReveal?: RevealInfo;
}

export interface PrivateState {
  myId: string;
  myHand: Tile[];
  pendingTileId?: string;
}

// Tagged union from the backend's `ServerEvent`. The compact
// {t, d} shape mirrors what rmp-serde emits with
// #[serde(tag = "t", content = "d")].
export type ServerEvent =
  | { t: 'p'; d: PublicGameState }
  | { t: 'v'; d: PrivateState }
  | { t: 'r'; d: RevealInfo };
