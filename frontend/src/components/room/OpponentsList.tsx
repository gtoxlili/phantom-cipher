import { Show } from 'solid-js';
import { Key } from '@solid-primitives/keyed';
import { gameView } from '@/stores/game';
import { OpponentRow } from './OpponentRow';
import { WaitingHint } from './WaitingHint';

export function OpponentsList() {
  return (
    <Show
      when={!(gameView().opponents.length === 0 && gameView().phase === 'waiting')}
      fallback={<WaitingHint />}
    >
      {/* `Key` keeps row instances stable across state pushes — without
          it, every server push would replace the player objects and `For`
          would treat the list as wholly new, replaying entrance animations
          on every tile. */}
      <Key each={gameView().opponents} by="id">
        {(player) => <OpponentRow player={player()} />}
      </Key>
    </Show>
  );
}
