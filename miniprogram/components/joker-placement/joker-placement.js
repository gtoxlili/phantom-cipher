Component({
  options: { multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    pendingColor: { type: String, value: 'black' },
    others: { type: Array, value: [] },     // 其余手牌
  },
  data: { slots: [] },
  observers: {
    'others': function (others) {
      const len = (others ? others.length : 0) + 1;
      this.setData({ slots: Array.from({ length: len }, (_, i) => i) });
    },
  },
  methods: {
    onSlot(e) {
      const pos = e.currentTarget.dataset.pos;
      this.triggerEvent('place', { position: pos });
    },
    onSheetTap(e) {
      e.stopPropagation && e.stopPropagation();
    },
  },
});
