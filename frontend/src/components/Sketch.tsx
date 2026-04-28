import { For } from 'solid-js';
import * as s from './Sketch.css';

interface SketchProps {
  intensity?: 'normal' | 'subdued';
}

const NORMAL_OP = { halftoneTL: 0.18, halftoneBR: 0.10, streak1: 0.7, streak2: 0.7, streak3: 0.45, star1: 0.55, star2: 0.40, star3: 0.30 } as const;
const SUBDUED_OP = { halftoneTL: 0.10, halftoneBR: 0.06, streak1: 0.4, streak2: 0.4, streak3: 0.3, star1: 0.35, star2: 0.25, star3: 0.20 } as const;

const ROMAN_RIGHT = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const ROMAN_LEFT = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

export function Sketch(props: SketchProps) {
  const opacities = () => (props.intensity === 'subdued' ? SUBDUED_OP : NORMAL_OP);
  return (
    <div class={s.sketch} aria-hidden="true">
      {/* base layers — visible on every viewport */}
      <div class={s.halftone.tl} style={{ opacity: opacities().halftoneTL }} />
      <div class={s.halftone.br} style={{ opacity: opacities().halftoneBR }} />
      <div class={s.streakWrap}>
        <div class={s.streak.one} style={{ opacity: opacities().streak1 }} />
        <div class={s.streak.two} style={{ opacity: opacities().streak2 }} />
        <div class={s.streak.three} style={{ opacity: opacities().streak3 }} />
      </div>
      <div class={s.starsWrap}>
        <span class={s.star.one} style={{ opacity: opacities().star1 }}>✦︎</span>
        <span class={s.star.two} style={{ opacity: opacities().star2 }}>✦︎</span>
        <span class={s.star.three} style={{ opacity: opacities().star3 }}>✶︎</span>
      </div>

      {/* desktop chrome — Persona 5 magazine ornaments, hidden below 768px */}
      <div class={s.desktopOnly}>
        <div class={s.tapeStripTop} />
        <div class={s.tapeStripBottom} />

        <span class={s.bigQuestion}>?</span>
        <span class={s.monogramTR}>達</span>

        <span class={s.verticalLeft}>
          {'· DA VINCI · CIPHER · TAKE THEIR HEART · EST · MMXXVI ·'}
        </span>
        <span class={s.verticalRight}>
          {'· CODICE · 達芬奇密碼 · I L  C O D I C E ·'}
        </span>

        <div class={s.romanStrip}>
          <For each={ROMAN_RIGHT as readonly string[]}>{(n) => <span>{n}</span>}</For>
        </div>
        <div class={s.romanStripLeft}>
          <For each={ROMAN_LEFT as readonly string[]}>{(n) => <span>{n}</span>}</For>
        </div>

        <div class={s.tileSilhouetteWrap}>
          <div class={s.tileSilhouette.one} />
          <div class={s.tileSilhouette.two} />
        </div>
      </div>
    </div>
  );
}
