import { css } from 'styled-system/css';

export const main = css({
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  background: 'ink',
  width: '100%',
  maxWidth: '480px',
  marginInline: 'auto',
});

export const card = css({
  margin: '12vh auto 0',
  width: 'min(420px, 92vw)',
  padding: '28px 22px 22px',
  background: 'paper',
  color: 'ink',
  border: '3px solid var(--colors-ink)',
  boxShadow: '8px 8px 0 var(--colors-blood)',
  position: 'relative',
  zIndex: 2,
  transform: 'skewX(-3deg)',
  animation: 'slamIn 0.32s ease-out',
  '& > *': { transform: 'skewX(3deg)' },
});

export const eyebrow = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '11px',
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
  color: 'blood',
  marginBottom: '8px',
});

export const heading = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '30px',
  margin: '0 0 6px',
  letterSpacing: '0.02em',
});

export const lead = css({
  fontFamily: 'body',
  fontWeight: 600,
  margin: '0 0 18px',
  fontSize: '14px',
  color: 'inkSoft',
});

export const input = css({
  width: '100%',
  padding: '14px 16px',
  fontSize: '18px',
  fontWeight: 700,
  background: 'bone',
  border: '3px solid var(--colors-ink)',
  color: 'ink',
  outline: 'none',
  marginBottom: '14px',
  fontFamily: 'body',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  '&:focus': {
    background: 'paper',
    boxShadow: '6px 6px 0 var(--colors-blood)',
  },
});

/**
 * SHUFFLE button — slim P5-style dashed pill, sits between input and
 * primary submit. Distinct enough to discover but doesn't compete with
 * the main "入局" CTA.
 */
export const shuffleBtn = css({
  width: '100%',
  padding: '10px 12px',
  marginBottom: '12px',
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: 'ink',
  background: 'transparent',
  border: '2px dashed var(--colors-ink)',
  minHeight: '40px',
  transform: 'skewX(-6deg)',
  transition: 'background 0.12s, color 0.12s, transform 0.08s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  '&:hover': {
    background: 'rgba(230, 0, 34, 0.08)',
    borderColor: 'blood',
    color: 'blood',
  },
  '&:active': {
    background: 'blood',
    borderColor: 'blood',
    color: 'paper',
    transform: 'skewX(-6deg) translate(2px, 2px)',
  },
});

export const shuffleIcon = css({
  display: 'inline-block',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '16px',
  color: 'blood',
  transform: 'skewX(6deg)',
});

export const submit = css({
  width: '100%',
  padding: '14px',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  letterSpacing: '0.04em',
  fontSize: '18px',
  background: 'blood',
  color: 'paper',
  border: '3px solid var(--colors-ink)',
  minHeight: '52px',
  boxShadow: '5px 5px 0 var(--colors-ink)',
  transition: 'transform 0.1s, box-shadow 0.1s',
  '&:disabled': {
    background: 'gray',
    color: 'rgba(250, 250, 243, 0.5)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
  '&:active:not(:disabled)': {
    transform: 'translate(3px, 3px)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
});

export const linkBtn = css({
  background: 'transparent',
  border: 'none',
  color: 'gray',
  marginTop: '8px',
  fontSize: '12px',
  letterSpacing: '0.18em',
  minHeight: 'auto',
  padding: '6px',
  boxShadow: 'none',
  fontStyle: 'italic',
  '&:active': { color: 'blood', transform: 'none' },
});
