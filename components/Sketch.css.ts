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
