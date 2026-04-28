// Solid stores — port of lib/atoms.ts.
//
// Jotai atoms become Solid signals. The big difference is that
// Solid signals support fine-grained reactivity natively: any
// component reading `gameView()` only re-runs the bits that touch
// the part of the struct that changed, no manual selector needed.
//
// Persistent (sessionStorage-backed) values live in their own
// signals + an effect that mirrors them to sessionStorage. Same
// behaviour as `atomWithStorage` from Jotai.

import { createSignal, createMemo, createEffect, on } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  Phase,
  PrivateState,
  PublicGameState,
  PublicPlayer,
  RevealInfo,
  Tile,
} from '@/types';

// ---------- session-backed primitives ----------

function sessionSignal<T>(key: string, initial: T) {
  let stored: T = initial;
  if (typeof sessionStorage !== 'undefined') {
    const raw = sessionStorage.getItem(key);
    if (raw !== null) {
      try {
        stored = JSON.parse(raw) as T;
      } catch {
        /* swallow malformed session value */
      }
    }
  }
  const [get, set] = createSignal<T>(stored);
  createEffect(
    on(get, (v) => {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(key, JSON.stringify(v));
        }
      } catch {
        /* quota / private mode — silently ignore */
      }
    }),
  );
  return [get, set] as const;
}

export const [playerId, setPlayerId] = sessionSignal<string>('davinci-pid', '');
export const [myName, setMyName] = sessionSignal<string>('davinci-name', '');
export const [intentHost, setIntentHost] = sessionSignal<boolean>('davinci-host', false);

export const needName = createMemo(() => !myName());

// ---------- in-memory state ----------

export const [currentRoomCode, setCurrentRoomCode] = createSignal<string>('');
export const [connected, setConnected] = createSignal<boolean>(false);
export const [publicState, setPublicState] = createSignal<PublicGameState | null>(null);
export const [privateState, setPrivateState] = createSignal<PrivateState | null>(null);

export const [selectedTile, setSelectedTile] = createSignal<{
  playerId: string;
  tileId: string;
} | null>(null);
export const [revealEvent, setRevealEvent] = createSignal<RevealInfo | null>(null);
export const [showLog, setShowLog] = createSignal<boolean>(false);

// ---------- notifications queue ----------

interface Notification {
  id: number;
  text: string;
  ts: number;
}

let nextNotificationId = 0;
export const [notifications, setNotifications] = createStore<Notification[]>([]);

export function pushNotification(text: string) {
  setNotifications(
    produce((draft) => {
      draft.push({ id: ++nextNotificationId, text, ts: Date.now() });
      while (draft.length > 5) draft.shift();
    }),
  );
}

export function dismissNotification(id: number) {
  setNotifications((arr) => arr.filter((n) => n.id !== id));
}

// ---------- derived gameView ----------

export interface GameView {
  state: PublicGameState | null;
  myId: string | undefined;
  me: PublicPlayer | undefined;
  opponents: PublicPlayer[];
  phase: Phase;
  isMyTurn: boolean;
  canGuess: boolean;
  canDraw: boolean;
  isHost: boolean;
  myHand: Tile[];
  pendingTileId: string | undefined;
  deckBlackCount: number;
  deckWhiteCount: number;
}

export const gameView = createMemo<GameView>(() => {
  const state = publicState();
  const priv = privateState();
  const myId = priv?.myId;
  const phase: Phase = state?.phase ?? 'waiting';
  const isMyTurn = !!state && !!myId && state.currentPlayerId === myId;
  const me = state?.players.find((p) => p.id === myId);
  const opponents = state?.players.filter((p) => p.id !== myId) ?? [];

  return {
    state,
    myId,
    me,
    opponents,
    phase,
    isMyTurn,
    canGuess: isMyTurn && (phase === 'guessing' || phase === 'continuing'),
    canDraw: isMyTurn && phase === 'drawing',
    isHost: !!state && !!myId && state.hostId === myId,
    myHand: priv?.myHand ?? [],
    pendingTileId: priv?.pendingTileId,
    deckBlackCount: state?.deckBlackCount ?? 0,
    deckWhiteCount: state?.deckWhiteCount ?? 0,
  };
});

// Reveal events should auto-clear after 1.5s — same as the original
// useGameStream timeout. Doing it here keeps timing logic out of
// components.
let revealTimer: number | undefined;
export function setReveal(info: RevealInfo) {
  setRevealEvent(info);
  if (revealTimer !== undefined) window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => setRevealEvent(null), 1500);
}
