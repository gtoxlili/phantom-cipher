'use client';

import { useAtomValue } from 'jotai';
import { gameViewAtom, revealAtom } from '@/lib/atoms';
import { PlayerRow } from './PlayerRow';

export function MyRow() {
  const v = useAtomValue(gameViewAtom);
  const reveal = useAtomValue(revealAtom);

  if (!v.me) return null;

  return (
    <PlayerRow
      player={v.me}
      isMe
      tiles={v.myHand.map((t) => ({
        id: t.id,
        color: t.color,
        revealed: t.revealed,
        number: t.number ?? undefined,
        joker: t.joker,
        pending: v.pendingTileId === t.id,
      }))}
      current={v.isMyTurn}
      host={v.isHost}
      canTarget={false}
      selectedTileId={null}
      reveal={reveal}
    />
  );
}
