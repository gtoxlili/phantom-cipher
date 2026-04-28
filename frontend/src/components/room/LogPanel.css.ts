import { css } from 'styled-system/css';

export const backdrop = css({
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'rgba(10, 10, 10, 0.7)',
  display: 'flex',
  justifyContent: 'flex-end',
  animation: 'fadeIn 0.18s',
});

export const panel = css({
  width: 'min(86vw, 360px)',
  height: '100%',
  background: 'paper',
  color: 'ink',
  borderLeft: '4px solid var(--colors-blood)',
  display: 'flex',
  flexDirection: 'column',
  animation: 'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
});

export const header = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: 'ink',
  color: 'paper',
  borderBottom: '3px solid var(--colors-blood)',
});

export const title = css({
  margin: 0,
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '18px',
  letterSpacing: '0.06em',
  '&::before': {
    content: '"※ "',
    color: 'blood',
  },
});

export const closeBtn = css({
  fontSize: '22px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'paper',
  lineHeight: 1,
  background: 'blood',
  border: '2px solid var(--colors-paper)',
  fontWeight: 700,
});

export const list = css({
  flex: 1,
  margin: 0,
  padding: '12px 16px',
  listStyle: 'none',
  overflowY: 'auto',
});

export const entry = css({
  fontFamily: 'body',
  fontWeight: 600,
  fontSize: '13px',
  lineHeight: 1.55,
  padding: '8px 10px',
  marginBottom: '6px',
  background: 'bone',
  borderLeft: '3px solid var(--colors-blood)',
  color: 'ink',
});

export const empty = css({
  fontStyle: 'italic',
  color: 'graySoft',
  textAlign: 'center',
  background: 'transparent',
  border: 'none',
});
