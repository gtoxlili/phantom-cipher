import { css } from '@/styled-system/css';

export const backdrop = css({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(10, 10, 10, 0.82)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
});

export const sheet = css({
  width: '100%',
  background: 'paper',
  color: 'ink',
  borderTop: '4px solid var(--colors-blood)',
  padding: '22px 16px max(22px, env(safe-area-inset-bottom, 0px))',
  boxShadow: '0 -8px 30px rgba(10, 10, 10, 0.6)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-4px',
    left: 0,
    right: 0,
    height: '4px',
    background: 'repeating-linear-gradient(45deg, var(--colors-blood) 0, var(--colors-blood) 8px, var(--colors-ink) 8px, var(--colors-ink) 16px)',
  },
});

export const title = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '17px',
  textAlign: 'center',
  color: 'ink',
  marginBottom: '4px',
  letterSpacing: '0.04em',
  '& strong': { color: 'blood', fontFamily: 'cn', fontWeight: 900 },
});

export const subtitle = css({
  fontFamily: 'condensed',
  fontSize: '11px',
  letterSpacing: '0.4em',
  color: 'blood',
  textAlign: 'center',
  marginBottom: '18px',
  textTransform: 'uppercase',
});

export const preview = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '18px',
  paddingBottom: '14px',
  borderBottom: '2px dashed var(--colors-ink)',
});

export const handRow = css({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: '4px',
  flexWrap: 'wrap',
  paddingTop: '14px',
  paddingBottom: '14px',
  marginBottom: '4px',
});

export const slot = css({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '74px',
  border: '2px dashed var(--colors-ink)',
  background: 'transparent',
  cursor: 'pointer',
  transform: 'skewX(-8deg)',
  padding: 0,
  transition: 'background 0.1s, border-color 0.1s',
  '&::after': {
    content: '"+"',
    fontFamily: 'display',
    fontSize: '24px',
    color: 'ink',
    transform: 'skewX(8deg)',
    fontWeight: 700,
  },
  '&:hover, &:active': {
    background: 'blood',
    borderColor: 'blood',
    '&::after': { color: 'paper' },
  },
});

export const tileWrap = css({
  display: 'inline-flex',
  pointerEvents: 'none',
});

export const cancel = css({
  width: '100%',
  padding: '12px',
  marginTop: '6px',
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
});

export const hint = css({
  fontFamily: 'condensed',
  fontSize: '11px',
  letterSpacing: '0.32em',
  color: 'ink',
  textAlign: 'center',
  textTransform: 'uppercase',
  marginTop: '6px',
  opacity: 0.7,
});
