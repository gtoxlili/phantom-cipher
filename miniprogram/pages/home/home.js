const store = require('../../lib/store');
const { ensureIdentity } = require('../../lib/identity');
const { pickRandomCodename, genRoomCode } = require('../../lib/codenames');
const { ensureLayout } = require('../../lib/layout');

Page({
  data: {
    mode: 'menu',         // menu | create | join
    myName: '',
    code: '',
    error: '',
    notifications: [],
    showHowto: false,
    lastShuffleIdx: -1,
    layout: ensureLayout(),
  },

  onLoad() {
    this._unsub = store.subscribe((s) => {
      this.setData({
        myName: s.myName,
        notifications: s.notifications,
      });
    });
    ensureIdentity();
  },

  onUnload() {
    if (this._unsub) this._unsub();
  },

  // ---- 输入处理 ----
  onNameInput(e) {
    store.setMyName(e.detail.value);
    if (this.data.error) this.setData({ error: '' });
  },
  onCodeInput(e) {
    let v = (e.detail.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    this.setData({ code: v, error: '' });
    return v; // for input value control
  },
  onShuffle() {
    const { name, index } = pickRandomCodename(this.data.lastShuffleIdx);
    store.setMyName(name);
    this.setData({ lastShuffleIdx: index, error: '' });
  },

  // ---- 模式切换 ----
  goCreate() { this.setData({ mode: 'create', error: '' }); },
  goJoin()   { this.setData({ mode: 'join',   error: '' }); },
  goBack()   { this.setData({ mode: 'menu',   error: '' }); },

  toggleHowto() {
    this.setData({ showHowto: !this.data.showHowto });
  },

  // ---- 进入房间 ----
  submitCreate() {
    const trimmed = (this.data.myName || '').trim();
    if (!trimmed) { this.setData({ error: '需要一个代号 NAME REQUIRED' }); return; }
    store.setMyName(trimmed);
    store.setIntentHost(true);
    const newCode = genRoomCode();
    wx.navigateTo({ url: '/pages/room/room?code=' + newCode, routeType: 'p5-slash' });
  },
  submitJoin() {
    const trimmed = (this.data.myName || '').trim();
    if (!trimmed) { this.setData({ error: '需要一个代号 NAME REQUIRED' }); return; }
    const code = (this.data.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) {
      this.setData({ error: '密码应为 4 位字母数字' });
      return;
    }
    store.setMyName(trimmed);
    store.setIntentHost(false);
    wx.navigateTo({ url: '/pages/room/room?code=' + code, routeType: 'p5-slash' });
  },

  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats', routeType: 'p5-slash' });
  },
});
