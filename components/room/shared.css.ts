import { css } from '@/styled-system/css';

const skewBase = {
  border: '3px solid var(--colors-paper)',
  transform: 'skewX(-8deg)',
  transition: 'transform 0.1s, box-shadow 0.1s',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  letterSpacing: '0.04em',
} as const;

export const skewBtn = css(skewBase);

export const skewInner = css({
  display: 'inline-block',
  transform: 'skewX(8deg)',
});

export const btnPrimary = css({
  ...skewBase,
  flex: 1,
  padding: '14px 18px',
  fontSize: '16px',
  minHeight: '50px',
  background: 'blood',
  color: 'paper',
  boxShadow: '4px 4px 0 var(--colors-paper)',
  '&:active': {
    transform: 'skewX(-8deg) translate(2px, 2px)',
    boxShadow: '1px 1px 0 var(--colors-paper)',
  },
});

export const btnSecondary = css({
  ...skewBase,
  flex: 1,
  padding: '14px 18px',
  fontSize: '16px',
  minHeight: '50px',
  background: 'paper',
  color: 'ink',
  borderColor: 'ink',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  '&:active': {
    transform: 'skewX(-8deg) translate(2px, 2px)',
    boxShadow: '1px 1px 0 var(--colors-blood)',
  },
});
