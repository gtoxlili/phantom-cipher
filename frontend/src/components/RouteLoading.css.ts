import { css } from 'styled-system/css';

/* P5-风格路由 loader——满屏黑底 + halftone（global body::before 已铺）
 * + 红色斜切横幅 + 三张洗牌动画 + 双语标题。视觉与 Home/Header 现有
 * skewed-card 语言一致，避免 fallback 看起来像别的产品。 */

export const screen = css({
  position: 'relative',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '36px',
  padding: '8vh 8vw',
  background: 'ink',
  color: 'paper',
  overflow: 'hidden',
  isolation: 'isolate',
});

/* 背景红色对角线条带——跟 global body::after 同样的 22 度斜
 * 但更密、更亮，让 loading 期间的 BG 比常态更"动" */
export const stripes = css({
  position: 'absolute',
  inset: '-20%',
  zIndex: 0,
  pointerEvents: 'none',
  background:
    'repeating-linear-gradient(-22deg, transparent 0, transparent 36px, rgba(230, 0, 34, 0.10) 36px, rgba(230, 0, 34, 0.10) 38px, transparent 38px, transparent 86px)',
  opacity: 0.9,
});

/* 一道横扫的红色速度线，呼应 Home 页 Sketch 的 streakRun */
export const speedLine = css({
  position: 'absolute',
  left: '-30%',
  top: '38%',
  width: '60vw',
  height: '4px',
  background: 'linear-gradient(90deg, transparent, var(--colors-blood) 50%, transparent)',
  filter: 'drop-shadow(0 0 8px rgba(230, 0, 34, 0.6))',
  transform: 'skewX(-22deg)',
  animation: 'streakRun 2.4s linear infinite',
  opacity: 0.75,
  zIndex: 0,
});

/* 牌堆容器——把"洗牌"那块视觉抬到正中央 */
export const deckWrap = css({
  position: 'relative',
  width: '180px',
  height: '180px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
});

const cardBase = {
  position: 'absolute',
  width: '88px',
  height: '120px',
  borderRadius: '4px',
  background: 'bone',
  border: '3px solid var(--colors-ink)',
  boxShadow: '5px 5px 0 var(--colors-blood)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'display',
  fontSize: '36px',
  fontStyle: 'italic',
  fontWeight: 700,
  color: 'ink',
  letterSpacing: '0.04em',
  transformOrigin: 'center center',
  animationName: 'loaderShuffle',
  animationDuration: '1.6s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'cubic-bezier(0.5, 0, 0.4, 1)',
} as const;

export const card = {
  one: css({
    ...cardBase,
    animationDelay: '0s',
    '&::before': {
      content: '"DV"',
      transform: 'skewX(-6deg)',
      display: 'inline-block',
    },
  }),
  two: css({
    ...cardBase,
    animationDelay: '-0.54s',
    background: 'ink',
    color: 'paper',
    boxShadow: '5px 5px 0 var(--colors-paper)',
    '&::before': {
      content: '"?"',
      fontSize: '52px',
      color: 'blood',
      transform: 'skewX(-6deg)',
      display: 'inline-block',
    },
  }),
  three: css({
    ...cardBase,
    animationDelay: '-1.08s',
    background: 'blood',
    color: 'paper',
    boxShadow: '5px 5px 0 var(--colors-ink)',
    '&::before': {
      content: '"★"',
      fontSize: '40px',
      transform: 'skewX(-6deg)',
      display: 'inline-block',
    },
  }),
};

/* 文字组：上方红横幅 + 主标题 + 副标题 + 闪烁省略号 */
export const textBlock = css({
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '14px',
});

/* P5 风格红横幅——paper 底 ink 边 blood 阴影的反色变体 */
export const ribbon = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.5em',
  textTransform: 'uppercase',
  padding: '6px 18px 7px',
  background: 'blood',
  color: 'paper',
  border: '2.5px solid var(--colors-paper)',
  boxShadow: '4px 4px 0 var(--colors-paper)',
  transform: 'skewX(-9deg)',
  animation: 'loaderRibbon 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards',
  '& > span': {
    display: 'inline-block',
    transform: 'skewX(9deg)',
  },
});

/* 主标题 "解读密码"——四个字逐字 slamIn */
export const title = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: 'clamp(48px, 11vw, 96px)',
  lineHeight: 1,
  margin: 0,
  letterSpacing: '0.04em',
  color: 'paper',
  display: 'inline-flex',
  gap: '0.04em',
});

export const titleGlyph = css({
  display: 'inline-block',
  animation: 'loaderGlyphSlam 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards',
});

/* 英文副标题 + 闪烁省略号 */
export const subtitle = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: 'clamp(18px, 3.4vw, 26px)',
  letterSpacing: '0.42em',
  color: 'bone',
  marginTop: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.6em',
});

export const dots = css({
  display: 'inline-block',
  fontFamily: 'display',
  fontStyle: 'italic',
  color: 'blood',
  letterSpacing: '0.12em',
  animation: 'blink 1.0s ease-in-out infinite',
});

/* 角落装饰罗马数字——跟 Sketch 桌面端 ornament 同款语言 */
export const cornerMark = css({
  position: 'absolute',
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: '13px',
  letterSpacing: '0.42em',
  color: 'paper',
  opacity: 0.42,
  zIndex: 1,
  top: '24px',
  left: '24px',
});

export const cornerMarkRight = css({
  position: 'absolute',
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: '64px',
  color: 'blood',
  opacity: 0.18,
  zIndex: 1,
  top: '20px',
  right: '24px',
  letterSpacing: 0,
  lineHeight: 1,
  transform: 'skewX(-6deg)',
});
