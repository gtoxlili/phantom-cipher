export type Color = 'black' | 'white';

export interface Tile {
  id: string;
  number: number;
  color: Color;
  revealed: boolean;
}

export interface PublicTile {
  id: string;
  position: number;
  color: Color;
  revealed: boolean;
  number?: number;
  pending?: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  tiles: PublicTile[];
  alive: boolean;
  connected: boolean;
}

export type Phase = 'waiting' | 'drawing' | 'guessing' | 'continuing' | 'ended';

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
  number: number;
  color: Color;
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
