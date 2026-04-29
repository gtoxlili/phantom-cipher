import { css } from 'styled-system/css';

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

// 重连指示器：blood 底白字 chip + 脉冲圆点。只在 connected=false
// 时显示；正常连接时整个元素被 <Show> 卸掉，不占布局也不参与 hit
// test。脉动动画借现成的 pulseRed 关键帧
export const disconnected = css({
  position: 'absolute',
  top: 'max(10px, env(safe-area-inset-top, 0px))',
  left: '50%',
  transform: 'translateX(-50%) skewX(-8deg)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  background: 'blood',
  color: 'paper',
  border: '2px solid var(--colors-paper)',
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '9px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  boxShadow: '3px 3px 0 var(--colors-ink)',
  pointerEvents: 'none',
  zIndex: 4,
  animation: 'pulseRed 1.4s ease-in-out infinite',
  '& > span:last-child': { transform: 'skewX(8deg)' },
});

export const dot = css({
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: 'paper',
  animation: 'blink 0.9s ease-in-out infinite',
});
