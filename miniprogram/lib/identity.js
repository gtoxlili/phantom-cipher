/**
 * 玩家身份（visitor_id 等价物）。
 *
 * 微信小程序里没法跑 inf-fingerprint（没 wasm、没 navigator.fonts API），
 * 也不打算上 wx.login + openid（那是另一套账号体系，跟服务端 player_id
 * 不通）。退化成最直白的方案：本地存一个 UUID v4，跨多次启动稳定。
 *
 * 缺陷 vs frontend：
 *   - 不能跨设备识别（浏览器 fingerprint 也不行，影响一致）
 *   - 卸载小程序、清缓存即丢身份，会被服务端当成新玩家
 *   - 这个 ID 未来也无法通过服务端贝叶斯匹配跟同一个浏览器的玩家归并
 *
 * 接受这些权衡——小程序生态本身依赖 wx.login 才能跨设备认人，再做一层
 * fingerprint 价值很低。
 */

const STORAGE_KEY = 'davinci-fp-id';
const store = require('./store');

function uuidV4() {
  // 不调用 wx.getRandomValues —— Skyline 下 worker 可能没暴露
  // crypto；用 Math.random + 时间戳混合够强了，反正不是密码学用途。
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

let cached = '';
let inflight = null;

function ensureIdentity() {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = new Promise((resolve) => {
    let id = '';
    try { id = wx.getStorageSync(STORAGE_KEY) || ''; } catch (e) { /* ignore */ }
    if (!id) {
      id = uuidV4();
      try { wx.setStorageSync(STORAGE_KEY, id); } catch (e) { /* ignore */ }
    }
    cached = id;
    store.setPlayerId(id);
    resolve(id);
  });
  return inflight;
}

function getCachedId() {
  return cached;
}

module.exports = { ensureIdentity, getCachedId };
