export type Color = 'black' | 'white';

export interface Tile {
  id: string;
  /** null when this is a joker ("-" tile). */
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
  /** Only present once revealed AND not a joker. */
  number?: number;
  /** Only present once revealed and the tile IS a joker. */
  joker?: boolean;
  pending?: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  tiles: PublicTile[];
  alive: boolean;
  connected: boolean;
}

export type Phase = 'waiting' | 'drawing' | 'placing' | 'guessing' | 'continuing' | 'ended';

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
  /** null when the guess (or the revealed tile) is a joker. */
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

/**
 * On-disk shape of a Game. Strict subset of the Game class state — the
 * subscriber map is intentionally NOT part of this; subscriptions
 * reattach when SSE clients reconnect after a restart.
 */
export interface SnapshotPlayer {
  id: string;
  name: string;
  hand: Tile[];
  pendingDraw?: Tile;
  pendingPosition?: number;
  alive: boolean;
}

export interface GameSnapshot {
  code: string;
  hostId: string;
  players: SnapshotPlayer[];
  deckBlack: Tile[];
  deckWhite: Tile[];
  phase: Phase;
  currentIdx: number;
  log: LogEntry[];
  logCounter: number;
  winnerId?: string;
  lastReveal?: RevealInfo;
  /** ms epoch when phase first transitioned out of 'waiting'. */
  startedAt: number | null;
}

export type AckOk = { ok: true };
export type AckErr = { error: string };
export type Ack = AckOk | AckErr;

export interface ClientToServerEvents {
  createRoom: (data: { code: string; name: string }, ack: (res: Ack) => void) => void;
  joinRoom: (data: { code: string; name: string }, ack: (res: Ack) => void) => void;
  startGame: (ack: (res: Ack) => void) => void;
  drawTile: (ack: (res: Ack) => void) => void;
  guessTile: (
    data: { targetPlayerId: string; tileId: string; number: number },
    ack: (res: { correct: boolean } | AckErr) => void
  ) => void;
  decideContinue: (data: { continue: boolean }, ack: (res: Ack) => void) => void;
  resetGame: (ack: (res: Ack) => void) => void;
}

export interface ServerToClientEvents {
  state: (state: PublicGameState) => void;
  privateState: (state: PrivateState) => void;
  reveal: (data: RevealInfo) => void;
  notice: (msg: string) => void;
}
