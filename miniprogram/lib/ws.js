/**
 * 微信小程序 WebSocket 客户端 —— 服务端推 msgpack 二进制帧，本端解码
 * 后按 tag 派发到 store。
 *
 * 跟 frontend/lib/ws.ts 行为对齐：
 *   - 指数退避 + ±25% jitter 重连；4000 不重连（同 pid 被新连接顶替）
 *   - 25s 心跳空文本帧扛 NAT / 反代 idle
 *   - 每次状态变更服务端只 msgpack 一帧；这边解出来按 t 派发
 *
 * wx.connectSocket 行为差异：
 *   - 同时只能开 5 个；Page 切换前必须 close
 *   - onMessage 的 ev.data 在二进制下就是 ArrayBuffer
 *   - 没有 readyState 直接读，要靠 SocketTask 的 onOpen/onClose 维护一个旗标
 *   - 不能调用 .send() 在 onOpen 之前——微信会抛错
 */

const store = require('./store');
const msgpack = require('./msgpack');
const { wsBase } = require('./api');

const RECONNECT_INITIAL_MS = 800;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 25000;

class GameStream {
  constructor() {
    this.task = null;
    this.open = false;
    this.reconnectAttempt = 0;
    this.reconnectTimer = 0;
    this.heartbeatTimer = 0;
    this.code = '';
    this.pid = '';
    this.alive = true;
  }

  start(code, pid) {
    this.alive = true;
    this.code = code;
    this.pid = pid;
    this._connect();
  }

  stop() {
    this.alive = false;
    this._clearReconnect();
    this._clearHeartbeat();
    this._closeTask();
    store.setConnected(false);
  }

  _clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = 0;
    }
  }
  _clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = 0;
    }
  }
  _closeTask() {
    if (this.task) {
      const t = this.task;
      this.task = null;
      this.open = false;
      try { t.close({ code: 1000 }); } catch (e) { /* ignore */ }
    }
  }

  _connect() {
    if (!this.alive || !this.code || !this.pid) return;
    const url = wsBase() + '/api/room/' + encodeURIComponent(this.code) + '/ws?pid=' + encodeURIComponent(this.pid);
    let task;
    try {
      task = wx.connectSocket({ url, fail: () => { this._scheduleReconnect(); } });
    } catch (e) {
      this._scheduleReconnect();
      return;
    }
    this.task = task;
    this.open = false;

    task.onOpen(() => {
      if (this.task !== task || !this.alive) return;
      this.open = true;
      this.reconnectAttempt = 0;
      store.setConnected(true);
      this._clearHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.task === task && this.open) {
          try { task.send({ data: '' }); } catch (e) { /* onClose 接管 */ }
        }
      }, HEARTBEAT_INTERVAL_MS);
    });

    task.onError(() => {
      if (this.task !== task) return;
      store.setConnected(false);
    });

    task.onClose((ev) => {
      if (this.task !== task) return;
      this.task = null;
      this.open = false;
      this._clearHeartbeat();
      store.setConnected(false);
      if (!this.alive) return;
      // 4000 = 服务端通知"被同 pid 新连接顶替"，不要重连
      if (ev && ev.code === 4000) return;
      this._scheduleReconnect();
    });

    task.onMessage((ev) => {
      const data = ev && ev.data;
      if (!(data instanceof ArrayBuffer)) return;
      let parsed;
      try {
        parsed = msgpack.decode(data);
      } catch (err) {
        console.error('msgpack decode failed', err);
        return;
      }
      if (!parsed || typeof parsed !== 'object') return;
      switch (parsed.t) {
        case 'p': store.setPublicState(parsed.d); break;
        case 'v': store.setPrivateState(parsed.d); break;
        case 'r': store.setReveal(parsed.d); break;
      }
    });
  }

  _scheduleReconnect() {
    if (!this.alive) return;
    this._clearReconnect();
    this.reconnectAttempt += 1;
    let base = RECONNECT_INITIAL_MS * Math.pow(2, this.reconnectAttempt - 1);
    if (base > RECONNECT_MAX_MS) base = RECONNECT_MAX_MS;
    const jitter = base * (0.75 + Math.random() * 0.5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = 0;
      if (!this.alive) return;
      this._connect();
    }, jitter);
  }
}

module.exports = { GameStream };
