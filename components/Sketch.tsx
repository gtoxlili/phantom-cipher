'use client';

import * as s from './Sketch.css';

interface SketchProps {
  intensity?: 'normal' | 'subdued';
}

const NORMAL_OP = { halftoneTL: 0.18, halftoneBR: 0.10, streak1: 0.7, streak2: 0.7, streak3: 0.45, star1: 0.55, star2: 0.40, star3: 0.30 } as const;
const SUBDUED_OP = { halftoneTL: 0.10, halftoneBR: 0.06, streak1: 0.4, streak2: 0.4, streak3: 0.3, star1: 0.35, star2: 0.25, star3: 0.20 } as const;

const ROMAN_RIGHT = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const ROMAN_LEFT = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

export function Sketch({ intensity = 'normal' }: SketchProps) {
  const o = intensity === 'subdued' ? SUBDUED_OP : NORMAL_OP;
  return (
    <div className={s.sketch} aria-hidden="true">
      {/* base layers — visible on every viewport */}
      <div className={s.halftone.tl} style={{ opacity: o.halftoneTL }} />
      <div className={s.halftone.br} style={{ opacity: o.halftoneBR }} />
      <div className={s.streakWrap}>
        <div className={s.streak.one} style={{ opacity: o.streak1 }} />
        <div className={s.streak.two} style={{ opacity: o.streak2 }} />
        <div className={s.streak.three} style={{ opacity: o.streak3 }} />
      </div>
      <div className={s.starsWrap}>
        <span className={s.star.one} style={{ opacity: o.star1 }}>✦</span>
        <span className={s.star.two} style={{ opacity: o.star2 }}>✦</span>
        <span className={s.star.three} style={{ opacity: o.star3 }}>✶</span>
      </div>

      {/* desktop chrome — Persona 5 magazine ornaments, hidden below 768px */}
      <div className={s.desktopOnly}>
        <div className={s.tapeStripTop} />
        <div className={s.tapeStripBottom} />

        <span className={s.bigQuestion}>?</span>
        <span className={s.monogramTR}>達</span>

        <span className={s.verticalLeft}>
          {'· DA VINCI · CIPHER · TAKE THEIR HEART · EST · MMXXVI ·'}
        </span>
        <span className={s.verticalRight}>
          {'· CODICE · 達芬奇密碼 · I L  C O D I C E ·'}
        </span>

        <div className={s.romanStrip}>
          {ROMAN_RIGHT.map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className={s.romanStripLeft}>
          {ROMAN_LEFT.map((n) => <span key={n}>{n}</span>)}
        </div>

        <div className={s.tileSilhouetteWrap}>
          <div className={s.tileSilhouette.one} />
          <div className={s.tileSilhouette.two} />
        </div>
      </div>
    </div>
  );
}
