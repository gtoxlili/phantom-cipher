import { css } from '@/styled-system/css';

export const stack = css({
  position: 'fixed',
  top: 'calc(80px + env(safe-area-inset-top, 0px))',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 80,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  alignItems: 'center',
  pointerEvents: 'none',
  maxWidth: '90vw',
});

export const toast = css({
  background: 'blood',
  color: 'paper',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  padding: '10px 18px',
  fontSize: '14px',
  letterSpacing: '0.04em',
  border: '2px solid var(--colors-paper)',
  boxShadow: '5px 5px 0 var(--colors-ink)',
  animation: 'slamIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
  textAlign: 'center',
  transform: 'skewX(-8deg)',
  pointerEvents: 'auto',
  cursor: 'pointer',
  '&::before': { content: '"⚠ "' },
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
});
