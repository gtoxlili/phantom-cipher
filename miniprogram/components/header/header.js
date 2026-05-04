const store = require('../../lib/store');

Component({
  options: { multipleSlots: false },
  properties: {
    code: { type: String, value: '' },
    connected: { type: Boolean, value: false },
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
