import { css } from '@/styled-system/css';

export const row = css({
  flex: '0 1 auto',
  position: 'relative',
  padding: '10px 14px 12px',
  background: 'rgba(30, 30, 30, 0.75)',
  border: '2px solid var(--colors-paper)',
  transition: 'all 0.22s',
  transform: 'skewX(-2deg)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  '& > *': { transform: 'skewX(2deg)' },
});

export const variant = {
  opponent: css({ minHeight: '84px' }),
  me: css({
    background: 'inkSoft',
    border: '3px solid var(--colors-blood)',
    boxShadow: '5px 5px 0 var(--colors-paper)',
  }),
};

export const current = css({
  background: 'blood',
  borderColor: 'paper',
  boxShadow: '5px 5px 0 var(--colors-ink)',
  animation: 'pulseRed 1.6s ease-in-out infinite',
});

export const currentMe = css({
  background: 'blood',
  borderColor: 'gold',
});

export const dead = css({
  opacity: 0.42,
  filter: 'grayscale(0.85)',
});

export const offline = css({
  opacity: 0.45,
  filter: 'grayscale(0.5)',
});

export const playerHeader = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '6px',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '16px',
  letterSpacing: '0.02em',
  color: 'paper',
});

export const playerName = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '&::before': {
    content: '"◆︎"',
    color: 'blood',
    fontSize: '12px',
  },
});

export const youTag = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  color: 'gold',
  fontSize: '10px',
  letterSpacing: '0.16em',
  fontStyle: 'normal',
  background: 'ink',
  padding: '2px 6px',
  border: '1.5px solid var(--colors-gold)',
});

export const hostTag = css({
  fontFamily: 'condensed',
  fontSize: '9px',
  letterSpacing: '0.18em',
  background: 'paper',
  color: 'ink',
  padding: '2px 6px',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontStyle: 'normal',
});

export const playerStatus = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
  letterSpacing: '0.18em',
  fontStyle: 'normal',
  fontWeight: 700,
  textTransform: 'uppercase',
});

export const turnTag = css({
  fontFamily: 'condensed',
  color: 'paper',
  background: 'ink',
  padding: '2px 8px',
  border: '1.5px solid var(--colors-paper)',
  animation: 'blink 1.0s ease-in-out infinite',
});

export const deadTag = css({
  background: 'gray',
  color: 'paper',
  padding: '2px 6px',
  fontFamily: 'condensed',
});

export const offlineTag = css({
  background: 'ink',
  color: 'graySoft',
  padding: '2px 6px',
  fontFamily: 'condensed',
});

const handBase = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  paddingTop: '8px',
} as const;

export const hand = {
  me: css({
    ...handBase,
    justifyContent: 'center',
    gap: '12px',
    minHeight: '96px',
    padding: '18px 0 6px',
  }),
  op: css({
    ...handBase,
    gap: '6px',
    minHeight: '70px',
    paddingTop: '14px',
  }),
};

export const emptyHand = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  color: 'graySoft',
  fontSize: '22px',
  letterSpacing: '0.4em',
});
