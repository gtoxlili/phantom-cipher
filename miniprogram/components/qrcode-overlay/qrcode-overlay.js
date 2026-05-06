/**
 * QR 码浮层。点开看到一张本房间的小程序码，扫了直接进房间。
 *
 * src 直接走 backend `/api/wx/qrcode?scene=...&page=...&env_version=...`，
 * `<image>` 拉的就是 PNG。后端没配 WX_APPID 时返 503/JSON，image 加载
 * 失败，UI fallback 显示"二维码暂不可用，请直接转发邀请"。
 */

const { qrcodeUrl } = require('../../lib/wx');

Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    visible: { type: Boolean, value: false },
    code: { type: String, value: '' },
    /** "release" | "trial" | "develop"；默认 trial 让没正式发布的开发版也能跑 */
    envVersion: { type: String, value: 'trial' },
  },
  data: {
    src: '',
    failed: false,
  },
  observers: {
    'visible, code, envVersion': function (vis, code, env) {
      if (!vis || !code) return;
      this.setData({
        failed: false,
        src: qrcodeUrl(code, {
          page: 'pages/room/room',
          envVersion: env || 'trial',
          width: 280,
        }),
      });
    },
  },
  methods: {
    onClose() {
      this.triggerEvent('close', {});
    },
    onSheetTap(e) {
      e.stopPropagation && e.stopPropagation();
    },
    onError() {
      this.setData({ failed: true });
    },
  },
});
