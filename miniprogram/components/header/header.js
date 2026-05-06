Component({
  options: { multipleSlots: false },
  properties: {
    code: { type: String, value: '' },
    /** 胶囊按钮左侧到屏幕右边缘的距离（px）—— 让 header 右边留出
     *  足够空间不挡胶囊。从 page 透传过来。 */
    capsuleSafeRight: { type: Number, value: 96 },
    /** 胶囊高度（px）—— Row 1 严格按胶囊高度排，视觉对齐胶囊 */
    capsuleHeight: { type: Number, value: 32 },
  },

  methods: {
    onBack() {
      this.triggerEvent('back', {});
    },
  },
});
