const store = require('../../lib/store');

Component({
  options: { multipleSlots: false },
  properties: {
    code: { type: String, value: '' },
    connected: { type: Boolean, value: false },
    /** 胶囊按钮左侧到屏幕右边缘的距离（px）—— 让 header 右边留出
     *  足够空间不挡胶囊。从 page 透传过来。 */
    capsuleSafeRight: { type: Number, value: 96 },
    /** Header 最小高度（px）—— 跟胶囊高度对齐 */
    navMinHeight: { type: Number, value: 44 },
  },
  data: { copied: false },

  methods: {
    onBack() {
      this.triggerEvent('back', {});
    },
    onShare() {
      // 把房间码复制到剪贴板，再用一行文本提示
      const code = this.data.code;
      if (!code) return;
      const text = '怪盗密码 · 加入房间 ' + code;
      wx.setClipboardData({
        data: text,
        success: () => {
          this.setData({ copied: true });
          setTimeout(() => this.setData({ copied: false }), 1600);
        },
        fail: () => {
          store.pushNotification('复制失败');
        },
      });
    },
    onLog() { this.triggerEvent('toggleLog', {}); },
  },
});
