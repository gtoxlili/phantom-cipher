import { css } from 'styled-system/css';

export const zone = css({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 14px',
  gap: '14px',
  background: 'ink',
  borderTop: '2px solid var(--colors-blood)',
  borderBottom: '2px solid var(--colors-blood)',
  minHeight: '100px',
  position: 'relative',
  zIndex: 1,
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    height: '2px',
    background: 'paper',
    left: 0,
    right: 0,
  },
  '&::before': { top: '5px' },
  '&::after': { bottom: '5px' },
});

export const startBtn = css({
  flex: 1,
  maxWidth: '280px',
  padding: '16px 24px',
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: '18px',
  fontStyle: 'italic',
  letterSpacing: '0.04em',
  background: 'blood',
  color: 'paper',
  border: '3px solid var(--colors-paper)',
  minHeight: '56px',
  transform: 'skewX(-8deg)',
  boxShadow: '5px 5px 0 var(--colors-paper)',
  transition: 'transform 0.1s, box-shadow 0.1s',
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
  '&:active': {
    transform: 'skewX(-8deg) translate(3px, 3px)',
    boxShadow: '2px 2px 0 var(--colors-paper)',
  },
  '&:disabled': {
    background: 'gray',
    color: 'rgba(250, 250, 243, 0.6)',
    boxShadow: '2px 2px 0 var(--colors-paper)',
  },
});

export const waitingMsg = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  letterSpacing: '0.22em',
  color: 'bone',
  fontSize: '13px',
  textTransform: 'uppercase',
  '&::before, &::after': {
    content: '"··"',
    color: 'blood',
    margin: '0 6px',
  },
});

export const continueGroup = css({
  display: 'flex',
  gap: '10px',
  flex: 1,
  maxWidth: '320px',
});

export const endPanel = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  padding: '4px 12px',
  flex: 1,
  maxWidth: '360px',
});

export const endCrown = css({
  fontFamily: 'display',
  fontSize: '24px',
  color: 'gold',
  lineHeight: 1,
  fontWeight: 400,
});

export const endText = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '24px',
  letterSpacing: '0.04em',
  color: 'paper',
  background: 'blood',
  padding: '4px 14px',
  border: '2px solid var(--colors-paper)',
  boxShadow: '4px 4px 0 var(--colors-ink)',
  transform: 'skewX(-8deg)',
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
});

export const endHint = css({
  fontFamily: 'condensed',
  fontStyle: 'italic',
  color: 'graySoft',
  fontSize: '12px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
});

export const endResetBtn = css({
  flex: 'none',
  padding: '12px 28px',
  minWidth: '200px',
  width: 'auto',
});
