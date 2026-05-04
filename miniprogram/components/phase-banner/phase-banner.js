Component({
  options: { multipleSlots: false },
  properties: {
    text: { type: String, value: '' },
    accent: { type: String, value: '' },
    mood: { type: String, value: 'idle' },     // idle | turn | wait | end
  },
  data: { animKey: 0 },
  observers: {
    'text, mood': function () {
      // 通过 key 切换让动画重播
      this.setData({ animKey: Date.now() });
    },
  },
});
