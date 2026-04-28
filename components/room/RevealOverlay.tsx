'use client';

import { useAtomValue } from 'jotai';
import clsx from 'clsx';
import { gameViewAtom, revealAtom } from '@/lib/atoms';
import * as s from './RevealOverlay.css';

export function RevealOverlay() {
  const reveal = useAtomValue(revealAtom);
  const { myId } = useAtomValue(gameViewAtom);
  if (!reveal) return null;

  const isMine = reveal.guesserId === myId;
  let label: string;
  if (reveal.correct) {
    label = isMine ? '命中 // HIT!' : '被命中 // CRACKED';
  } else {
    label = isMine ? '失手 // MISS' : '失手 // MISSED';
  }

  return (
    <div className={s.overlay}>
      <div className={clsx(s.text, reveal.correct && s.correct)}>
        <span>{label}</span>
      </div>
    </div>
  );
}
