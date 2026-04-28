import { css } from '@/styled-system/css';

export const header = css({
  position: 'relative',
  zIndex: 3,
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'max(8px, env(safe-area-inset-top, 0px)) 12px 8px',
  background: 'ink',
  borderBottom: '3px solid var(--colors-blood)',
  gap: '8px',
  minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
});

export const iconBtn = css({
  width: '42px',
  height: '42px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid var(--colors-paper)',
  color: 'paper',
  background: 'ink',
  flexShrink: 0,
  transform: 'skewX(-8deg)',
  boxShadow: '3px 3px 0 var(--colors-blood)',
  transition: 'transform 0.1s, box-shadow 0.1s',
  '&:active': {
    transform: 'skewX(-8deg) translate(2px, 2px)',
    boxShadow: '1px 1px 0 var(--colors-blood)',
  },
  '& svg': { transform: 'skewX(8deg)' },
});

export const codeWrap = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  padding: '4px',
  position: 'relative',
  transition: 'transform 0.1s',
  '&:active': { transform: 'scale(0.96)' },
});

export const codeLabel = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '9px',
  letterSpacing: '0.42em',
  color: 'blood',
  textTransform: 'uppercase',
  lineHeight: 1,
});

export const code = css({
  fontFamily: 'display',
  fontSize: '26px',
  letterSpacing: '0.32em',
  color: 'paper',
  fontWeight: 400,
  fontStyle: 'italic',
  lineHeight: 1.1,
  marginLeft: '0.32em',
});

export const copyHint = css({
  fontFamily: 'condensed',
  fontSize: '9px',
  color: 'graySoft',
  letterSpacing: '0.16em',
  lineHeight: 1,
  textTransform: 'uppercase',
  fontWeight: 700,
});
