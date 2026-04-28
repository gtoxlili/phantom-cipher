import { css } from '@/styled-system/css';

export const overlay = css({
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10, 10, 10, 0)',
  animation: 'revealOverlayFade 1.4s ease-out forwards',
});

export const text = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: 'clamp(56px, 18vw, 100px)',
  letterSpacing: '0.04em',
  color: 'paper',
  background: 'blood',
  padding: '14px 30px',
  border: '4px solid var(--colors-ink)',
  boxShadow: '10px 10px 0 var(--colors-ink), -3px -3px 0 var(--colors-paper)',
  transform: 'skewX(-10deg)',
  animation: 'burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, fadeOutDelayed 1.4s ease-out forwards',
  '& > span': { display: 'inline-block', transform: 'skewX(10deg)' },
});

export const correct = css({
  background: 'gold',
  color: 'ink',
  borderColor: 'ink',
  boxShadow: '10px 10px 0 var(--colors-blood), -3px -3px 0 var(--colors-ink)',
});
