const { ensureIdentity } = require('./lib/identity');
const { fetchProfileForName } = require('./lib/api');
const { registerRoutes } = require('./lib/routes');
const { loadAll: loadFonts } = require('./lib/fonts');
const store = require('./lib/store');

App({
  globalData: {
    apiBase: 'https://cipher.gtio.work',
    wsBase: 'wss://cipher.gtio.work',
  },

  onLaunch() {
    // 注册 P5 斩入风格的自定义路由 —— 跨 Skyline 页面生效
    registerRoutes();
    // 加载和 web 端一致的拉丁字体 —— scope:'global' 跨页面生效，
    // 失败时由 font-family fallback 链里的系统字体兜底
    loadFonts();
    // Boot the visitor identity ASAP — Room page join() depends on it.
    ensureIdentity().then((pid) => {
      if (!pid) return;
      // 复用 frontend/profile.ts 的逻辑：拿到 pid 之后，如果用户还没有
      // 存过名字就尝试从服务端拉一个旧的 display_name 预填
      const cachedName = wx.getStorageSync('davinci-name');
      if (cachedName) return;
      fetchProfileForName(pid).then((name) => {
        if (!name) return;
        if (wx.getStorageSync('davinci-name')) return;
        wx.setStorageSync('davinci-name', name);
        store.setMyName(name);
      });
    });
  },
});
