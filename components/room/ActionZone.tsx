'use client';

import { useAtomValue } from 'jotai';
import clsx from 'clsx';
import { gameViewAtom } from '@/lib/atoms';
import { useGameActions } from '@/lib/hooks/useGameActions';
import type { Color } from '@/lib/types';
import { Deck } from './Deck';
import * as deckCss from './Deck.css';
import * as s from './ActionZone.css';
import * as shared from './shared.css';

function DeckChoice({
  blackCount,
  whiteCount,
  canDraw,
  onDraw,
}: {
  blackCount: number;
  whiteCount: number;
  canDraw: boolean;
  onDraw: (color: Color) => void;
}) {
  return (
    <div className={deckCss.deckChoiceRow}>
      <div className={deckCss.deckChoiceHint}>
        {canDraw ? '· 选一堆抽 · CHOOSE A PILE ·' : '· 牌堆 · DRAW PILES ·'}
      </div>
      <div className={deckCss.deckPair}>
        <Deck color="black" count={blackCount} canDraw={canDraw} onDraw={() => onDraw('black')} />
        <Deck color="white" count={whiteCount} canDraw={canDraw} onDraw={() => onDraw('white')} />
      </div>
    </div>
  );
}

export function ActionZone() {
  const actions = useGameActions();
  const v = useAtomValue(gameViewAtom);

  if (!v.state) return null;

  if (v.state.phase === 'waiting') {
    if (v.isHost) {
      const n = v.state.players.length;
      const ready = n >= 2;
      // Make explicit that any count between 2 and 4 is enough to start.
      const label = ready
        ? `开局 START · ${n} 玩家 ▶`
        : `等待玩家 · ${n}/2 · MIN 2`;
      return (
        <section className={s.zone}>
          <button className={s.startBtn} disabled={!ready} onClick={actions.start} type="button">
            <span>{label}</span>
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

  if (v.phase === 'drawing' || v.phase === 'placing' || v.phase === 'guessing' || v.phase === 'continuing') {
    return (
      <section className={s.zone}>
        <DeckChoice
          blackCount={v.deckBlackCount}
          whiteCount={v.deckWhiteCount}
          canDraw={v.canDraw}
          onDraw={actions.draw}
        />
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
