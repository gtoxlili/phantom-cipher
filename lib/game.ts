import { list, shuffle as randomize } from 'radash';
import type {
  Color,
  LogEntry,
  Phase,
  PrivateState,
  PublicGameState,
  PublicPlayer,
  PublicTile,
  RevealInfo,
  Tile,
} from './types';

interface ServerPlayer {
  id: string;
  name: string;
  hand: Tile[];
  pendingDraw?: Tile;
  /**
   * Insertion index for `pendingDraw` once committed.
   * - For a numbered tile: set immediately on draw via sorted insert.
   * - For a joker: undefined while in `placing` phase, set once the
   *   player picks a slot via placeJoker().
   */
  pendingPosition?: number;
  alive: boolean;
  connected: boolean;
}

export type GameEvent =
  | { type: 'public'; data: PublicGameState }
  | { type: 'private'; data: PrivateState }
  | { type: 'reveal'; data: RevealInfo };

export type Subscriber = (event: GameEvent) => void;

const NAME_MAX = 16;

/** Sort order between two NUMBERED tiles. Jokers are excluded from this. */
const compareTiles = (a: Tile, b: Tile): number => {
  if (a.joker || b.joker) {
    // Jokers fall through to the end if compared accidentally.
    if (a.joker && b.joker) return a.color === 'black' ? -1 : 1;
    return a.joker ? 1 : -1;
  }
  const an = a.number ?? 0;
  const bn = b.number ?? 0;
  if (an !== bn) return an - bn;
  return a.color === 'black' ? -1 : 1;
};

const buildDeck = (): Tile[] => [
  ...list(0, 11).flatMap<Tile>((n) => [
    { id: `b${n}`, number: n, color: 'black', revealed: false, joker: false },
    { id: `w${n}`, number: n, color: 'white', revealed: false, joker: false },
  ]),
  // Two jokers, one per color — represented as "-" in the UI.
  { id: 'jb', number: null, color: 'black', revealed: false, joker: true },
  { id: 'jw', number: null, color: 'white', revealed: false, joker: true },
];

const cn = (c: Color) => (c === 'black' ? '黑' : '白');

export class Game {
  code: string;
  hostId: string;
  players: ServerPlayer[] = [];
  /** Two face-down draw piles, one per color — the canonical Da Vinci Code shape. */
  deckBlack: Tile[] = [];
  deckWhite: Tile[] = [];
  phase: Phase = 'waiting';
  currentIdx = 0;
  log: LogEntry[] = [];
  winnerId?: string;
  lastReveal?: RevealInfo;

  private logCounter = 0;
  private subscribers = new Map<string, Subscriber>();

  constructor(code: string, hostId: string) {
    this.code = code;
    this.hostId = hostId;
  }

  // ---------- subscriber API ----------
  subscribe(playerId: string, cb: Subscriber): () => void {
    this.subscribers.set(playerId, cb);
    cb({ type: 'public', data: this.toPublicState() });
    const priv = this.toPrivateState(playerId);
    if (priv) cb({ type: 'private', data: priv });
    return () => {
      this.subscribers.delete(playerId);
    };
  }

  notify(): void {
    const pub = this.toPublicState();
    for (const [pid, cb] of this.subscribers) {
      cb({ type: 'public', data: pub });
      const priv = this.toPrivateState(pid);
      if (priv) cb({ type: 'private', data: priv });
    }
  }

  private emitReveal(reveal: RevealInfo): void {
    for (const [, cb] of this.subscribers) {
      cb({ type: 'reveal', data: reveal });
    }
  }

  hasSubscriber(playerId: string): boolean {
    return this.subscribers.has(playerId);
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }

  // ---------- player management ----------
  addPlayer(playerId: string, rawName: unknown): ServerPlayer {
    const existing = this.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      if (this.phase === 'waiting') existing.alive = true;
      return existing;
    }
    // Defensive: storage round-trips have produced non-strings here in
    // the past (e.g. JSON.parse('1') → number). Coerce before .trim().
    const safe = typeof rawName === 'string' ? rawName : String(rawName ?? '');
    const name = safe.trim().slice(0, NAME_MAX) || `玩家${this.players.length + 1}`;
    const player: ServerPlayer = {
      id: playerId,
      name,
      hand: [],
      alive: true,
      connected: true,
    };
    this.players.push(player);
    this.addLog(`${name} 入局`);
    return player;
  }

  hasPlayerName(name: string): boolean {
    return this.players.some((p) => p.name === name.trim());
  }

  markDisconnected(playerId: string): void {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return;
    p.connected = false;
  }

  leave(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    const player = this.players[idx];
    if (this.phase === 'waiting') {
      this.players.splice(idx, 1);
      this.addLog(`${player.name} 离场`);
      if (this.hostId === playerId && this.players.length > 0) {
        this.hostId = this.players[0].id;
      }
    } else if (this.phase !== 'ended') {
      player.connected = false;
      const wasCurrent = this.players[this.currentIdx]?.id === playerId;
      const wasAlive = player.alive;
      player.alive = false;
      if (player.pendingDraw) {
        player.pendingDraw.revealed = true;
        this.insertSorted(player.hand, player.pendingDraw);
        player.pendingDraw = undefined;
      }
      if (wasAlive) this.addLog(`${player.name} 离场，自动出局`);
      this.checkEndOrAdvance(wasCurrent);
    } else {
      player.connected = false;
    }
  }

  // ---------- game flow ----------
  start(initiatorId: string): void {
    if (this.phase !== 'waiting') throw new Error('对局已经开始');
    if (initiatorId !== this.hostId) throw new Error('只有房主可以开始');
    if (this.players.length < 2) throw new Error('至少需要 2 位玩家');
    if (this.players.length > 4) throw new Error('最多 4 位玩家');

    // Shuffle all 24 tiles together to deal random hands, then split the
    // remainder into the two color piles for the rest of the game.
    const shuffled = randomize(buildDeck());
    const handSize = this.players.length === 4 ? 3 : 4;

    for (const p of this.players) {
      p.hand = [];
      p.alive = true;
      p.pendingDraw = undefined;
    }
    for (const p of this.players) {
      for (let i = 0; i < handSize; i++) p.hand.push(shuffled.pop()!);
      // Sort numbered tiles by the canonical order, then drop any jokers
      // back in at random positions — initial joker placement is by chance,
      // so the position itself doesn't leak info to opponents on round one.
      const numbered = p.hand.filter((t) => !t.joker).sort(compareTiles);
      const jokers = p.hand.filter((t) => t.joker);
      p.hand = numbered;
      for (const j of jokers) {
        const pos = Math.floor(Math.random() * (p.hand.length + 1));
        p.hand.splice(pos, 0, j);
      }
    }

    this.deckBlack = randomize(shuffled.filter((t) => t.color === 'black'));
    this.deckWhite = randomize(shuffled.filter((t) => t.color === 'white'));
    this.currentIdx = Math.floor(Math.random() * this.players.length);
    this.phase = 'drawing';
    this.winnerId = undefined;
    this.lastReveal = undefined;
    this.addLog(`一局开始 — 由 ${this.players[this.currentIdx].name} 先手`);
  }

  reset(initiatorId: string): void {
    if (initiatorId !== this.hostId) throw new Error('只有房主可以重开');
    this.phase = 'waiting';
    this.deckBlack = [];
    this.deckWhite = [];
    this.winnerId = undefined;
    this.lastReveal = undefined;
    for (const p of this.players) {
      p.hand = [];
      p.alive = true;
      p.pendingDraw = undefined;
    }
    this.addLog('房主重置了对局');
  }

  drawTile(playerId: string, color: Color): void {
    if (this.phase !== 'drawing') throw new Error('当前不能抽牌');
    const cur = this.currentPlayer();
    if (cur.id !== playerId) throw new Error('不是你的回合');
    if (cur.pendingDraw) throw new Error('你已经抽过了');

    // Both piles empty → skip the draw and go straight to guessing.
    if (this.deckBlack.length === 0 && this.deckWhite.length === 0) {
      this.phase = 'guessing';
      this.addLog(`${cur.name} —— 两堆牌均已空，直接猜测`);
      return;
    }

    const targetDeck = color === 'black' ? this.deckBlack : this.deckWhite;
    if (targetDeck.length === 0) throw new Error(`${cn(color)}牌堆已空`);

    const drawn = targetDeck.pop()!;
    cur.pendingDraw = drawn;

    if (drawn.joker) {
      // Joker — player must choose where to slot it. UI surfaces a
      // placement sheet while phase === 'placing'.
      cur.pendingPosition = undefined;
      this.phase = 'placing';
      this.addLog(`${cur.name} 抽到了赖子，待选位置`);
    } else {
      // Numbered — slot it at the canonical sorted position immediately,
      // skipping over any existing jokers the owner has anchored.
      cur.pendingPosition = this.findSortedIndex(cur.hand, drawn);
      this.phase = 'guessing';
      this.addLog(`${cur.name} 从${cn(color)}牌堆抽了一张`);
    }
  }

  placeJoker(playerId: string, position: number): void {
    if (this.phase !== 'placing') throw new Error('当前不在放置阶段');
    const cur = this.currentPlayer();
    if (cur.id !== playerId) throw new Error('不是你的回合');
    if (!cur.pendingDraw || !cur.pendingDraw.joker) {
      throw new Error('没有待放置的赖子');
    }
    if (!Number.isInteger(position) || position < 0 || position > cur.hand.length) {
      throw new Error('位置无效');
    }
    cur.pendingPosition = position;
    this.phase = 'guessing';
    this.addLog(`${cur.name} 把赖子放在第 ${position + 1} 位`);
  }

  guess(
    playerId: string,
    targetPlayerId: string,
    tileId: string,
    /** null = the player is calling "-" (joker). */
    number: number | null
  ): { correct: boolean; reveal: RevealInfo } {
    if (this.phase !== 'guessing' && this.phase !== 'continuing') {
      throw new Error('当前不能猜测');
    }
    const cur = this.currentPlayer();
    if (cur.id !== playerId) throw new Error('不是你的回合');
    if (targetPlayerId === playerId) throw new Error('不能猜自己');
    const target = this.players.find((p) => p.id === targetPlayerId);
    if (!target) throw new Error('目标玩家不存在');
    if (!target.alive) throw new Error('该玩家已出局');
    const tile = target.hand.find((t) => t.id === tileId);
    if (!tile) throw new Error('目标牌不存在');
    if (tile.revealed) throw new Error('该牌已亮明');
    if (number !== null && (!Number.isInteger(number) || number < 0 || number > 11)) {
      throw new Error('数字超出范围');
    }

    const correct = number === null ? tile.joker : !tile.joker && tile.number === number;
    const reveal: RevealInfo = {
      tileId,
      targetPlayerId,
      guesserId: playerId,
      correct,
      number,
      color: tile.color,
      joker: tile.joker,
    };
    this.lastReveal = reveal;
    this.emitReveal(reveal);

    const guessLabel = number === null ? `${cn(tile.color)}-` : `${cn(tile.color)}${number}`;
    const truthLabel = tile.joker ? `${cn(tile.color)}-` : `${cn(tile.color)}${tile.number}`;

    if (correct) {
      tile.revealed = true;
      this.addLog(`${cur.name} 猜测 ${target.name} 的 ${guessLabel} ✓ 命中`);
      if (target.hand.every((t) => t.revealed)) {
        target.alive = false;
        this.addLog(`${target.name} 全数翻明，出局`);
      }
      const aliveOthers = this.players.filter((p) => p.id !== cur.id && p.alive);
      if (aliveOthers.length === 0) {
        this.phase = 'ended';
        this.winnerId = cur.id;
        this.addLog(`${cur.name} 获得胜利！`);
        return { correct, reveal };
      }
      this.phase = 'continuing';
    } else {
      this.addLog(
        `${cur.name} 猜测 ${target.name} 的 ${guessLabel} ✗ — 实为 ${truthLabel}`
      );
      if (cur.pendingDraw) {
        cur.pendingDraw.revealed = true;
        this.commitPending(cur);
        const drawn = tile.joker ? '赖子' : `${cn(tile.color)}${tile.number}`;
        this.addLog(`${cur.name} 翻明了所抽 ${drawn}`);
      }
      if (cur.hand.every((t) => t.revealed)) {
        cur.alive = false;
        this.addLog(`${cur.name} 全数翻明，出局`);
      }
      this.advanceTurn();
    }
    return { correct, reveal };
  }

  decideContinue(playerId: string, cont: boolean): void {
    if (this.phase !== 'continuing') throw new Error('当前没有可选动作');
    const cur = this.currentPlayer();
    if (cur.id !== playerId) throw new Error('不是你的回合');
    if (cont) {
      this.phase = 'guessing';
      this.addLog(`${cur.name} 继续猜测`);
    } else {
      if (cur.pendingDraw) this.commitPending(cur);
      this.addLog(`${cur.name} 收手，结束回合`);
      this.advanceTurn();
    }
  }

  /** Lock the pending draw into the hand at its decided slot. */
  private commitPending(p: ServerPlayer): void {
    if (!p.pendingDraw) return;
    const idx = p.pendingPosition ?? p.hand.length;
    p.hand.splice(Math.max(0, Math.min(idx, p.hand.length)), 0, p.pendingDraw);
    p.pendingDraw = undefined;
    p.pendingPosition = undefined;
  }

  /** Index where a numbered tile should slot in, skipping anchored jokers. */
  private findSortedIndex(hand: Tile[], tile: Tile): number {
    let i = 0;
    while (i < hand.length) {
      if (hand[i].joker) { i++; continue; }
      if (compareTiles(hand[i], tile) >= 0) break;
      i++;
    }
    return i;
  }

  // ---------- internal helpers ----------
  private advanceTurn(): void {
    const aliveCount = this.players.filter((p) => p.alive).length;
    if (aliveCount <= 1) {
      this.phase = 'ended';
      const winner = this.players.find((p) => p.alive);
      if (winner) {
        this.winnerId = winner.id;
        this.addLog(`${winner.name} 获得胜利！`);
      } else {
        this.addLog('对局结束');
      }
      return;
    }
    do {
      this.currentIdx = (this.currentIdx + 1) % this.players.length;
    } while (!this.players[this.currentIdx].alive);
    this.phase = 'drawing';
  }

  private checkEndOrAdvance(wasCurrent: boolean): void {
    const aliveCount = this.players.filter((p) => p.alive).length;
    if (aliveCount <= 1) {
      this.phase = 'ended';
      const winner = this.players.find((p) => p.alive);
      if (winner) {
        this.winnerId = winner.id;
        this.addLog(`${winner.name} 获得胜利！`);
      }
      return;
    }
    if (wasCurrent) {
      do {
        this.currentIdx = (this.currentIdx + 1) % this.players.length;
      } while (!this.players[this.currentIdx].alive);
      this.phase = 'drawing';
    }
  }

  private currentPlayer(): ServerPlayer {
    return this.players[this.currentIdx];
  }

  /** @deprecated kept for any external callers — prefer commitPending. */
  private insertSorted(hand: Tile[], tile: Tile): void {
    const i = tile.joker ? hand.length : this.findSortedIndex(hand, tile);
    hand.splice(i, 0, tile);
  }

  private addLog(text: string): void {
    this.log.push({ id: ++this.logCounter, text, ts: Date.now() });
    if (this.log.length > 80) this.log.shift();
  }

  // ---------- snapshots ----------
  toPublicState(): PublicGameState {
    return {
      code: this.code,
      phase: this.phase,
      players: this.players.map((p) => this.toPublicPlayer(p)),
      currentPlayerId: this.players[this.currentIdx]?.id,
      hostId: this.hostId,
      deckBlackCount: this.deckBlack.length,
      deckWhiteCount: this.deckWhite.length,
      log: this.log.slice(-30),
      winnerId: this.winnerId,
      lastReveal: this.lastReveal,
    };
  }

  private toPublicPlayer(p: ServerPlayer): PublicPlayer {
    type Cell = { tile: Tile; pending: boolean };
    const cells: Cell[] = p.hand.map((t) => ({ tile: t, pending: false }));
    // Only surface the pending tile to opponents once its slot is decided
    // — during 'placing' the joker is in limbo and shouldn't leak its
    // future position.
    if (p.pendingDraw && p.pendingPosition !== undefined) {
      const pos = Math.max(0, Math.min(p.pendingPosition, cells.length));
      cells.splice(pos, 0, { tile: p.pendingDraw, pending: true });
    }
    const tiles: PublicTile[] = cells.map((c, i) => ({
      id: c.tile.id,
      position: i,
      color: c.tile.color,
      revealed: c.tile.revealed,
      number: c.tile.revealed && !c.tile.joker ? (c.tile.number ?? undefined) : undefined,
      joker: c.tile.revealed && c.tile.joker ? true : undefined,
      pending: c.pending,
    }));
    return {
      id: p.id,
      name: p.name,
      tiles,
      alive: p.alive,
      connected: p.connected,
    };
  }

  toPrivateState(playerId: string): PrivateState | null {
    const me = this.players.find((p) => p.id === playerId);
    if (!me) return null;
    const all = [...me.hand];
    let pendingTileId: string | undefined;
    if (me.pendingDraw) {
      // Owner always sees their pending tile. While positioning a joker
      // (no chosen index yet) park it at the end as a temporary preview;
      // the placement sheet drives the real choice.
      const pos = me.pendingPosition ?? all.length;
      all.splice(Math.max(0, Math.min(pos, all.length)), 0, me.pendingDraw);
      pendingTileId = me.pendingDraw.id;
    }
    return {
      myId: me.id,
      myHand: all.map((t) => ({ ...t })),
      pendingTileId,
    };
  }
}
