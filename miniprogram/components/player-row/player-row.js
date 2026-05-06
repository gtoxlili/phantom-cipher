const { forfeitSecondsLeft } = require('../../lib/util');
const haptics = require('../../lib/haptics');

Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    player: { type: Object, value: null },
    isMe: { type: Boolean, value: false },
    tiles: { type: Array, value: [] },
    current: { type: Boolean, value: false },
    host: { type: Boolean, value: false },
    canTarget: { type: Boolean, value: false },
    selectedTileId: { type: String, value: '' },
    revealTileId: { type: String, value: '' },
    revealCorrect: { type: Boolean, value: false },
    nowMs: { type: Number, value: 0 },
  },
  data: {
    forfeitSec: 0,
    playerNameUpper: '',
  },
  /* 自己手牌横向滚动里要把刚抽到的（pending）那张牌滚进视口。
     注意：声明式 scroll-into-view 在"新增 tile-cell + 改 scroll-into-view"
     同一帧到达时不可靠 —— scroll-view 计算位置时新节点尚未完成布局，
     滚动会哑掉（Skyline scroll-view 已知行为）。
     正确做法：scroll-view 开 enhanced，通过 ScrollViewContext.scrollIntoView()
     在 nextTick 里调用，等 DOM 实际挂上、布局完成后再滚。*/
  lifetimes: {
    attached() {
      this._lastPendingId = '';
      this._svCtx = null;
    },
    ready() {
      if (!this.data.isMe) return;
      this._resolveScrollViewCtx();
    },
  },
  observers: {
    'player, nowMs': function (player, now) {
      if (!player) {
        this.setData({ forfeitSec: 0, playerNameUpper: '' });
        return;
      }
      const sec = player.pendingForfeitAt
        ? forfeitSecondsLeft(player.pendingForfeitAt, now || Date.now())
        : 0;
      this.setData({
        forfeitSec: sec,
        playerNameUpper: (player.name || '').toUpperCase(),
      });
    },
    'isMe, tiles': function (isMe, tiles) {
      if (!isMe) return;
      const pending = (tiles || []).find((t) => t && t.pending);
      const pid = pending && pending.id ? pending.id : '';
      if (!pid || pid === this._lastPendingId) return;
      this._lastPendingId = pid;
      // 等 setData → 渲染落地后再滚，否则新 tile-cell 还没在 DOM 上
      wx.nextTick(() => this._scrollToTile(pid));
    },
  },
  methods: {
    _resolveScrollViewCtx() {
      if (this._svCtx) return Promise.resolve(this._svCtx);
      return new Promise((resolve) => {
        this.createSelectorQuery()
          .select('#hand-scroll')
          .node()
          .exec((res) => {
            this._svCtx = (res && res[0] && res[0].node) || null;
            resolve(this._svCtx);
          });
      });
    },
    async _scrollToTile(tileId) {
      const ctx = await this._resolveScrollViewCtx();
      if (!ctx || typeof ctx.scrollIntoView !== 'function') return;
      // Skyline 3.1.0+ 才支持 ScrollIntoViewOptions（alignment/animated/offset）
      try {
        ctx.scrollIntoView('#tile-' + tileId, {
          alignment: 'center',
          animated: true,
        });
      } catch (e) {
        ctx.scrollIntoView('#tile-' + tileId);
      }
    },
    onTileTap(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      // 即便 tile 自身关掉了 clickable，原生 tap 还会沿组件根冒泡到这里，
      // 所以再做一次门禁：已亮明 / 不可猜 / 已死亡 都不上抛事件，
      // 避免触发服务端「该牌已亮明」错误。
      if (!this.data.canTarget) return;
      const player = this.data.player;
      if (!player || player.alive === false) return;
      const tile = (this.data.tiles || []).find((t) => t && t.id === id);
      if (!tile || tile.revealed) return;
      haptics.light();
      this.triggerEvent('tileTap', { tileId: id });
    },
  },
});
