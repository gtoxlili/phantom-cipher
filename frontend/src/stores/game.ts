// 当前对局的内存态——这层是从 WebSocket 灌进来的快照，UI 直接订阅
// 这些 signal。session.ts 是身份信息，notifications.ts 是 toast 队列，
// 各自分文件。
//
// gameView 是一个派生 memo，把"我是谁"+"局面"融合成 UI 一行就能
// 读懂的视图——`isMyTurn` / `canDraw` / `me` / `opponents` 这种
// 属性能避开组件里到处复制 if-else。

import { createMemo, createSignal } from 'solid-js';
import type {
  Phase,
  PrivateState,
  PublicGameState,
  PublicPlayer,
  RevealInfo,
  Tile,
} from '@/types';

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

// 翻牌动画浮层 1.5 秒自动消失。timer 放这里而不是组件里，避免
// 每次 reveal 重新挂载又拆掉一遍 timer——真正想要的是"最新一次
// 翻牌算数"，旧的 timer 直接被替换。
let revealTimer: number | undefined;
export function setReveal(info: RevealInfo) {
  setRevealEvent(info);
  if (revealTimer !== undefined) window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => setRevealEvent(null), 1500);
}

// 把零散的状态合并成一个总入口，方便 import 时一行搞定。
// 用 named exports 是因为 tree-shake 友好，IDE 自动补全也更好。
export {
  // 身份相关
  myName,
  setMyName,
  playerId,
  setPlayerId,
  intentHost,
  setIntentHost,
  needName,
} from './session';

export {
  // toast 队列
  notifications,
  pushNotification,
  dismissNotification,
  type Notification,
} from './notifications';
