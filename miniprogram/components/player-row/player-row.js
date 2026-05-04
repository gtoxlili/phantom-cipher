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
  },
  methods: {
    onTileTap(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('tileTap', { tileId: id });
    },
  },
});
