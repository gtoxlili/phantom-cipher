import { css } from '@/styled-system/css';

export const main = css({
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  padding: 'max(20px, env(safe-area-inset-top, 0px)) 0 max(20px, env(safe-area-inset-bottom, 0px))',
  overflowX: 'hidden',
});

export const titleBlock = css({
  position: 'relative',
  padding: '18px 20px 32px',
  marginTop: '4vh',
  zIndex: 2,
});

export const titleEyebrow = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '11px',
  letterSpacing: '0.45em',
  textTransform: 'uppercase',
  marginBottom: '12px',
  padding: '4px 12px',
  display: 'inline-block',
  background: 'paper',
  color: 'ink',
  transform: 'skewX(-10deg)',
  border: '2px solid var(--colors-ink)',
  boxShadow: '3px 3px 0 var(--colors-blood)',
  '& > span': { display: 'inline-block', transform: 'skewX(10deg)' },
});

export const title = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: 'clamp(60px, 18vw, 92px)',
  lineHeight: 0.92,
  margin: 0,
  color: 'paper',
  letterSpacing: 0,
  fontStyle: 'italic',
  display: 'flex',
  flexDirection: 'column',
});

export const titleRow1 = css({
  display: 'inline-block',
  background: 'paper',
  color: 'ink',
  padding: '4px 16px 6px',
  alignSelf: 'flex-start',
  border: '3px solid var(--colors-ink)',
  boxShadow: '5px 5px 0 var(--colors-blood)',
  transform: 'skewX(-6deg)',
});

export const titleRow2 = css({
  display: 'inline-block',
  background: 'blood',
  color: 'paper',
  padding: '4px 16px 6px',
  alignSelf: 'flex-start',
  marginTop: '8px',
  marginLeft: '22px',
  border: '3px solid var(--colors-ink)',
  boxShadow: '5px 5px 0 var(--colors-ink)',
  transform: 'skewX(-6deg)',
});

export const titleText = css({
  display: 'inline-block',
  transform: 'skewX(6deg)',
});

export const subtitle = css({
  marginTop: '18px',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '22px',
  letterSpacing: '0.32em',
  color: 'paper',
  fontWeight: 400,
  position: 'relative',
  display: 'inline-block',
  padding: '2px 10px 2px 0',
  '&::before': {
    content: '"//"',
    color: 'blood',
    marginRight: '10px',
    fontStyle: 'italic',
    fontWeight: 400,
  },
});

export const hook = css({
  position: 'relative',
  margin: '0 20px 28px',
  padding: '14px 16px',
  background: 'inkSoft',
  border: '2px solid var(--colors-paper)',
  fontFamily: 'body',
  fontSize: '14px',
  lineHeight: 1.65,
  color: 'bone',
  fontWeight: 600,
  letterSpacing: '0.04em',
  transform: 'skewX(-2deg)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  '&::before': {
    content: '"※"',
    position: 'absolute',
    top: '-10px',
    left: '12px',
    background: 'blood',
    color: 'paper',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    border: '2px solid var(--colors-ink)',
    transform: 'rotate(-15deg)',
  },
  '& em': {
    color: 'blood',
    fontStyle: 'normal',
    fontWeight: 800,
  },
});

export const actions = css({
  margin: '0 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  zIndex: 2,
});

const btnBase = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 22px 18px 26px',
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: '22px',
  letterSpacing: '0.04em',
  fontStyle: 'italic',
  border: '3px solid var(--colors-ink)',
  transition: 'transform 0.12s, box-shadow 0.12s',
  minHeight: '58px',
  textAlign: 'left',
  userSelect: 'none',
  transform: 'skewX(-8deg)',
} as const;

export const btnLabel = css({
  display: 'inline-block',
  transform: 'skewX(8deg)',
});

export const btnArrow = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'display',
  fontSize: '26px',
  transform: 'skewX(8deg)',
  marginLeft: '10px',
  fontStyle: 'normal',
});

export const btnPrimary = css({
  ...btnBase,
  background: 'blood',
  color: 'paper',
  boxShadow: '6px 6px 0 var(--colors-ink)',
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
});

export const btnSecondary = css({
  ...btnBase,
  background: 'paper',
  color: 'ink',
  boxShadow: '6px 6px 0 var(--colors-blood)',
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-blood)',
  },
});

const btnSubBase = {
  fontFamily: 'display',
  fontSize: '11px',
  letterSpacing: '0.28em',
  fontWeight: 400,
  fontStyle: 'italic',
  marginTop: '2px',
} as const;

export const btnSubLight = css({ ...btnSubBase, color: 'rgba(250, 250, 243, 0.7)' });
export const btnSubDark = css({ ...btnSubBase, color: 'rgba(10, 10, 10, 0.6)' });

export const btnTextRow = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

export const howto = css({
  margin: '28px 20px 0',
  textAlign: 'center',
});

export const howtoSummary = css({
  cursor: 'pointer',
  fontFamily: 'condensed',
  fontStyle: 'italic',
  letterSpacing: '0.28em',
  fontSize: '11px',
  textTransform: 'uppercase',
  color: 'bone',
  listStyle: 'none',
  padding: '8px',
  fontWeight: 700,
  '&::-webkit-details-marker': { display: 'none' },
  '&::after': { content: '" ▾"', color: 'blood' },
});

export const howtoBox = css({
  background: 'paper',
  color: 'ink',
  border: '2px solid var(--colors-ink)',
  padding: '14px 16px',
  marginTop: '8px',
  textAlign: 'left',
  fontFamily: 'body',
  fontWeight: 600,
  fontSize: '13px',
  lineHeight: 1.7,
  boxShadow: '4px 4px 0 var(--colors-blood)',
  transform: 'skewX(-2deg)',
  '& p': {
    margin: '6px 0',
    display: 'flex',
    gap: '8px',
  },
  '& p::before': {
    content: '"◆"',
    color: 'blood',
    flexShrink: 0,
  },
});

export const form = css({
  margin: '8px 20px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  animation: 'slamIn 0.32s ease-out',
});

export const formTitle = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: '26px',
  fontStyle: 'italic',
  margin: '0 0 4px',
  color: 'paper',
  letterSpacing: '0.02em',
  display: 'inline-block',
  alignSelf: 'flex-start',
  background: 'inkSoft',
  padding: '6px 14px',
  border: '2px solid var(--colors-paper)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  transform: 'skewX(-8deg)',
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
});

export const field = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const fieldLabel = css({
  fontFamily: 'condensed',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontSize: '11px',
  color: 'blood',
  fontWeight: 700,
  '&::before': { content: '"› "' },
});

export const input = css({
  fontFamily: 'body',
  fontWeight: 700,
  fontSize: '18px',
  padding: '14px 16px',
  background: 'paper',
  border: '3px solid var(--colors-ink)',
  color: 'ink',
  outline: 'none',
  transition: 'box-shadow 0.15s, transform 0.1s',
  minHeight: '52px',
  transform: 'skewX(-4deg)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  '&:focus': {
    boxShadow: '6px 6px 0 var(--colors-blood)',
    transform: 'skewX(-4deg) translate(-1px, -1px)',
  },
  '&::placeholder': {
    color: 'rgba(10, 10, 10, 0.4)',
    fontStyle: 'italic',
    fontWeight: 600,
  },
});

export const inputMono = css({
  fontFamily: 'display',
  fontWeight: 400,
  fontSize: '26px',
  padding: '14px 16px',
  background: 'paper',
  border: '3px solid var(--colors-ink)',
  color: 'ink',
  outline: 'none',
  transition: 'box-shadow 0.15s, transform 0.1s',
  minHeight: '52px',
  transform: 'skewX(-4deg)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  textAlign: 'center',
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  '&:focus': {
    boxShadow: '6px 6px 0 var(--colors-blood)',
    transform: 'skewX(-4deg) translate(-1px, -1px)',
  },
});

export const error = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  color: 'blood',
  fontSize: '13px',
  textAlign: 'left',
  padding: '4px 0 0 4px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  animation: 'shake 0.4s ease-out',
  '&::before': { content: '"⚠ "' },
});

export const formActions = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '8px',
  gap: '8px',
});

export const btnText = css({
  background: 'transparent',
  border: 'none',
  color: 'bone',
  padding: '10px 14px',
  minHeight: '40px',
  fontFamily: 'condensed',
  fontSize: '13px',
  letterSpacing: '0.18em',
  fontWeight: 700,
  '&:active': { color: 'blood' },
});

export const submit = css({
  ...btnBase,
  flex: 1,
  maxWidth: '64%',
  fontSize: '18px',
  padding: '14px 18px',
  minHeight: '52px',
  fontWeight: 900,
  background: 'blood',
  color: 'paper',
  boxShadow: '6px 6px 0 var(--colors-ink)',
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
});

export const footer = css({
  position: 'relative',
  marginTop: 'auto',
  padding: '28px 20px 0',
  textAlign: 'center',
  fontFamily: 'display',
  fontStyle: 'italic',
  letterSpacing: '0.32em',
  color: 'rgba(250, 250, 243, 0.4)',
  fontSize: '11px',
  textTransform: 'uppercase',
  '&::before': { content: '"★"', color: 'blood', marginRight: '8px' },
  '&::after': { content: '"★"', color: 'blood', marginLeft: '8px' },
});
