import { css } from '@/styled-system/css';

export const sketch = css({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
});

const halftoneBase = {
  position: 'absolute',
  width: '60vw',
  height: '60vw',
  backgroundImage: 'radial-gradient(circle at 50% 50%, var(--colors-blood) 1.5px, transparent 1.6px)',
  backgroundSize: '8px 8px',
  mixBlendMode: 'screen',
} as const;

export const halftone = {
  tl: css({
    ...halftoneBase,
    top: '-22vw',
    left: '-22vw',
    maskImage: 'radial-gradient(circle at 30% 30%, black 30%, transparent 70%)',
    WebkitMaskImage: 'radial-gradient(circle at 30% 30%, black 30%, transparent 70%)',
  }),
  br: css({
    ...halftoneBase,
    bottom: '-22vw',
    right: '-22vw',
    maskImage: 'radial-gradient(circle at 70% 70%, black 30%, transparent 70%)',
    WebkitMaskImage: 'radial-gradient(circle at 70% 70%, black 30%, transparent 70%)',
  }),
};

export const streakWrap = css({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
});

const streakBase = {
  position: 'absolute',
  background: 'blood',
  filter: 'blur(0.5px)',
  animationName: 'streakRun',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  width: '56vw',
  left: '-60vw',
} as const;

export const streak = {
  one: css({ ...streakBase, top: '18%', height: '2px', animationDelay: '0s', animationDuration: '5.4s' }),
  two: css({ ...streakBase, top: '62%', height: '6px', animationDelay: '1.6s', animationDuration: '4.2s' }),
  three: css({ ...streakBase, top: '84%', height: '1px', animationDelay: '0.8s', animationDuration: '6.0s' }),
};

export const starsWrap = css({
  position: 'absolute',
  inset: 0,
});

const starBase = {
  position: 'absolute',
  fontFamily: 'display',
  color: 'blood',
  animationName: 'spin',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  display: 'inline-block',
} as const;

export const star = {
  one: css({ ...starBase, top: '8%', right: '8%', fontSize: '28px', animationDuration: '9s' }),
  two: css({ ...starBase, bottom: '12%', left: '8%', fontSize: '18px', animationDuration: '7s' }),
  three: css({
    ...starBase,
    top: '38%',
    right: '18%',
    fontSize: '14px',
    animationDuration: '11s',
    color: 'gold',
  }),
};

/* ============================================================
 * DESKTOP ORNAMENTS — only above 768px. Fills the empty space
 * around the centered mobile viewport with Persona-style chrome.
 * ============================================================ */

export const desktopOnly = css({
  display: { base: 'none', md: 'contents' },
});

/** Huge italic "?" watermark in the bottom-right of the viewport. */
export const bigQuestion = css({
  position: 'absolute',
  bottom: '-4vh',
  right: '-2vw',
  fontFamily: 'display',
  fontSize: 'clamp(280px, 36vw, 640px)',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'transparent',
  WebkitTextStroke: '3px var(--colors-blood)',
  opacity: 0.18,
  lineHeight: 0.8,
  letterSpacing: '-0.05em',
  transform: 'rotate(8deg)',
  pointerEvents: 'none',
});

/** Big stylized monogram in the top-right corner. */
export const monogramTR = css({
  position: 'absolute',
  top: '6vh',
  right: '4vw',
  fontFamily: 'cn',
  fontSize: 'clamp(120px, 14vw, 240px)',
  fontStyle: 'italic',
  fontWeight: 900,
  color: 'transparent',
  WebkitTextStroke: '2px var(--colors-paper)',
  opacity: 0.06,
  letterSpacing: '-0.04em',
  lineHeight: 0.9,
  transform: 'rotate(-4deg)',
});

/** Vertical text strips along the side gutters. */
const verticalTextBase = {
  position: 'absolute',
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.6em',
  color: 'rgba(230, 0, 34, 0.55)',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  writingMode: 'vertical-rl',
  textOrientation: 'mixed' as const,
  pointerEvents: 'none',
} as const;

export const verticalLeft = css({
  ...verticalTextBase,
  left: '2vw',
  top: '50%',
  transform: 'translateY(-50%) rotate(180deg)',
});

export const verticalRight = css({
  ...verticalTextBase,
  right: '2vw',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'rgba(250, 250, 243, 0.18)',
});

/** Roman numeral strip — like a tarot index. */
export const romanStrip = css({
  position: 'absolute',
  top: '50%',
  right: '6vw',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '20px',
  color: 'rgba(255, 210, 0, 0.4)',
  letterSpacing: '0.08em',
  '& span': {
    transform: 'skewX(-10deg)',
    paddingLeft: '8px',
    borderLeft: '1px solid rgba(255, 210, 0, 0.4)',
  },
});

export const romanStripLeft = css({
  position: 'absolute',
  top: '50%',
  left: '6vw',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '14px',
  color: 'rgba(230, 0, 34, 0.30)',
  letterSpacing: '0.08em',
  alignItems: 'flex-end',
  '& span': {
    transform: 'skewX(-10deg)',
    paddingRight: '8px',
    borderRight: '1px solid rgba(230, 0, 34, 0.30)',
  },
});

/** Diagonal red "tape" strip across the top-right corner. */
export const tapeStripTop = css({
  position: 'absolute',
  top: '8vh',
  left: '-10vw',
  width: '40vw',
  height: '6px',
  background: 'blood',
  transform: 'rotate(-22deg)',
  opacity: 0.6,
});

export const tapeStripBottom = css({
  position: 'absolute',
  bottom: '12vh',
  right: '-10vw',
  width: '40vw',
  height: '4px',
  background: 'paper',
  transform: 'rotate(-22deg)',
  opacity: 0.20,
});

/** Floating tile silhouettes. */
export const tileSilhouetteWrap = css({
  position: 'absolute',
  inset: 0,
});

const tileSilhouetteBase = {
  position: 'absolute',
  width: '90px',
  height: '126px',
  border: '3px solid rgba(230, 0, 34, 0.28)',
  background: 'transparent',
  clipPath: 'polygon(5% 4%, 80% 4%, 95% 14%, 95% 96%, 5% 96%)',
} as const;

export const tileSilhouette = {
  one: css({
    ...tileSilhouetteBase,
    top: '12vh',
    left: '6vw',
    transform: 'rotate(-18deg)',
  }),
  two: css({
    ...tileSilhouetteBase,
    bottom: '14vh',
    right: '7vw',
    transform: 'rotate(14deg)',
    width: '70px',
    height: '98px',
  }),
};
