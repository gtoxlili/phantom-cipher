// WebSocket + MessagePack client. Replaces the SSE / EventSource
// path from the original lib/hooks/useGameStream.ts.
//
// On every state change the backend pre-serializes a single
// MessagePack frame and fans it out via Arc<Bytes>; the browser
// decodes it with `msgpackr.unpack()` and dispatches by tag.
//
// Auto-reconnect on close. EventSource auto-reconnects natively;
// raw WebSocket does not. Unbacked, a flaky cellular link or a
// proxy idle-timeout would silently drop the player into a stale-
// state tab with no recovery short of a manual reload. Reconnect
// uses an exponential-backoff with a 30s ceiling and a jitter so
// a thousand players reconnecting after a brief blip don't all
// pile onto the server in the same millisecond.

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
  let reconnectAttempt = 0;
  let teardown: (() => void) | null = null;

  function clearReconnect() {
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function close() {
    clearReconnect();
    if (socket) {
      // Listeners removed first so an in-flight close doesn't
      // schedule a new reconnect on top of the explicit teardown.
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        /* already closed */
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
    });
    ws.addEventListener('error', () => {
      // The error event fires before close; let close() handle
      // the reconnect scheduling.
      setConnected(false);
    });
    ws.addEventListener('close', (ev) => {
      setConnected(false);
      // 1000 (normal) and 1001 (going-away) are explicit closes —
      // typically our own teardown, the server shutting down, or
      // navigation. Reconnect on anything that isn't a clean exit.
      if (socket !== ws) return; // superseded by a newer connect
      socket = null;
      if (ev.code === 1000 || ev.code === 1001) return;
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
