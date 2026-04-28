import { gameView, revealEvent, selectedTile, setSelectedTile } from '@/stores/game';
import type { PublicPlayer } from '@/types';
import { PlayerRow } from './PlayerRow';

export function OpponentRow(props: { player: PublicPlayer }) {
  const v = gameView;

  const isCurrent = () => v().state?.currentPlayerId === props.player.id;
  const isPlayerHost = () => v().state?.hostId === props.player.id;
  // While the picker is open, drop the "tappable" affordance on every
  // tile — pulse, hover state, etc. The backdrop blocks taps anyway,
  // so visual urgency at this point is just background noise.
  const pickerOpen = () => !!selectedTile();
  const canTarget = () => v().canGuess && props.player.alive && !pickerOpen();

  return (
    <PlayerRow
      player={props.player}
      isMe={false}
      tiles={props.player.tiles.map((t) => ({
        id: t.id,
        color: t.color,
        revealed: t.revealed,
        number: t.number,
        joker: !!t.joker,
        pending: !!t.pending,
      }))}
      current={!!isCurrent()}
      host={!!isPlayerHost()}
      canTarget={canTarget()}
      selectedTileId={selectedTile()?.playerId === props.player.id ? selectedTile()!.tileId : null}
      reveal={revealEvent()}
      onTileTap={(tileId) => {
        if (canTarget()) setSelectedTile({ playerId: props.player.id, tileId });
      }}
    />
  );
}
