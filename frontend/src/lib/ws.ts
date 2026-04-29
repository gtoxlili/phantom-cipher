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

// msgpackr 解码配置——这两个 flag 加起来才能正确处理我们的 wire。
//
// `useRecords: false`：不走 msgpackr 的 record 扩展类型，跟 Rust
// 端 rmp-serde 默认输出的标准 map 编码对齐。
//
// `int64AsNumber: true`：把 i64/u64 一律解成 Number 而不是 BigInt。
// rmp-serde 把 i64 时间戳编成 msgpack 64-bit 整数，msgpackr 默认
// 解出来是 BigInt，前端做 `deadline - Date.now()` 这种算术会撞
// "Cannot mix BigInt and other types"——这是 SYSTEM CRASH 弹窗的
// 实际肇事者。
//
// 转 Number 会不会丢精度：JS Number 精确表达 ±2^53 ≈ 9×10^15。
// 我们所有的 i64/u64 字段都人工验证过在范围内：
//   - ms epoch 时间戳 ~1.7×10^12  → 撑到公元 287,396 年才溢出
//   - matches.id / log_counter 自增 → 281 万亿条记录后才溢出
//   - matches_played/won、duration_ms、deck count、reveal number、
//     player tile position …                                 → 上千以内
// Stats 端点走 JSON（无 i64 类型，浏览器一律解 Number）也是同款
// 假设——本来就是同一边界。
//
// 哪天真塞了一个超过 2^53 的整数（雪花 ID、加密 nonce），需要回
// 来重审这条决策：要么把那个字段改 string，要么单独写个 unpacker
// 把这一个字段保留成 BigInt。
const unpackr = new Unpackr({ useRecords: false, int64AsNumber: true });

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
