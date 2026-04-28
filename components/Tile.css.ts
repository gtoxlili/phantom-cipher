import { css } from '@/styled-system/css';

export const tile = css({
  position: 'relative',
  display: 'inline-block',
  flex: '0 0 auto',
  background: 'transparent',
  padding: 0,
  border: 'none',
  transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.18s',
  animationName: 'tileIn',
  animationDuration: '0.45s',
  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  animationFillMode: 'backwards',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  transform: 'rotate(-2deg)',
});

export const tappable = css({ cursor: 'pointer' });

export const svg = css({
  display: 'block',
  width: '100%',
  height: 'auto',
  aspectRatio: '80 / 112',
  filter: 'drop-shadow(2px 2px 0 var(--colors-blood))',
  position: 'relative',
  zIndex: 2,
});

export const shadow = css({
  position: 'absolute',
  top: '4px',
  left: '4px',
  right: '-4px',
  bottom: '-4px',
  background: 'ink',
  zIndex: 1,
  clipPath: 'polygon(5% 4%, 80% 4%, 95% 14%, 95% 96%, 5% 96%)',
});

export const numberText = css({
  fontFamily: 'display',
  fontWeight: 400,
  fontSize: '64px',
  fontStyle: 'italic',
  letterSpacing: '-0.02em',
  paintOrder: 'stroke fill',
});

export const questionText = css({
  fontFamily: 'display',
  fontWeight: 400,
  fontSize: '78px',
  fontStyle: 'italic',
});

export const size = {
  sm: css({ width: '36px' }),
  md: css({ width: '50px' }),
  lg: css({ width: '64px' }),
};

export const pending = css({
  transform: 'rotate(-1deg) translateY(-12px)',
  animation: 'tileIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards, pendingHover 1.6s ease-in-out 0.5s infinite',
});

export const pendingTag = css({
  position: 'absolute',
  top: '-14px',
  left: '50%',
  transform: 'translateX(-50%) skewX(-10deg)',
  background: 'blood',
  color: 'paper',
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '9px',
  padding: '2px 7px',
  letterSpacing: '0.16em',
  whiteSpace: 'nowrap',
  zIndex: 5,
  border: '1.5px solid var(--colors-ink)',
});

export const selected = css({
  transform: 'rotate(-1deg) translateY(-14px) scale(1.06)',
  animation: 'tileIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards, selectedShimmer 0.9s ease-in-out infinite',
});

export const selectedSvg = css({
  filter: 'drop-shadow(2px 2px 0 var(--colors-blood)) drop-shadow(0 0 6px var(--colors-blood))',
});

export const targetTag = css({
  position: 'absolute',
  top: '-16px',
  left: '50%',
  transform: 'translateX(-50%) skewX(-10deg)',
  background: 'ink',
  color: 'blood',
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '10px',
  padding: '2px 8px',
  letterSpacing: '0.18em',
  whiteSpace: 'nowrap',
  zIndex: 5,
  border: '1.5px solid var(--colors-blood)',
  animation: 'blink 0.9s ease-in-out infinite',
});

export const selectableHover = css({
  '&:active': {
    transform: 'rotate(-1deg) translateY(-6px) scale(0.97)',
  },
});

export const ownedHidden = css({
  opacity: 0.92,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '6px',
    left: '8px',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'blood',
    zIndex: 3,
    boxShadow: '0 0 4px rgba(230, 0, 34, 0.8)',
    animation: 'blink 1.5s ease-in-out infinite',
  },
});

export const flashCorrect = css({
  animation: 'flashCorrect 1.0s ease-out',
});

export const flashWrong = css({
  animation: 'flashWrong 0.7s ease-out',
});
