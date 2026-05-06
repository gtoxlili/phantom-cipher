const { forfeitSecondsLeft } = require('../../lib/util');

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
    /* 自己手牌横向滚动定位：抽完牌后让 scroll-view 滚到刚抽到的（pending）
       那张，避免新牌追加在末尾、用户根本没看到的尴尬。
       小程序 scroll-into-view 的 id 不能纯数字开头，加 'tile-' 前缀。*/
    focusViewId: '',
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
    /* 只对自己的手牌滚动；对手区域是 wrap 排版没有滚动条 */
    'isMe, tiles': function (isMe, tiles) {
      if (!isMe) return;
      const pending = (tiles || []).find((t) => t && t.pending);
      if (!pending || !pending.id) return;
      const next = 'tile-' + pending.id;
      if (next === this.data.focusViewId) return;
      this.setData({ focusViewId: next });
    },
  },
  methods: {
    onTileTap(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('tileTap', { tileId: id });
    },
  },
});
