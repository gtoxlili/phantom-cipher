'use client';

import { useAtomValue } from 'jotai';
import clsx from 'clsx';
import { gameViewAtom } from '@/lib/atoms';
import { useGameActions } from '@/lib/hooks/useGameActions';
import { Deck } from './Deck';
import * as s from './ActionZone.css';
import * as shared from './shared.css';

export function ActionZone() {
  const actions = useGameActions();
  const v = useAtomValue(gameViewAtom);

  if (!v.state) return null;

  if (v.state.phase === 'waiting') {
    if (v.isHost) {
      const ready = v.state.players.length >= 2;
      return (
        <section className={s.zone}>
          <button className={s.startBtn} disabled={!ready} onClick={actions.start} type="button">
            <span>{ready ? '开始 START ▶' : `WAITING ${v.state.players.length}/2`}</span>
          </button>
        </section>
      );
    }
    return (
      <section className={s.zone}>
        <div className={s.waitingMsg}>WAITING FOR HOST</div>
      </section>
    );
  }

  if (v.state.phase === 'ended') {
    const winner = v.state.players.find((p) => p.id === v.state!.winnerId);
    const won = !!v.myId && v.state.winnerId === v.myId;
    return (
      <section className={s.zone}>
        <div className={s.endPanel}>
          <div className={s.endCrown}>{won ? '★ ★ ★' : '· · ·'}</div>
          <div className={s.endText}>
            <span>{won ? 'YOU WIN' : winner ? `${winner.name.toUpperCase()} WINS` : 'GAME OVER'}</span>
          </div>
          {v.isHost ? (
            <button className={clsx(shared.btnPrimary, s.endResetBtn)} onClick={actions.reset} type="button">
              <span className={shared.skewInner}>再来一局 ▶</span>
            </button>
          ) : (
            <div className={s.endHint}>WAIT FOR HOST</div>
          )}
        </div>
      </section>
    );
  }

  if (v.phase === 'drawing' || v.phase === 'guessing' || v.phase === 'continuing') {
    return (
      <section className={s.zone}>
        <Deck count={v.deckCount} canDraw={v.canDraw} onDraw={actions.draw} />
        {v.phase === 'continuing' && v.isMyTurn && (
          <div className={s.continueGroup}>
            <button className={shared.btnPrimary} onClick={() => actions.decideContinue(true)} type="button">
              <span className={shared.skewInner}>继续 PRESS ON</span>
            </button>
            <button className={shared.btnSecondary} onClick={() => actions.decideContinue(false)} type="button">
              <span className={shared.skewInner}>收手 STOP</span>
            </button>
          </div>
        )}
      </section>
    );
  }

  return <section className={s.zone} />;
}
