// WebSocket + MessagePack client. Replaces the SSE/EventSource
// path from the original lib/hooks/useGameStream.ts.
//
// On every state change the backend pre-serializes a single
// MessagePack frame and fans it out via Arc<Bytes>; the browser
// decodes it with `msgpackr.unpack()` (zero-allocation streaming
// parser) and dispatches by tag.

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

// `Unpackr` is the streaming-safe decoder. We pass `useRecords:
// false` so msgpackr treats unknown structures as plain objects
// rather than its compact "record" extension type — keeps the
// payload portable with the Rust side, which emits standard
// MessagePack maps.
const unpackr = new Unpackr({ useRecords: false });

/**
 * Open a WebSocket to the active room and pipe inbound binary
 * frames into the corresponding Solid signals. The hook is
 * idempotent: re-running it (e.g. when the player re-joins a
 * different room) tears down the old socket cleanly.
 */
export function startGameStream(ready: () => boolean) {
  let socket: WebSocket | null = null;

  createEffect(
    on(
      () => [ready(), currentRoomCode(), playerId()] as const,
      ([r, code, pid]) => {
        socket?.close();
        socket = null;
        if (!r || !code || !pid) {
          setConnected(false);
          return;
        }
        const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(
          `${wsScheme}//${window.location.host}/api/room/${encodeURIComponent(code)}/ws?pid=${encodeURIComponent(pid)}`,
        );
        ws.binaryType = 'arraybuffer';

        ws.addEventListener('open', () => setConnected(true));
        ws.addEventListener('close', () => setConnected(false));
        ws.addEventListener('error', () => setConnected(false));
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

        socket = ws;
      },
    ),
  );

  onCleanup(() => {
    socket?.close();
    socket = null;
    setConnected(false);
  });
}
