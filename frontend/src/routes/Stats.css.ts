import { css } from 'styled-system/css';

// 整页布局——参考 Home，但比 Home 内容更密，desktop 不分两栏，
// 而是垂直堆叠让"总览 / 排行 / 最近"三块按时序铺开
export const main = css({
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  padding: 'max(20px, env(safe-area-inset-top, 0px)) 18px max(40px, env(safe-area-inset-bottom, 0px))',
  maxWidth: '960px',
  marginInline: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: { base: '28px', md: '40px' },
});

// ----- 顶部 -----
export const header = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  paddingTop: '12px',
});

export const backLink = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  padding: '8px 14px',
  background: 'paper',
  color: 'ink',
  border: '2px solid var(--colors-ink)',
  boxShadow: '3px 3px 0 var(--colors-blood)',
  transform: 'skewX(-8deg)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s',
  cursor: 'pointer',
  '& > span': { transform: 'skewX(8deg)' },
  _hover: {
    background: 'blood',
    color: 'paper',
    boxShadow: '5px 5px 0 var(--colors-paper)',
  },
});

// ----- 大标题 -----
export const titleBlock = css({
  position: 'relative',
  padding: { base: '12px 0 20px', md: '20px 0 28px' },
});

export const titleEyebrow = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: { base: '11px', md: '13px' },
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
  fontStyle: 'italic',
  color: 'paper',
  margin: 0,
  fontSize: { base: 'clamp(48px, 13vw, 80px)', md: 'clamp(72px, 9vw, 124px)' },
  lineHeight: 0.92,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  animation: 'slamIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
});

export const titleRow1 = css({
  display: 'inline-block',
  alignSelf: 'flex-start',
  background: 'paper',
  color: 'ink',
  padding: { base: '4px 16px 6px', md: '6px 22px 10px' },
  border: '3px solid var(--colors-ink)',
  boxShadow: '6px 6px 0 var(--colors-blood)',
  transform: 'skewX(-6deg)',
});

export const titleRow2 = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '32px', md: '52px' },
  letterSpacing: '0.04em',
  color: 'blood',
  alignSelf: 'flex-start',
  paddingLeft: '16px',
  transform: 'skewX(-6deg)',
});

// ----- 总览三连卡 -----
export const totals = css({
  display: 'grid',
  gridTemplateColumns: { base: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' },
  gap: { base: '8px', md: '16px' },
});

export const totalCard = css({
  position: 'relative',
  background: 'inkSoft',
  border: '2px solid var(--colors-paper)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  padding: { base: '14px 10px', md: '20px 14px' },
  transform: 'skewX(-2deg)',
  textAlign: 'center',
  '& > *': { transform: 'skewX(2deg)' },
});

export const totalLabel = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: { base: '10px', md: '11px' },
  letterSpacing: '0.2em',
  color: 'graySoft',
  textTransform: 'uppercase',
  marginBottom: { base: '6px', md: '10px' },
});

export const totalValue = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: { base: '38px', md: '54px' },
  lineHeight: 1,
  color: 'paper',
});

export const totalUnit = css({
  fontFamily: 'cn',
  fontWeight: 700,
  fontSize: { base: '11px', md: '13px' },
  color: 'graySoft',
  marginTop: '4px',
});

// ----- 排行榜 -----
export const sectionHead = css({
  display: 'flex',
  alignItems: 'baseline',
  gap: '12px',
  marginBottom: '14px',
  paddingLeft: '4px',
});

export const sectionTitleCn = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: { base: '22px', md: '28px' },
  color: 'paper',
  letterSpacing: '0.02em',
  '&::before': {
    content: '"▶︎ "',
    color: 'blood',
    fontStyle: 'normal',
    marginRight: '4px',
  },
});

export const sectionTitleEn = css({
  fontFamily: 'condensed',
  fontWeight: 600,
  fontSize: { base: '11px', md: '13px' },
  letterSpacing: '0.3em',
  color: 'graySoft',
  textTransform: 'uppercase',
});

export const leaderboardList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: { base: '4px', md: '6px' },
});

export const lbRow = css({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: { base: '40px 1fr auto', md: '56px 1fr auto auto auto' },
  alignItems: 'center',
  gap: { base: '10px', md: '20px' },
  padding: { base: '12px 12px', md: '14px 18px' },
  background: 'inkSoft',
  border: '2px solid var(--colors-paper)',
  borderLeftWidth: { base: '4px', md: '6px' },
  transform: 'skewX(-1deg)',
  '& > *': { transform: 'skewX(1deg)' },
});

export const lbRowGold = css({
  borderLeftColor: 'gold',
  boxShadow: '4px 4px 0 var(--colors-gold)',
});

export const lbRowSilver = css({
  borderLeftColor: 'paper',
  boxShadow: '4px 4px 0 var(--colors-paper)',
});

export const lbRowBronze = css({
  borderLeftColor: 'blood',
  boxShadow: '4px 4px 0 var(--colors-blood)',
});

export const lbRowDefault = css({
  borderLeftColor: 'graySoft',
});

export const rank = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '28px', md: '36px' },
  lineHeight: 1,
  color: 'paper',
  textAlign: 'center',
});

export const rankGold = css({ color: 'gold' });
export const rankBlood = css({ color: 'blood' });

export const lbName = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  fontSize: { base: '17px', md: '22px' },
  color: 'paper',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const lbStat = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '20px', md: '28px' },
  color: 'paper',
  lineHeight: 1,
  textAlign: 'right',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2px',
});

export const lbStatLabel = css({
  fontFamily: 'condensed',
  fontStyle: 'normal',
  fontWeight: 600,
  fontSize: '9px',
  letterSpacing: '0.2em',
  color: 'graySoft',
  textTransform: 'uppercase',
});

// 移动端隐藏的列
export const hideMobile = css({
  display: { base: 'none', md: 'flex' },
});

// 主胜场列：移动端只显示这一项
export const lbWinsValue = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '24px', md: '32px' },
  color: 'blood',
  lineHeight: 1,
});

// ----- 最近对局 -----
export const recentList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: { base: '6px', md: '8px' },
});

export const recentRow = css({
  display: 'grid',
  gridTemplateColumns: { base: 'auto 1fr auto', md: 'auto auto 1fr auto auto' },
  alignItems: 'center',
  gap: { base: '10px', md: '16px' },
  padding: { base: '10px 12px', md: '12px 16px' },
  background: 'rgba(20, 20, 20, 0.7)',
  borderLeft: '3px solid var(--colors-blood)',
  fontSize: { base: '12px', md: '14px' },
  fontFamily: 'condensed',
  color: 'paper',
});

export const recentCode = css({
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '18px', md: '22px' },
  color: 'gold',
  letterSpacing: '0.04em',
  minWidth: '64px',
});

export const recentWinner = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontStyle: 'italic',
  color: 'paper',
  letterSpacing: '0.02em',
  '&::before': {
    content: '"★︎ "',
    color: 'gold',
    fontStyle: 'normal',
  },
});

export const recentMeta = css({
  fontFamily: 'condensed',
  fontWeight: 500,
  fontSize: '11px',
  letterSpacing: '0.1em',
  color: 'graySoft',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

// ----- 状态: empty / loading / error -----
export const stateBox = css({
  textAlign: 'center',
  padding: '40px 20px',
  fontFamily: 'condensed',
  fontWeight: 600,
  fontSize: '13px',
  letterSpacing: '0.3em',
  color: 'graySoft',
  textTransform: 'uppercase',
  border: '2px dashed var(--colors-graySoft)',
  background: 'rgba(20, 20, 20, 0.4)',
});

export const errorBox = css({
  borderColor: 'blood',
  color: 'bloodBright',
});
