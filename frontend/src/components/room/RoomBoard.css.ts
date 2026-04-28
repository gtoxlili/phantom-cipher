import { css } from 'styled-system/css';

export const main = css({
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  overflow: 'hidden',
  background: 'ink',
  width: '100%',
  maxWidth: '480px',
  marginInline: 'auto',
  // soft red glow at the seam between the "phone" frame and the desktop bg
  boxShadow: '0 0 0 1px rgba(230, 0, 34, 0.12), 0 0 60px rgba(230, 0, 34, 0.08)',
});

export const opponentsArea = css({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '12px 14px 8px',
  overflowY: 'auto',
  position: 'relative',
  zIndex: 1,
  minHeight: 0,
});

export const myArea = css({
  flex: '0 0 auto',
  padding: '12px 14px max(16px, env(safe-area-inset-bottom, 0px))',
  background: 'linear-gradient(180deg, transparent, rgba(230, 0, 34, 0.08))',
  position: 'relative',
  zIndex: 1,
});

export const connectingMsg = css({
  textAlign: 'center',
  fontFamily: 'condensed',
  fontStyle: 'italic',
  color: 'graySoft',
  padding: '20px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontWeight: 700,
});
