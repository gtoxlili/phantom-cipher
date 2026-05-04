const store = require('../../lib/store');
const { ensureIdentity } = require('../../lib/identity');
const { actions } = require('../../lib/api');
const { GameStream } = require('../../lib/ws');

Page({
  data: {
    code: '',
    needName: true,
    connected: false,

    // 派生 view
    publicState: null,
    privateState: null,
    selectedTile: null,
    revealEvent: null,
    showLog: false,
    notifications: [],

    // 计算项
    me: null,
    opponents: [],
    isMyTurn: false,
    canDraw: false,
    canGuess: false,
    isHost: false,
    phase: 'waiting',
    deckBlackCount: 0,
    deckWhiteCount: 0,
    myHand: [],
    pendingTileId: '',
    nowMs: Date.now(),

    // UI 派生
    phaseText: '',
    phaseAccent: '',
    phaseMood: 'idle',

    // ActionZone 状态机
    actionZone: 'hidden',     // hidden | waiting | start | gameplay | continue | ended

    // PlayerRow 渲染数据
    myCells: [],
    opCellsList: [],   // [{ player, tiles, ... }]

    // NumberPicker 视图
    pickerVisible: false,
    pickerTargetName: '',
    pickerPosition: 0,
    pickerColor: 'black',

    // JokerPlacement
    jokerVisible: false,
    jokerColor: 'black',
    jokerOthers: [],

    // RevealOverlay
    revealVisible: false,
    revealCorrect: false,
    revealText: '',

    // ended
    winnerName: '',
    youWin: false,
  },

  _stream: null,
  _joined: false,
  _intentHost: false,
  _myName: '',
  _pidWatcher: null,
  _tickTimer: 0,

  onLoad(query) {
    const code = (query.code || '').toUpperCase().slice(0, 6);
    if (!code) {
      wx.redirectTo({ url: '/pages/home/home' });
      return;
    }
    this.setData({ code });
    store.setCurrentRoomCode(code);
    this._intentHost = store.getState().intentHost;
    if (this._intentHost) store.setIntentHost(false);

    // 订阅 store
    this._unsub = store.subscribe((s) => this._onStoreChange(s));

    // 维持 nowMs 倒计时
    this._tickTimer = setInterval(() => {
      this.setData({ nowMs: Date.now() });
    }, 1000);

    ensureIdentity().then(() => {
      this._tryJoin();
    });
  },

  onUnload() {
    if (this._unsub) this._unsub();
    if (this._tickTimer) clearInterval(this._tickTimer);
    if (this._stream) this._stream.stop();
    actions.leave();
    store.setCurrentRoomCode('');
  },

  // ---- store → setData 派生 ----
  _onStoreChange(s) {
    const view = store.computeGameView();
    const myId = view.myId;

    // PlayerRow 数据
    const myCells = view.myHand.map((t) => ({
      id: t.id,
      color: t.color,
      revealed: t.revealed,
      number: t.number == null ? null : t.number,
      joker: !!t.joker,
      pending: view.pendingTileId === t.id,
    }));
    const opCellsList = view.opponents.map((p) => ({
      player: p,
      tiles: (p.tiles || []).map((t) => ({
        id: t.id,
        color: t.color,
        revealed: t.revealed,
        number: t.number == null ? null : t.number,
        joker: !!t.joker,
        pending: !!t.pending,
      })),
      isCurrent: view.state ? view.state.currentPlayerId === p.id : false,
      isHost: view.state ? view.state.hostId === p.id : false,
      selectedTileId: s.selectedTile && s.selectedTile.playerId === p.id ? s.selectedTile.tileId : '',
    }));

    // ActionZone 决策
    let actionZone = 'hidden';
    if (view.state) {
      if (view.state.phase === 'waiting') {
        actionZone = view.isHost ? 'start' : 'waiting';
      } else if (view.state.phase === 'ended') {
        actionZone = 'ended';
      } else if (
        view.state.phase === 'drawing' ||
        view.state.phase === 'placing' ||
        view.state.phase === 'guessing' ||
        view.state.phase === 'continuing'
      ) {
        actionZone = 'gameplay';
      }
    }

    // PhaseBanner
    const banner = computePhaseInfo(view, s.connected);

    // NumberPicker
    let pickerVisible = false;
    let pickerTargetName = '';
    let pickerPosition = 0;
    let pickerColor = 'black';
    if (s.selectedTile && view.canGuess) {
      const op = view.opponents.find((p) => p.id === s.selectedTile.playerId);
      const tile = op ? op.tiles.find((t) => t.id === s.selectedTile.tileId) : null;
      if (op && tile) {
        pickerVisible = true;
        pickerTargetName = op.name || '';
        pickerPosition = tile.position || 0;
        pickerColor = tile.color || 'black';
      }
    }

    // JokerPlacement
    let jokerVisible = false;
    let jokerColor = 'black';
    let jokerOthers = [];
    if (view.phase === 'placing' && view.isMyTurn && view.pendingTileId) {
      const pending = view.myHand.find((t) => t.id === view.pendingTileId);
      if (pending) {
        jokerVisible = true;
        jokerColor = pending.color;
        jokerOthers = view.myHand.filter((t) => t.id !== view.pendingTileId).map((t) => ({
          id: t.id,
          color: t.color,
          number: t.number == null ? null : t.number,
          joker: !!t.joker,
          revealed: !!t.revealed,
        }));
      }
    }

    // RevealOverlay
    let revealVisible = false;
    let revealCorrect = false;
    let revealText = '';
    if (s.revealEvent) {
      revealVisible = true;
      revealCorrect = !!s.revealEvent.correct;
      const isMine = myId && s.revealEvent.guesserId === myId;
      if (revealCorrect) {
        revealText = isMine ? '命中 // HIT!' : '被命中 // CRACKED';
      } else {
        revealText = isMine ? '失手 // MISS' : '失手 // MISSED';
      }
    }

    // Ended 信息
    let winnerName = '';
    let youWin = false;
    if (view.state && view.state.phase === 'ended') {
      const w = view.state.players.find((p) => p.id === view.state.winnerId);
      if (w) winnerName = (w.name || '').toUpperCase();
      youWin = !!myId && view.state.winnerId === myId;
    }

    this.setData({
      needName: !s.myName,
      connected: s.connected,
      publicState: s.publicState,
      privateState: s.privateState,
      selectedTile: s.selectedTile,
      revealEvent: s.revealEvent,
      showLog: s.showLog,
      notifications: s.notifications,

      me: view.me || null,
      opponents: view.opponents,
      isMyTurn: view.isMyTurn,
      canDraw: view.canDraw,
      canGuess: view.canGuess,
      isHost: view.isHost,
      phase: view.phase,
      deckBlackCount: view.deckBlackCount,
      deckWhiteCount: view.deckWhiteCount,
      myHand: view.myHand,
      pendingTileId: view.pendingTileId || '',

      phaseText: banner.text,
      phaseAccent: banner.accent,
      phaseMood: banner.mood,

      actionZone,

      myCells,
      opCellsList,

      pickerVisible,
      pickerTargetName,
      pickerPosition,
      pickerColor,

      jokerVisible,
      jokerColor,
      jokerOthers,

      revealVisible,
      revealCorrect,
      revealText,

      winnerName,
      youWin,
    });

    // 玩家名字一旦设进来了就尝试加入
    if (s.myName && s.playerId && !this._joined) {
      this._tryJoin();
    }
  },

  // 等 myName + pid 都就绪才 join；启动 WS
  async _tryJoin() {
    const s = store.getState();
    if (!s.myName || !s.playerId) return;
    if (this._joined) return;
    this._joined = true;
    await actions.join(s.myName, this._intentHost);
    this._intentHost = false;
    this._startWs();
  },

  _startWs() {
    if (this._stream) return;
    const s = store.getState();
    if (!s.currentRoomCode || !s.playerId) return;
    this._stream = new GameStream();
    this._stream.start(s.currentRoomCode, s.playerId);
  },

  // ---- 用户事件 ----
  onBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.redirectTo({ url: '/pages/home/home' }) });
  },
  onToggleLog() {
    store.setShowLog(!store.getState().showLog);
  },
  onCloseLog() {
    store.setShowLog(false);
  },

  onStart() { actions.start(); },

  onDraw(e) {
    const c = e.detail && e.detail.color;
    if (!c) return;
    actions.draw(c);
  },

  onContinue() { actions.decideContinue(true); },
  onStopHand() { actions.decideContinue(false); },

  onReset() { actions.reset(); },

  onMyTileTap() { /* 自己的牌不响应点击，由 player-row 内 canTarget=false 直接屏蔽 */ },

  onOpTileTap(e) {
    const playerId = e.currentTarget.dataset.pid;
    const tileId = (e.detail && e.detail.tileId) || '';
    if (!playerId || !tileId) return;
    if (!this.data.canGuess) return;
    store.setSelectedTile({ playerId, tileId });
  },

  // NumberPicker 回调
  onPickerClose() { store.setSelectedTile(null); },
  onPick(e) {
    const sel = store.getState().selectedTile;
    if (!sel) return;
    const n = e.detail && e.detail.number;
    actions.guess(sel.playerId, sel.tileId, n === null ? null : Number(n));
  },

  // JokerPlacement 回调
  onPlaceJoker(e) {
    const pos = e.detail && e.detail.position;
    if (typeof pos !== 'number') return;
    actions.placeJoker(pos);
  },

  // NamePrompt 回调
  onNameSubmit(e) {
    const name = (e.detail && e.detail.name) || '';
    if (!name) return;
    store.setMyName(name);
  },
  onNameCancel() {
    wx.navigateBack({ delta: 1, fail: () => wx.redirectTo({ url: '/pages/home/home' }) });
  },
});

// 派生工具函数
function computePhaseInfo(v, isConnected) {
  if (!isConnected) return { text: 'CONNECTING', accent: '', mood: 'idle' };
  if (!v.state) return { text: 'LOADING', accent: '', mood: 'idle' };
  if (v.state.phase === 'waiting') {
    const n = v.state.players.length;
    if (n < 2) {
      return { text: 'WAITING · 等待 2–4 玩家', accent: n + '/2', mood: 'idle' };
    }
    return { text: 'READY · ' + n + ' 玩家就位 · 房主开局', accent: '▶', mood: 'turn' };
  }
  if (v.state.phase === 'ended') {
    const winner = v.state.players.find((p) => p.id === v.state.winnerId);
    return {
      text: winner ? (winner.name || '').toUpperCase() + ' WINS' : 'GAME OVER',
      accent: '★',
      mood: 'end',
    };
  }
  if (v.isMyTurn) {
    let text = 'YOUR TURN';
    if (v.canDraw) text = '你的回合 / DRAW';
    else if (v.state.phase === 'placing') text = '放置赖子 / PLACE JOKER';
    else if (v.canGuess && v.state.phase === 'continuing') text = '继续 OR 收手';
    else if (v.canGuess) text = '选一块 PICK A TILE';
    return { text, accent: '▶', mood: 'turn' };
  }
  const cur = v.state.players.find((p) => p.id === v.state.currentPlayerId);
  const action = ({
    drawing: 'DRAWING',
    placing: 'PLACING',
    guessing: 'GUESSING',
    continuing: 'DECIDING',
  })[v.state.phase] || '';
  return {
    text: ((cur && cur.name) ? cur.name.toUpperCase() : '?') + ' ' + action,
    accent: '·',
    mood: 'wait',
  };
}
