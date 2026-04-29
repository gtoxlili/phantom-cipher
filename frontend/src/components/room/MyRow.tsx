import { Show } from 'solid-js';
import { gameView, revealEvent } from '@/stores/game';
import { PlayerRow } from './PlayerRow';

export function MyRow() {

  return (
    <Show when={gameView().me}>
      <PlayerRow
        player={gameView().me!}
        isMe
        tiles={gameView().myHand.map((t) => ({
          id: t.id,
          color: t.color,
          revealed: t.revealed,
          number: t.number ?? undefined,
          joker: t.joker,
          pending: gameView().pendingTileId === t.id,
        }))}
        current={gameView().isMyTurn}
        host={gameView().isHost}
        canTarget={false}
        selectedTileId={null}
        reveal={revealEvent()}
      />
    </Show>
  );
}
