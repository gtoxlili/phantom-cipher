'use client';

import { atom } from 'jotai';
import { atomWithImmer } from 'jotai-immer';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { Phase, PrivateState, PublicGameState, PublicPlayer, RevealInfo, Tile } from './types';

// ============================================================
// Persistent identity (sessionStorage-backed)
// ============================================================
const sessionString = createJSONStorage<string>(() =>
  typeof window === 'undefined' ? (undefined as unknown as Storage) : sessionStorage,
);
const sessionBool = createJSONStorage<boolean>(() =>
  typeof window === 'undefined' ? (undefined as unknown as Storage) : sessionStorage,
);

export const playerIdAtom = atomWithStorage<string>('davinci-pid', '', sessionString, {
  getOnInit: true,
});

export const myNameAtom = atomWithStorage<string>('davinci-name', '', sessionString, {
  getOnInit: true,
});

export const intentHostAtom = atomWithStorage<boolean>('davinci-host', false, sessionBool, {
  getOnInit: true,
});

/** Lifecycle differs from in-room state — bootstraps before any room exists. */
export const needNameAtom = atom((get) => !get(myNameAtom));

// ============================================================
// Active room (replaces React context)
// ============================================================
export const currentRoomCodeAtom = atom<string>('');

// ============================================================
// SSE connection (changes independently of game state)
// ============================================================
export const connectedAtom = atom(false);

// ============================================================
// Server state — raw inputs into the view
// ============================================================
export const publicStateAtom = atom<PublicGameState | null>(null);
export const privateStateAtom = atom<PrivateState | null>(null);

// ============================================================
// UI-only state that updates independently of server pushes
// ============================================================
export const selectedTileAtom = atom<{ playerId: string; tileId: string } | null>(null);
export const revealAtom = atom<RevealInfo | null>(null);
export const showLogAtom = atom(false);

// ============================================================
// Notifications queue (immer-backed)
// ============================================================
export interface Notification {
  id: number;
  text: string;
  ts: number;
}

let nextNotificationId = 0;

export const notificationsAtom = atomWithImmer<Notification[]>([]);

export const pushNotificationAtom = atom(null, (_get, set, text: string) => {
  set(notificationsAtom, (draft) => {
    draft.push({ id: ++nextNotificationId, text, ts: Date.now() });
    while (draft.length > 5) draft.shift();
  });
});

export const dismissNotificationAtom = atom(null, (_get, set, id: number) => {
  set(notificationsAtom, (draft) => {
    const i = draft.findIndex((d) => d.id === id);
    if (i >= 0) draft.splice(i, 1);
  });
});

// ============================================================
// Derived game view — one struct that everyone reads from.
// Granular subscriptions on individual booleans gain nothing here
// because the source atoms (public / private state) always change
// atomically with each SSE push.
// ============================================================
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
  deckCount: number;
}

export const gameViewAtom = atom<GameView>((get): GameView => {
  const state = get(publicStateAtom);
  const priv = get(privateStateAtom);
  const myId = priv?.myId;
  const phase = state?.phase ?? 'waiting';
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
    deckCount: state?.deckCount ?? 0,
  };
});
