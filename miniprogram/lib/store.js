/**
 * 全局对局状态 + 简易订阅器。
 *
 * 跟 frontend/stores 的责任划分一致：身份信息 + 当前对局快照 + 通知队列
 * 都汇集在同一个对象里。Page / Component 用 subscribeToStore() 注册一个
 * recompute 回调拿派生数据并 setData。
 *
 * 不复刻 SolidJS signal 的细粒度依赖追踪——小程序 Page.setData 是粗粒度
 * diff，订阅整个 store 一起重算 view 反而比追踪更省心；事件源就 WebSocket
 * 一个，全量 recompute 一次的代价远小于 Skyline 渲染一帧的代价。
 */

const listeners = new Set();
let nextNotifId = 0;

const state = {
  // 身份 / session
  playerId: '',
  myName: '',
  intentHost: false,

  // 房间对局
  currentRoomCode: '',
  connected: false,
  publicState: null,
  privateState: null,

  // UI 状态
  selectedTile: null,
  revealEvent: null,
  showLog: false,
  notifications: [],
};

function notify() {
  for (const fn of listeners) {
    try { fn(state); }
    catch (err) { console.error('store listener', err); }
  }
}

function subscribe(fn) {
  listeners.add(fn);
  // 同步触发一次让订阅者拿到当前快照
  try { fn(state); }
  catch (err) { console.error('store initial', err); }
  return () => listeners.delete(fn);
}

function getState() { return state; }

// ---- 身份 ----
function setPlayerId(pid) {
  state.playerId = pid || '';
  notify();
}
function setMyName(name) {
  state.myName = name || '';
  if (name) {
    try { wx.setStorageSync('davinci-name', name); }
    catch (e) { /* ignore */ }
  }
  notify();
}
function setIntentHost(v) {
  state.intentHost = !!v;
  notify();
}

// ---- 房间 ----
function setCurrentRoomCode(code) {
  state.currentRoomCode = code || '';
  if (!code) {
    state.publicState = null;
    state.privateState = null;
    state.revealEvent = null;
    state.selectedTile = null;
  }
  notify();
}
function setConnected(v) {
  state.connected = !!v;
  notify();
}
function setPublicState(s) {
  state.publicState = s;
  notify();
}
function setPrivateState(s) {
  state.privateState = s;
  notify();
}

// ---- UI ----
function setSelectedTile(sel) {
  state.selectedTile = sel;
  notify();
}
function setShowLog(v) {
  state.showLog = !!v;
  notify();
}

// 翻牌动画浮层 1.5s 自动消失。timer 放 store 里避免组件重挂载又拆掉
let revealTimer = 0;
function setReveal(info) {
  state.revealEvent = info;
  notify();
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    state.revealEvent = null;
    revealTimer = 0;
    notify();
  }, 1500);
}

// ---- toast 队列 ----
const QUEUE_CAP = 5;
function pushNotification(text) {
  if (!text) return;
  const id = ++nextNotifId;
  state.notifications = [...state.notifications, { id, text, ts: Date.now() }];
  while (state.notifications.length > QUEUE_CAP) state.notifications.shift();
  notify();
  // 自动清理 2.8s
  setTimeout(() => dismissNotification(id), 2800);
}
function dismissNotification(id) {
  const next = state.notifications.filter((n) => n.id !== id);
  if (next.length === state.notifications.length) return;
  state.notifications = next;
  notify();
}

// ---- 派生 view ----
//
// 对应 frontend/stores/game.ts gameView memo。组件按需拼装但单独抽出
// 一个函数能确保各处口径一致——`isMyTurn` / `canDraw` / `me` / `opponents`
function computeGameView() {
  const s = state.publicState;
  const priv = state.privateState;
  const myId = priv ? priv.myId : undefined;
  const phase = s ? s.phase : 'waiting';
  const isMyTurn = !!s && !!myId && s.currentPlayerId === myId;
  const me = s ? s.players.find((p) => p.id === myId) : undefined;
  const opponents = s ? s.players.filter((p) => p.id !== myId) : [];
  return {
    state: s,
    myId,
    me,
    opponents,
    phase,
    isMyTurn,
    canGuess: isMyTurn && (phase === 'guessing' || phase === 'continuing'),
    canDraw: isMyTurn && phase === 'drawing',
    isHost: !!s && !!myId && s.hostId === myId,
    myHand: priv ? priv.myHand : [],
    pendingTileId: priv ? priv.pendingTileId : undefined,
    deckBlackCount: s ? s.deckBlackCount : 0,
    deckWhiteCount: s ? s.deckWhiteCount : 0,
  };
}

// 启动期一次性 hydrate：sessionStorage / localStorage 已有的昵称
try {
  const cachedName = wx.getStorageSync('davinci-name');
  if (cachedName) state.myName = cachedName;
} catch (e) { /* ignore */ }

module.exports = {
  subscribe,
  getState,
  computeGameView,

  setPlayerId,
  setMyName,
  setIntentHost,
  setCurrentRoomCode,
  setConnected,
  setPublicState,
  setPrivateState,
  setSelectedTile,
  setShowLog,
  setReveal,
  pushNotification,
  dismissNotification,
};
