import { Show } from 'solid-js';
import clsx from 'clsx';
import { PlayIcon } from '@/components/icons';
import { gameView } from '@/stores/game';
import { actions } from '@/lib/api';
import type { Color } from '@/types';
import { Deck } from './Deck';
import * as deckCss from './Deck.css';
import * as s from './ActionZone.css';
import * as shared from './shared.css';

function DeckChoice(props: {
  blackCount: number;
  whiteCount: number;
  canDraw: boolean;
  onDraw: (color: Color) => void;
}) {
  return (
    <div class={deckCss.deckChoiceRow}>
      <div class={deckCss.deckChoiceHint}>
        {props.canDraw ? '· 选一堆抽 · CHOOSE A PILE ·' : '· 牌堆 · DRAW PILES ·'}
      </div>
      <div class={deckCss.deckPair}>
        <Deck color="black" count={props.blackCount} canDraw={props.canDraw} onDraw={() => props.onDraw('black')} />
        <Deck color="white" count={props.whiteCount} canDraw={props.canDraw} onDraw={() => props.onDraw('white')} />
      </div>
    </div>
  );
}

export function ActionZone() {

  return (
    <Show when={gameView().state}>
      <Show
        when={gameView().state!.phase !== 'waiting'}
        fallback={
          <Show
            when={gameView().isHost}
            fallback={
              <section class={s.zone}>
                <div class={s.waitingMsg}>WAITING FOR HOST</div>
              </section>
            }
          >
            {(() => {
              // Make explicit that any count between 2 and 4 is enough to start.
              const n = () => gameView().state!.players.length;
              const ready = () => n() >= 2;
              return (
                <section class={s.zone}>
                  <button class={s.startBtn} disabled={!ready()} onClick={() => actions.start()} type="button">
                    <span>
                      <Show
                        when={ready()}
                        fallback={`等待玩家 · ${n()}/2 · MIN 2`}
                      >
                        <span style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35em' }}>
                          开局 START · {n()} 玩家<PlayIcon size="0.85em" />
                        </span>
                      </Show>
                    </span>
                  </button>
                </section>
              );
            })()}
          </Show>
        }
      >
        <Show
          when={gameView().state!.phase === 'ended'}
          fallback={
            <Show
              when={
                gameView().phase === 'drawing' ||
                gameView().phase === 'placing' ||
                gameView().phase === 'guessing' ||
                gameView().phase === 'continuing'
              }
              fallback={<section class={s.zone} />}
            >
              <section class={s.zone}>
                <DeckChoice
                  blackCount={gameView().deckBlackCount}
                  whiteCount={gameView().deckWhiteCount}
                  canDraw={gameView().canDraw}
                  onDraw={(c) => actions.draw(c)}
                />
                <Show when={gameView().phase === 'continuing' && gameView().isMyTurn}>
                  <div class={s.continueGroup}>
                    <button class={shared.btnPrimary} onClick={() => actions.decideContinue(true)} type="button">
                      <span class={shared.skewInner}>继续 PRESS ON</span>
                    </button>
                    <button class={shared.btnSecondary} onClick={() => actions.decideContinue(false)} type="button">
                      <span class={shared.skewInner}>收手 STOP</span>
                    </button>
                  </div>
                </Show>
              </section>
            </Show>
          }
        >
          {(() => {
            const winner = () => gameView().state!.players.find((p) => p.id === gameView().state!.winnerId);
            const won = () => !!gameView().myId && gameView().state!.winnerId === gameView().myId;
            return (
              <section class={s.zone}>
                <div class={s.endPanel}>
                  <div class={s.endCrown}>{won() ? '★︎ ★︎ ★︎' : '· · ·'}</div>
                  <div class={s.endText}>
                    <span>
                      {won() ? 'YOU WIN' : winner() ? `${winner()!.name.toUpperCase()} WINS` : 'GAME OVER'}
                    </span>
                  </div>
                  <Show
                    when={gameView().isHost}
                    fallback={<div class={s.endHint}>WAIT FOR HOST</div>}
                  >
                    <button class={clsx(shared.btnPrimary, s.endResetBtn)} onClick={() => actions.reset()} type="button">
                      <span
                        class={shared.skewInner}
                        style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35em' }}
                      >
                        再来一局<PlayIcon size="0.85em" />
                      </span>
                    </button>
                  </Show>
                </div>
              </section>
            );
          })()}
        </Show>
      </Show>
    </Show>
  );
}
