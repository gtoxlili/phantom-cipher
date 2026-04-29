// WebSocket + MessagePack 客户端。
//
// 服务端每次状态变更只 msgpack 一帧、Arc<Bytes> 扇出给所有订阅者；
// 这边 msgpackr.unpack 出来按 tag 派发到 publicState / privateState
// / reveal 三个 signal。
//
// 一定要自己写重连——浏览器原生 WebSocket 没有，断了就是死的。
// 用指数回退 + jitter 是为了：单个用户偶尔抖动很快恢复；服务端
// 重启时所有玩家不会在同一毫秒踩上去。

import { onCleanup, createEffect, on } from 'solid-js';
import { Unpackr } from 'msgpackr';
import {
  currentRoomCode,
  playerId,
  setConnected,
  setPrivateState,
  setPublicState,
  setReveal,
} from '@/stores/game';
import type { ServerEvent } from '@/types';

// `useRecords: false` keeps msgpackr off its compact "record"
// extension type so the wire format is portable with the Rust
// backend's standard map encoding.
const unpackr = new Unpackr({ useRecords: false });

const RECONNECT_INITIAL_MS = 800;
const RECONNECT_MAX_MS = 30_000;

// 心跳间隔。NAT / 反代的 idle 超时通常 30~60s 一刀切，挑 25s 比
// 大多数中间设备的下限再短一拍，足够让连接看起来"活的"。发送的是
// 空文本帧，服务端 run_ws 的读循环本来就 drain 掉所有非 close 的
// 帧，不需要后端配合做任何事。
const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Open a WebSocket to the active room and pipe inbound binary
 * frames into the corresponding Solid signals. The hook is
 * idempotent: re-running it (room or player change) tears down
 * the old socket cleanly. On unexpected disconnect, retries with
 * exponential backoff until the room/player tuple changes or the
 * component unmounts.
 */
export function startGameStream(ready: () => boolean) {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | undefined;
  let heartbeatTimer: number | undefined;
  let reconnectAttempt = 0;
  let teardown: (() => void) | null = null;

  function clearReconnect() {
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function clearHeartbeat() {
    if (heartbeatTimer !== undefined) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  function close() {
    clearReconnect();
    clearHeartbeat();
    if (socket) {
      // 先卸 listener 再 close——避免 in-flight 的 close 事件
      // 又触发一次重连，跟手动 teardown 撞车
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        // 已经关了
      }
      socket = null;
    }
    setConnected(false);
  }

  function connect(code: string, pid: string) {
    const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsScheme}//${window.location.host}/api/room/${encodeURIComponent(code)}/ws?pid=${encodeURIComponent(pid)}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    socket = ws;

    ws.addEventListener('open', () => {
      reconnectAttempt = 0;
      setConnected(true);
      // 连接稳定后才开始心跳。close 时统一清。
      clearHeartbeat();
      heartbeatTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          // 空文本帧——服务端 receive loop 会消费掉，反代/NAT 看到
          // 字节流不会判定 idle
          try {
            ws.send('');
          } catch {
            // 写失败说明连接已经死了，让 onclose 接管重连
          }
        }
      }, HEARTBEAT_INTERVAL_MS);
    });
    ws.addEventListener('error', () => {
      // error 事件会先于 close 触发，重连调度统一交给 onclose
      setConnected(false);
    });
    ws.addEventListener('close', (ev) => {
      setConnected(false);
      clearHeartbeat();
      if (socket !== ws) return;
      socket = null;
      // 4000 = 服务端明确通知"你的 subscriber 槽被同 pid 新连接顶替"
      // ——这种情况下重连只会跟另一个 tab 互相挤回去，所以不重连。
      // 其它所有情况（包括 1000/1001/1006/4001/4xxx）一律重连：
      // 我们这边主动调 close() 时已经把 onclose 解绑了，根本走不到
      // 这里；既然走到了 onclose 又不是 4000，就是真意外断开。
      if (ev.code === 4000) return;
      scheduleReconnect(code, pid);
    });
    ws.addEventListener('message', (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      let parsed: ServerEvent;
      try {
        parsed = unpackr.unpack(new Uint8Array(ev.data)) as ServerEvent;
      } catch (err) {
        console.error('msgpack decode failed', err);
        return;
      }
      switch (parsed.t) {
        case 'p':
          setPublicState(parsed.d);
          break;
        case 'v':
          setPrivateState(parsed.d);
          break;
        case 'r':
          setReveal(parsed.d);
          break;
      }
    });
  }

  function scheduleReconnect(code: string, pid: string) {
    clearReconnect();
    reconnectAttempt += 1;
    const base = Math.min(
      RECONNECT_INITIAL_MS * 2 ** (reconnectAttempt - 1),
      RECONNECT_MAX_MS,
    );
    // ±25% jitter so a synchronized server restart doesn't get
    // a tight thundering-herd reconnect.
    const jitter = base * (0.75 + Math.random() * 0.5);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      // Race-safe: only reconnect if we're still meant to be on
      // this room/pid (the createEffect below will otherwise have
      // already issued a fresh connect for the new tuple).
      if (currentRoomCode() === code && playerId() === pid) {
        connect(code, pid);
      }
    }, jitter) as unknown as number;
  }

  createEffect(
    on(
      () => [ready(), currentRoomCode(), playerId()] as const,
      ([r, code, pid]) => {
        // Tear down whatever's currently open before deciding what
        // to do with the new tuple.
        close();
        teardown = null;
        if (!r || !code || !pid) return;
        connect(code, pid);
        teardown = () => close();
      },
    ),
  );

  onCleanup(() => {
    teardown?.();
    teardown = null;
    setConnected(false);
  });
}
