import { css } from '@/styled-system/css';

export const banner = css({
  flex: '0 0 auto',
  position: 'relative',
  height: '44px',
  zIndex: 2,
  overflow: 'hidden',
  background: 'inkSoft',
  borderBottom: '2px solid var(--colors-ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const innerBase = {
  position: 'relative',
  width: '130%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transform: 'skewX(-22deg)',
  borderTop: '2px solid var(--colors-paper)',
  borderBottom: '2px solid var(--colors-paper)',
  animation: 'streakIn 0.36s cubic-bezier(0.17, 0.84, 0.44, 1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '-10%',
    top: 0,
    bottom: 0,
    width: '4px',
    background: 'paper',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    right: '-10%',
    top: 0,
    bottom: 0,
    width: '4px',
    background: 'paper',
  },
} as const;

export const inner = {
  idle: css({ ...innerBase, background: 'inkSoft' }),
  turn: css({ ...innerBase, background: 'blood' }),
  wait: css({ ...innerBase, background: 'ink' }),
  end: css({ ...innerBase, background: 'gold', borderColor: 'ink' }),
};

const textBase = {
  transform: 'skewX(22deg)',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '16px',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
} as const;

export const text = {
  idle: css({ ...textBase, color: 'paper' }),
  turn: css({ ...textBase, color: 'paper' }),
  wait: css({ ...textBase, color: 'paper' }),
  end: css({ ...textBase, color: 'ink' }),
};

const accentBase = {
  fontFamily: 'display',
  fontSize: '22px',
} as const;

export const accent = {
  idle: css({ ...accentBase, color: 'blood' }),
  turn: css({ ...accentBase, color: 'paper' }),
  wait: css({ ...accentBase, color: 'blood' }),
  end: css({ ...accentBase, color: 'blood' }),
};
