import { css } from '@/styled-system/css';

export const deckGroup = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
});

export const deck = css({
  position: 'relative',
  width: '56px',
  height: '80px',
  background: 'transparent',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.18s',
});

export const deckActive = css({
  animation: 'deckPulse 1.0s ease-in-out infinite',
  '&:active': { transform: 'scale(0.92) rotate(-3deg)' },
});

export const deckEmpty = css({
  opacity: 0.36,
  filter: 'grayscale(0.7)',
});

export const deckStack = css({
  position: 'relative',
  width: '100%',
  height: '100%',
});

export const deckCard = css({
  position: 'absolute',
  inset: 0,
  transition: 'transform 0.18s',
});

export const deckSvg = css({
  width: '100%',
  height: '100%',
});

export const deckMonogram = css({
  fontFamily: 'display',
});

export const deckCount = css({
  position: 'absolute',
  bottom: '-8px',
  right: '-10px',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '16px',
  background: 'blood',
  color: 'paper',
  border: '2px solid var(--colors-paper)',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 400,
  zIndex: 5,
  transform: 'skewX(-10deg)',
  '& > span': { transform: 'skewX(10deg)' },
});

export const deckLabel = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '10px',
  letterSpacing: '0.22em',
  color: 'blood',
  textTransform: 'uppercase',
  marginTop: '6px',
});
