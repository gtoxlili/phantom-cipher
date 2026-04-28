import { createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { NamePromptView } from '@/components/room/NamePromptView';
import { RoomBoard } from '@/components/room/RoomBoard';
import {
  intentHost,
  myName,
  needName,
  playerId,
  setCurrentRoomCode,
  setIntentHost,
  setPlayerId,
} from '@/stores/game';
import { actions } from '@/lib/api';
import { startGameStream } from '@/lib/ws';

/**
 * Combined entry point for `/room/:code`. The active room code, player
 * id, and join state all live in module-level Solid stores — no React
 * context, no prop drilling.
 *
 * Mount-gated because the NamePrompt-vs-Board branch reads from
 * sessionStorage-backed signals, which are populated synchronously from
 * sessionStorage on import. The mount gate keeps the visible branch
 * decision deferred to a tick after onMount so any URL-driven side
 * effects (like persisting the room code) are in flight first — same
 * intent as the original Next.js hydration gate.
 */
export default function Room() {
  const params = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [joined, setJoined] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);

  // Publish the active room code to the store; clear on route exit.
  createEffect(() => {
    setCurrentRoomCode(params.code.toUpperCase().slice(0, 6));
  });
  onCleanup(() => setCurrentRoomCode(''));

  // Stable per-tab UUID. The id is persisted in sessionStorage via the
  // store's initialiser; this effect just guarantees it's populated.
  onMount(() => {
    if (!playerId()) setPlayerId(crypto.randomUUID());
    setMounted(true);
  });

  // Fire the join action when both name & pid are ready. The `on(...,
  // {defer: true})` would let us run on subsequent changes only; here
  // we want the first tick after both are present, so we gate with
  // `joined`.
  createEffect(
    on(
      () => [myName(), playerId(), joined()] as const,
      async ([name, pid, isJoined]) => {
        if (!name || !pid || isJoined) return;
        await actions.join(name, intentHost());
        setJoined(true);
        if (intentHost()) setIntentHost(false);
      },
    ),
  );

  // Pipe inbound state pushes from the server into the stores. The hook
  // is idempotent: if joined toggles, the WebSocket is rebuilt cleanly.
  startGameStream(() => joined());

  return (
    <Show when={mounted()}>
      <Show
        when={needName()}
        fallback={<RoomBoard onExit={() => navigate('/')} />}
      >
        <NamePromptView onCancel={() => navigate('/')} />
      </Show>
    </Show>
  );
}
