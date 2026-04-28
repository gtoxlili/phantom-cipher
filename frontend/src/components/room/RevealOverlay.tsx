import { Show } from 'solid-js';
import clsx from 'clsx';
import { gameView, revealEvent } from '@/stores/game';
import * as s from './RevealOverlay.css';

export function RevealOverlay() {
  const isMine = () => revealEvent()?.guesserId === gameView().myId;
  const label = () => {
    const r = revealEvent();
    if (!r) return '';
    if (r.correct) {
      return isMine() ? '命中 // HIT!' : '被命中 // CRACKED';
    }
    return isMine() ? '失手 // MISS' : '失手 // MISSED';
  };

  return (
    <Show when={revealEvent()}>
      <div class={s.overlay}>
        <div class={clsx(s.text, revealEvent()!.correct && s.correct)}>
          <span>{label()}</span>
        </div>
      </div>
    </Show>
  );
}
