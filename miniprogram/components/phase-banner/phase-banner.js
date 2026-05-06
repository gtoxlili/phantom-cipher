Component({
  options: { multipleSlots: false },
  properties: {
    text: { type: String, value: '' },
    /** 文本副标，accent / accentIcon 二选一 */
    accent: { type: String, value: '' },
    /** 图标名（star / arrow-right / dot）；非空时优先用图标 */
    accentIcon: { type: String, value: '' },
    accentColor: { type: String, value: '#fafaf3' },
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
