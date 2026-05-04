Component({
  options: { multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    targetName: { type: String, value: '' },
    position: { type: Number, value: 0 },
    color: { type: String, value: 'black' },
  },
  data: {
    nums: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  methods: {
    onClose() { this.triggerEvent('close', {}); },
    onPick(e) {
      const n = e.currentTarget.dataset.n;
      this.triggerEvent('pick', { number: n });
    },
    onJoker() {
      this.triggerEvent('pick', { number: null });
    },
    onSheetTap(e) {
      // 阻止冒泡到 backdrop
      e.stopPropagation && e.stopPropagation();
    },
  },
});
