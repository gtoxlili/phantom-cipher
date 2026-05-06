const store = require('../../lib/store');
const { generateShortLink } = require('../../lib/wx');

Component({
  options: { multipleSlots: false },
  properties: {
    code: { type: String, value: '' },
    connected: { type: Boolean, value: false },
    /** 胶囊按钮左侧到屏幕右边缘的距离（px）—— 让 header 右边留出
     *  足够空间不挡胶囊。从 page 透传过来。 */
    capsuleSafeRight: { type: Number, value: 96 },
    /** 胶囊高度（px）—— Row 1 严格按胶囊高度排，视觉对齐胶囊 */
    capsuleHeight: { type: Number, value: 32 },
  },
  data: { copied: false, copying: false },

  methods: {
    onBack() {
      this.triggerEvent('back', {});
    },
    async onShare() {
      // 优先尝试生成微信短链（wxaurl.cn）—— 复制出去到任何聊天框都是
      // 可点的链接，比纯文本邀请强。短链生成失败（后端 503 / 微信侧
      // env_version 校验等）退回原来的纯文本提示，体验不会因此卡死
      const code = this.data.code;
      if (!code || this.data.copying) return;
      this.setData({ copying: true });
      let payload = '怪盗密码 · 加入房间 ' + code;
      try {
        const link = await generateShortLink({
          path: '/pages/room/room',
          query: 'code=' + code,
          envVersion: 'trial',
        });
        if (link) {
          payload = '怪盗密码 · ' + code + ' · ' + link;
        }
      } catch (e) { /* fallback 到纯文本 */ }
      wx.setClipboardData({
        data: payload,
        success: () => {
          this.setData({ copied: true, copying: false });
          setTimeout(() => this.setData({ copied: false }), 1600);
        },
        fail: () => {
          this.setData({ copying: false });
          store.pushNotification('复制失败');
        },
      });
    },
    onLog() { this.triggerEvent('toggleLog', {}); },
  },
});
