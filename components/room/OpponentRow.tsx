'use client';

import { useAtom, useAtomValue } from 'jotai';
import { gameViewAtom, revealAtom, selectedTileAtom } from '@/lib/atoms';
import type { PublicPlayer } from '@/lib/types';
import { PlayerRow } from './PlayerRow';

export function OpponentRow({ player }: { player: PublicPlayer }) {
  const v = useAtomValue(gameViewAtom);
  const reveal = useAtomValue(revealAtom);
  const [selectedTile, setSelectedTile] = useAtom(selectedTileAtom);

  const isCurrent = v.state?.currentPlayerId === player.id;
  const isPlayerHost = v.state?.hostId === player.id;
  const canTarget = v.canGuess && player.alive;

  return (
    <PlayerRow
      player={player}
      isMe={false}
      tiles={player.tiles.map((t) => ({
        id: t.id,
        color: t.color,
        revealed: t.revealed,
        number: t.number,
        pending: !!t.pending,
      }))}
      current={!!isCurrent}
      host={!!isPlayerHost}
      canTarget={canTarget}
      selectedTileId={selectedTile?.playerId === player.id ? selectedTile.tileId : null}
      reveal={reveal}
      onTileTap={(tileId) => {
        if (canTarget) setSelectedTile({ playerId: player.id, tileId });
      }}
    />
  );
}
