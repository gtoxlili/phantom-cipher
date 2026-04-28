import { css } from '@/styled-system/css';

export const backdrop = css({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(10, 10, 10, 0.78)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  animation: 'fadeIn 0.18s',
});

export const sheet = css({
  width: '100%',
  background: 'paper',
  color: 'ink',
  borderTop: '4px solid var(--colors-blood)',
  padding: '22px 16px max(22px, env(safe-area-inset-bottom, 0px))',
  boxShadow: '0 -8px 30px rgba(10, 10, 10, 0.6)',
  animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-4px',
    left: 0,
    right: 0,
    height: '4px',
    background: 'repeating-linear-gradient(-45deg, var(--colors-blood) 0, var(--colors-blood) 8px, var(--colors-ink) 8px, var(--colors-ink) 16px)',
  },
});

export const title = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '16px',
  textAlign: 'center',
  marginBottom: '18px',
  color: 'ink',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  flexWrap: 'wrap',
  letterSpacing: '0.02em',
  '&::before': {
    content: '"▶ TARGET ◀"',
    display: 'block',
    width: '100%',
    fontFamily: 'condensed',
    fontStyle: 'normal',
    fontSize: '11px',
    letterSpacing: '0.4em',
    color: 'blood',
    marginBottom: '6px',
  },
  '& strong': {
    fontFamily: 'cn',
    fontWeight: 900,
    color: 'blood',
    fontSize: '18px',
  },
});

const colorTagBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  fontSize: '12px',
  fontFamily: 'condensed',
  border: '2px solid var(--colors-ink)',
  fontWeight: 700,
  fontStyle: 'normal',
  transform: 'skewX(-10deg)',
} as const;

export const colorTag = {
  black: css({ ...colorTagBase, background: 'ink', color: 'paper' }),
  white: css({ ...colorTagBase, background: 'paper', color: 'ink' }),
};

export const numberGrid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '10px',
  marginBottom: '14px',
});

/** Layout cell for each number — motion wraps this so the button keeps its CSS skew. */
export const numBtnSlot = css({
  display: 'block',
  width: '100%',
});

export const numBtn = css({
  width: '100%',
  padding: '14px 0',
  fontFamily: 'display',
  fontSize: '32px',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'ink',
  background: 'paper',
  border: '3px solid var(--colors-ink)',
  minHeight: '62px',
  transition: 'transform 0.08s, background 0.1s, color 0.1s, box-shadow 0.1s',
  transform: 'skewX(-8deg)',
  boxShadow: '3px 3px 0 var(--colors-blood)',
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
  '&:active': {
    transform: 'skewX(-8deg) translate(2px, 2px)',
    background: 'blood',
    color: 'paper',
    boxShadow: '1px 1px 0 var(--colors-ink)',
  },
});

export const cancel = css({
  width: '100%',
  padding: '12px',
  fontFamily: 'condensed',
  letterSpacing: '0.22em',
  fontSize: '13px',
  color: 'ink',
  background: 'transparent',
  border: '2px solid var(--colors-ink)',
  textTransform: 'uppercase',
  fontWeight: 700,
  minHeight: '44px',
  transform: 'skewX(-4deg)',
  '&:active': { background: 'ink', color: 'paper' },
});
