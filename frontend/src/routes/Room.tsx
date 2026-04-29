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
} from '@/stores/game';
import { actions } from '@/lib/api';
import { startGameStream } from '@/lib/ws';

/**
 * `/room/:code` 路由的入口组件——把房间码写进 store、自动 join、
 * 把 WS 拉起来。后面的 UI 全靠 store 驱动，没有 Context、没有
 * prop drilling。
 *
 * playerId 由 stores/identity.ts 在模块加载时就备好了：能拿到
 * localStorage 缓存的指纹就同步用，否则先 UUID 占位，FingerprintJS
 * 异步算完再悄悄 upgrade。
 *
 * `mounted` signal 卡一下 first paint，避免 sessionStorage 还没
 * 读出来就先闪一帧错误的分支（NamePrompt vs Board）。
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

  onMount(() => setMounted(true));

  // 等 myName + playerId 都就绪了再 join。playerId 头一次访问时
  // 是 UUID 兜底，~300ms 后会被 FingerprintJS 升级——这个 effect
  // 会在升级时再触发一次（pid 变了），但 joined=true 已经 short
  // circuit 掉重复 join。
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
