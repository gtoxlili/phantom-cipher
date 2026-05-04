const { ensureIdentity } = require('./lib/identity');
const { fetchProfileForName } = require('./lib/api');
const store = require('./lib/store');

App({
  globalData: {
    apiBase: 'https://cipher.gtio.work',
    wsBase: 'wss://cipher.gtio.work',
  },

  onLaunch() {
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
