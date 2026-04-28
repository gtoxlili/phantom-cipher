import type { NextRequest } from 'next/server';
import { cancelForfeit, scheduleForfeit } from '@/lib/disconnect-timers';
import { gameStore, sanitizeCode } from '@/lib/game-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const encoder = new TextEncoder();

const sse = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = sanitizeCode(rawCode);
  const playerId = req.nextUrl.searchParams.get('pid');
  if (!playerId) return new Response('missing pid', { status: 400 });

  const game = gameStore.get(code);
  if (!game) return new Response('room not found', { status: 404 });
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return new Response('not in room', { status: 403 });

  // The same pid is reconnecting (page refresh, network blip, or a
  // restart-rehydrate cycle) — abort any pending forfeit so the
  // player isn't kicked while their stream is reattaching.
  cancelForfeit(code, playerId);

  // Mark connected on the subscribe path. The action layer's
  // addPlayer() also flips this, but a same-pid reconnect goes
  // straight to SSE without re-running joinOrCreateRoom — which
  // matters most after a server restart, where rehydrate brings
  // every player back as connected=false.
  const wasConnected = player.connected;
  player.connected = true;

  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const unsubscribe = game.subscribe(playerId, (event) => {
        safeEnqueue(sse(event.type, event.data));
      });

      // If the connected flag actually flipped, broadcast so other
      // clients see this player come back online.
      if (!wasConnected) game.notify();

      // 15s heartbeat keeps proxies from closing the pipe.
      heartbeat = setInterval(() => safeEnqueue(encoder.encode(': ping\n\n')), 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        game.markDisconnected(playerId);
        // Schedule the AFK forfeit BEFORE cleanup — if the room
        // turns out to be empty, gameStore.cleanup will drop it,
        // and the timer becomes a harmless no-op when it fires
        // (leaveRoom on a missing room is an `ok` result).
        scheduleForfeit(code, playerId);
        gameStore.cleanup(code);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
