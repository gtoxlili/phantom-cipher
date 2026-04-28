'use client';

import * as s from './Sketch.css';

interface SketchProps {
  intensity?: 'normal' | 'subdued';
}

const NORMAL_OP = { halftoneTL: 0.18, halftoneBR: 0.10, streak1: 0.7, streak2: 0.7, streak3: 0.45, star1: 0.55, star2: 0.40, star3: 0.30 } as const;
const SUBDUED_OP = { halftoneTL: 0.10, halftoneBR: 0.06, streak1: 0.4, streak2: 0.4, streak3: 0.3, star1: 0.35, star2: 0.25, star3: 0.20 } as const;

export function Sketch({ intensity = 'normal' }: SketchProps) {
  const o = intensity === 'subdued' ? SUBDUED_OP : NORMAL_OP;
  return (
    <div className={s.sketch} aria-hidden="true">
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
    </div>
  );
}
