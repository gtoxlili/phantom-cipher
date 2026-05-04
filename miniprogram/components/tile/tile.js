Component({
  options: { multipleSlots: false, addGlobalClass: false, virtualHost: false },
  properties: {
    // 数字 / 颜色 / 各种状态
    number:        { type: null,    value: null },     // number 或 null
    color:         { type: String,  value: 'black' },
    joker:         { type: Boolean, value: false },
    faceDown:      { type: Boolean, value: false },
    ownedHidden:   { type: Boolean, value: false },
    ownedExposed:  { type: Boolean, value: false },
    pending:       { type: Boolean, value: false },
    selected:      { type: Boolean, value: false },
    selectable:    { type: Boolean, value: false },
    size:          { type: String,  value: 'md' },     // sm | md | lg
    highlight:     { type: String,  value: '' },       // '' | 'correct' | 'wrong'
    index:         { type: Number,  value: 0 },
    // 是否启用 onClick
    clickable:     { type: Boolean, value: false },
  },

  data: {
    halftoneCircles: Array.from({ length: 8 }, (_, i) => i),
  },

  observers: {
    'highlight': function (h) {
      // 触发短动画后清掉本地副本不需要——CSS 关键帧本身一次播完即停
    },
  },

  methods: {
    onTap() {
      if (!this.data.clickable) return;
      this.triggerEvent('tap', {});
    },
  },
});
