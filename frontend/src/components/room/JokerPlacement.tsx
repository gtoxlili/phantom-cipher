import { For, Show } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import { spring } from '@motionone/dom';
import { Tile } from '@/components/Tile';
import { gameView } from '@/stores/game';
import { actions } from '@/lib/api';
import * as s from './JokerPlacement.css';

/**
 * Bottom sheet shown during the 'placing' phase: the current player picks
 * an insertion index for the joker they just drew. The pending joker is
 * already in `myHand` (parked at the end by the server), so we render the
 * rest of the hand and drop a `+` slot before each tile and after the last.
 */
export function JokerPlacement() {
  const v = gameView;

  const visible = () => v().phase === 'placing' && v().isMyTurn && !!v().pendingTileId;
  const pending = () =>
    visible() ? v().myHand.find((t) => t.id === v().pendingTileId) : undefined;
  const others = () =>
    visible() ? v().myHand.filter((t) => t.id !== v().pendingTileId) : [];
  const slots = () =>
    Array.from({ length: others().length + 1 }, (_, i) => i);

  return (
    <Presence>
      <Show when={visible() && pending()}>
        {/*
         * solid-motionone's <Presence> only awaits motioncomplete on
         * its outermost Motion child. When the outer (backdrop fade)
         * completes faster than the inner (sheet slide-down spring),
         * the inner gets cut off mid-animation. The fix: time the
         * outer's exit to outlast the inner's spring settle (~0.4s
         * for the parameters below) so Presence stays mounted long
         * enough for both to finish. The fade itself reads slightly
         * gentler than the original 0.18s — a fair trade for the
         * exit motion playing through.
         */}
        <Motion.div
          class={s.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42 }}
        >
          <Motion.div
            class={s.sheet}
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            exit={{ y: '110%' }}
            transition={{ easing: spring({ stiffness: 360, damping: 32, mass: 0.7 }) }}
          >
            <div class={s.subtitle}>▶︎ JOKER · 赖子待放置 ◀︎</div>
            <div class={s.title}>
              选个位置 — <strong>把赖子塞进去</strong>
            </div>
            <div class={s.preview}>
              <div style={{ width: '70px' }}>
                <Tile color={pending()!.color} joker number={undefined} size="lg" />
              </div>
            </div>
            <div class={s.handRow}>
              <For each={slots()}>
                {(pos) => (
                  <Motion.div
                    style={{ display: 'inline-flex', 'align-items': 'flex-end', gap: '4px' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1 + pos * 0.04,
                      easing: spring({ stiffness: 460, damping: 24 }),
                    }}
                  >
                    <button
                      class={s.slot}
                      type="button"
                      aria-label={`放在第 ${pos + 1} 位`}
                      onClick={() => actions.placeJoker(pos)}
                    />
                    <Show when={pos < others().length}>
                      <div class={s.tileWrap} style={{ width: '50px' }}>
                        <Tile
                          color={others()[pos].color}
                          number={others()[pos].number ?? undefined}
                          joker={others()[pos].joker}
                          ownedHidden={!others()[pos].revealed}
                          ownedExposed={others()[pos].revealed}
                          size="md"
                          index={pos}
                        />
                      </div>
                    </Show>
                  </Motion.div>
                )}
              </For>
            </div>
            <div class={s.hint}>tap a slot · 点击空位放置</div>
          </Motion.div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
