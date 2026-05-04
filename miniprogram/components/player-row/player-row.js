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
  },
  observers: {
    'player, nowMs': function (player, now) {
      if (!player || !player.pendingForfeitAt) {
        this.setData({ forfeitSec: 0 });
        return;
      }
      this.setData({ forfeitSec: forfeitSecondsLeft(player.pendingForfeitAt, now || Date.now()) });
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
