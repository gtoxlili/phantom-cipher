/**
 * REST 客户端 —— 直接调用 cipher.gtio.work 上的后端，跟 frontend/lib/api.ts
 * 的语义一一对应。
 *
 * 注意：要在微信公众平台 / 后台 → 开发管理 → 服务器域名 里把
 *   request 合法域名:    https://cipher.gtio.work
 *   socket 合法域名:     wss://cipher.gtio.work
 * 都加进去，否则正式版会被微信拦下。开发版可在工具里勾"不校验合法域名"。
 */

const store = require('./store');

function apiBase() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.apiBase) return app.globalData.apiBase;
  } catch (e) { /* ignore */ }
  return 'https://cipher.gtio.work';
}

function wsBase() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.wsBase) return app.globalData.wsBase;
  } catch (e) { /* ignore */ }
  return 'wss://cipher.gtio.work';
}

function post(path, body) {
  return new Promise((resolve) => {
    wx.request({
      url: apiBase() + path,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: body,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data || { ok: false, error: '空响应' });
        } else {
          resolve({ ok: false, error: 'HTTP ' + res.statusCode });
        }
      },
      fail: (err) => {
        resolve({ ok: false, error: (err && err.errMsg) ? err.errMsg : '请求失败' });
      },
    });
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiBase() + path,
      method: 'GET',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: (err) => reject(err),
    });
  });
}

function ready() {
  const s = store.getState();
  return !!s.currentRoomCode && !!s.playerId;
}

function report(res) {
  if (!res || res.ok === false) {
    if (res && res.error) store.pushNotification(res.error);
  }
  return res;
}

function url(verb) {
  const code = encodeURIComponent(store.getState().currentRoomCode);
  return '/api/room/' + code + '/' + verb;
}

const actions = {
  async join(name, asHost) {
    if (!ready()) return;
    const pid = store.getState().playerId;
    const res = await post(url('join'), { playerId: pid, name, asHost: !!asHost });
    return report(res);
  },
  async start() {
    if (!ready()) return;
    return report(await post(url('start'), { playerId: store.getState().playerId }));
  },
  async draw(color) {
    if (!ready()) return;
    return report(await post(url('draw'), { playerId: store.getState().playerId, color }));
  },
  async guess(targetPlayerId, tileId, number) {
    if (!ready()) return;
    store.setSelectedTile(null);
    return report(await post(url('guess'), {
      playerId: store.getState().playerId,
      targetPlayerId,
      tileId,
      number,
    }));
  },
  async placeJoker(position) {
    if (!ready()) return;
    return report(await post(url('place-joker'), {
      playerId: store.getState().playerId,
      position,
    }));
  },
  async decideContinue(cont) {
    if (!ready()) return;
    return report(await post(url('continue'), {
      playerId: store.getState().playerId,
      continue: !!cont,
    }));
  },
  async reset() {
    if (!ready()) return;
    return report(await post(url('reset'), { playerId: store.getState().playerId }));
  },
  async leave() {
    if (!ready()) return;
    return post(url('leave'), { playerId: store.getState().playerId });
  },
};

async function fetchProfileForName(pid) {
  try {
    const profile = await get('/api/players/' + encodeURIComponent(pid));
    if (profile && profile.display_name) return profile.display_name;
    return null;
  } catch (e) { return null; }
}

async function fetchStats(leaderboard, recent) {
  return get('/api/stats?leaderboard=' + (leaderboard || 20) + '&recent=' + (recent || 20));
}

module.exports = {
  apiBase,
  wsBase,
  actions,
  fetchProfileForName,
  fetchStats,
};
