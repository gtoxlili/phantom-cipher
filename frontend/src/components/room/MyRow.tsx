import { Show } from 'solid-js';
import { gameView, revealEvent } from '@/stores/game';
import { PlayerRow } from './PlayerRow';

export function MyRow() {
  const v = gameView;

  return (
    <Show when={v().me}>
      <PlayerRow
        player={v().me!}
        isMe
        tiles={v().myHand.map((t) => ({
          id: t.id,
          color: t.color,
          revealed: t.revealed,
          number: t.number ?? undefined,
          joker: t.joker,
          pending: v().pendingTileId === t.id,
        }))}
        current={v().isMyTurn}
        host={v().isHost}
        canTarget={false}
        selectedTileId={null}
        reveal={revealEvent()}
      />
    </Show>
  );
}
