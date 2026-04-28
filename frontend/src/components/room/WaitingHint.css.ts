import { css } from 'styled-system/css';

export const wrap = css({
  margin: 'auto',
  textAlign: 'center',
  padding: '28px 18px',
  color: 'paper',
  fontFamily: 'body',
  animation: 'slamIn 0.4s ease-out',
});

export const title = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '22px',
  letterSpacing: '0.06em',
  color: 'paper',
  marginBottom: '14px',
  background: 'blood',
  padding: '6px 14px',
  display: 'inline-block',
  border: '2px solid var(--colors-paper)',
  boxShadow: '4px 4px 0 var(--colors-ink)',
  transform: 'skewX(-8deg)',
  '& > span': { display: 'inline-block', transform: 'skewX(8deg)' },
});

export const sub = css({
  fontFamily: 'body',
  fontWeight: 600,
  fontSize: '14px',
  lineHeight: 1.7,
  color: 'bone',
});

export const subStrong = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  letterSpacing: '0.32em',
  color: 'blood',
  fontSize: '26px',
  fontWeight: 400,
  display: 'inline-block',
  padding: '0 6px',
  background: 'ink',
  border: '2px solid var(--colors-blood)',
  margin: '0 2px',
});
