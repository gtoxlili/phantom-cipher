import { For, Show } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import { spring } from '@motionone/dom';
import { gameView, selectedTile, setSelectedTile } from '@/stores/game';
import { actions } from '@/lib/api';
import * as s from './NumberPicker.css';

export function NumberPicker() {
  const op = () => {
    const sel = selectedTile();
    return sel ? gameView().opponents.find((p) => p.id === sel.playerId) : null;
  };
  const tile = () => {
    const sel = selectedTile();
    const o = op();
    return o && sel ? o.tiles.find((t) => t.id === sel.tileId) : null;
  };
  const visible = () => !!(selectedTile() && gameView().canGuess && op() && tile());

  const close = () => setSelectedTile(null);

  return (
    <Presence>
      <Show when={visible() && op() && tile() && selectedTile()}>
        {/*
         * Outer fade timed to outlast the inner spring slide so
         * solid-motionone's Presence doesn't unmount mid-animation.
         * Same trick as JokerPlacement; see the comment there.
         */}
        <Motion.div
          class={s.backdrop}
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42 }}
        >
          <Motion.div
            class={s.sheet}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            exit={{ y: '110%' }}
            transition={{ easing: spring({ stiffness: 360, damping: 32, mass: 0.7 }) }}
          >
            <div class={s.title}>
              <strong>{op()!.name.toUpperCase()}</strong>
              <span>第 {tile()!.position + 1} 张</span>
              <span class={tile()!.color === 'black' ? s.colorTag.black : s.colorTag.white}>
                {tile()!.color === 'black' ? '黑' : '白'}
              </span>
            </div>
            <div class={s.numberGrid}>
              <For each={Array.from({ length: 12 }, (_, i) => i)}>
                {(n) => (
                  // Motion wrapper handles entrance + tap feedback so the
                  // inner <button> retains its CSS `transform: skewX(-8deg)`.
                  <Motion.div
                    class={s.numBtnSlot}
                    initial={{ opacity: 0, scale: 0.6, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: 0.08 + n * 0.025,
                      easing: spring({ stiffness: 480, damping: 22 }),
                    }}
                    press={{ scale: 0.9 }}
                  >
                    <button
                      class={s.numBtn}
                      onClick={() => {
                        const sel = selectedTile()!;
                        actions.guess(sel.playerId, sel.tileId, n);
                      }}
                      type="button"
                    >
                      <span>{n}</span>
                    </button>
                  </Motion.div>
                )}
              </For>
            </div>
            <Motion.button
              class={s.jokerBtn}
              onClick={() => {
                const sel = selectedTile()!;
                actions.guess(sel.playerId, sel.tileId, null);
              }}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, easing: spring({ stiffness: 400, damping: 24 }) }}
              press={{ scale: 0.97 }}
            >
              <span class="dash" aria-hidden="true">
                <svg viewBox="0 0 32 32" width="28" height="28">
                  <path
                    transform="translate(1.5 2)"
                    fill="rgba(230,0,34,0.55)"
                    d="M 16 4 L 19 12 L 27 12 L 20 17 L 23 26 L 16 21 L 9 26 L 12 17 L 5 12 L 13 12 Z"
                  />
                  <path
                    fill="currentColor"
                    d="M 16 4 L 19 12 L 27 12 L 20 17 L 23 26 L 16 21 L 9 26 L 12 17 L 5 12 L 13 12 Z"
                  />
                </svg>
              </span>
              <span class="label">JOKER<em>赖子</em></span>
            </Motion.button>
            <button class={s.cancel} onClick={close} type="button">
              CANCEL ✕
            </button>
          </Motion.div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
