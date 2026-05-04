Component({
  options: { multipleSlots: false },
  properties: {
    color: { type: String, value: 'black' },
    count: { type: Number, value: 0 },
    canDraw: { type: Boolean, value: false },
  },
  data: {
    stackArr: [0, 1, 2, 3], // 用 4 张做"摞"的视觉
  },
  observers: {
    'count': function (n) {
      const len = Math.max(Math.min(n || 0, 4), 1);
      this.setData({
        stackArr: Array.from({ length: len }, (_, i) => i),
      });
    },
  },
  methods: {
    onTap() {
      if (!this.data.canDraw || this.data.count <= 0) return;
      this.triggerEvent('draw', { color: this.data.color });
    },
  },
});
