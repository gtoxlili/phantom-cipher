'use client';

import { useAtomValue } from 'jotai';
import { gameViewAtom } from '@/lib/atoms';
import { OpponentRow } from './OpponentRow';
import { WaitingHint } from './WaitingHint';

export function OpponentsList() {
  const { opponents, phase } = useAtomValue(gameViewAtom);

  if (opponents.length === 0 && phase === 'waiting') return <WaitingHint />;
  return (
    <>
      {opponents.map((p) => (
        <OpponentRow key={p.id} player={p} />
      ))}
    </>
  );
}
