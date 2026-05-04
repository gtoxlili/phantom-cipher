/**
 * 玩家身份 = 微信 openid。
 *
 * 流程：
 *   1. wx.login() 拿一个 5 分钟内有效的 code
 *   2. POST 到 /api/wx/login，后端用 appid + secret 调
 *      jscode2session 换出 openid
 *   3. openid 缓存到本地，下次启动直接用，避免每次 login
 *
 * openid 比之前的 UUID 强在：
 *   - 跨设备：同一个微信号在 iOS / Android 切换打开都是同一 openid
 *   - 跨重装：卸载小程序、清缓存重进，openid 还是它（绑死微信账号）
 *   - 服务端可信：通过微信官方接口换出，比客户端瞎给的 UUID 可靠
 *
 * 兜底：如果后端 503（WX_APPID 未配置）或 wx.login 自身失败，退回
 * UUID 模式让单机调试不被卡死，跟旧版兜底语义一致。
 */

const STORAGE_KEY = 'davinci-openid';
const FALLBACK_KEY = 'davinci-fp-id';
const store = require('./store');

function uuidV4() {
  let d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function apiBase() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.apiBase) return app.globalData.apiBase;
  } catch (e) { /* ignore */ }
  return 'https://cipher.gtio.work';
}

function wxLogin() {
  return new Promise((resolve) => {
    wx.login({
      success: (res) => resolve(res && res.code ? res.code : null),
      fail: () => resolve(null),
    });
  });
}

function exchangeCode(code) {
  return new Promise((resolve) => {
    wx.request({
      url: apiBase() + '/api/wx/login',
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { code },
      success: (res) => {
        const body = res && res.data;
        if (res.statusCode === 200 && body && body.ok && body.openid) {
          resolve(body.openid);
        } else {
          resolve(null);
        }
      },
      fail: () => resolve(null),
    });
  });
}

let cached = '';
let inflight = null;

function ensureIdentity() {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    // 1) 命中本地缓存的 openid，零等待
    try {
      const saved = wx.getStorageSync(STORAGE_KEY);
      if (saved) {
        cached = saved;
        store.setPlayerId(saved);
        return saved;
      }
    } catch (e) { /* ignore */ }

    // 2) wx.login() → 后端 jscode2session 换 openid
    const code = await wxLogin();
    if (code) {
      const openid = await exchangeCode(code);
      if (openid) {
        cached = openid;
        try { wx.setStorageSync(STORAGE_KEY, openid); } catch (e) { /* ignore */ }
        store.setPlayerId(openid);
        return openid;
      }
    }

    // 3) 兜底：单机调试或 WX_APPID 未配置时退回 UUID
    let id = '';
    try { id = wx.getStorageSync(FALLBACK_KEY) || ''; } catch (e) { /* ignore */ }
    if (!id) {
      id = uuidV4();
      try { wx.setStorageSync(FALLBACK_KEY, id); } catch (e) { /* ignore */ }
    }
    cached = id;
    store.setPlayerId(id);
    return id;
  })();
  return inflight;
}

function getCachedId() {
  return cached;
}

module.exports = { ensureIdentity, getCachedId };
