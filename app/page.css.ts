import { css } from '@/styled-system/css';

/* =====================================================================
 * LAYOUT — mobile flex column up to lg, magazine-style 2-column grid
 * on desktop. Mobile design is unchanged; lg overrides take over above
 * 1024px and let the title dominate the left while buttons sit right.
 * ===================================================================== */
export const main = css({
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  padding: 'max(20px, env(safe-area-inset-top, 0px)) 0 max(20px, env(safe-area-inset-bottom, 0px))',
  overflowX: 'hidden',
  width: '100%',

  display: { base: 'flex', lg: 'grid' },
  flexDirection: 'column',

  maxWidth: { base: '480px', lg: '1280px' },
  marginInline: 'auto',

  gridTemplateColumns: { lg: '1.15fr 0.85fr' },
  gridTemplateAreas: {
    lg: `
      "title content"
      "footer footer"
    `,
  },
  columnGap: { lg: '72px' },
  paddingInline: { lg: '56px' },
  paddingBlock: { lg: '40px' },
  alignItems: { lg: 'center' },
});

export const titleArea = css({
  gridArea: { lg: 'title' },
  padding: { base: '0', lg: '0' },
  alignSelf: { lg: 'center' },
});

export const contentArea = css({
  gridArea: { lg: 'content' },
  display: 'flex',
  flexDirection: 'column',
  gap: { base: '0', lg: '24px' },
  alignSelf: { lg: 'center' },
});

/* =====================================================================
 * TITLE — bigger, more dominant on desktop.
 * ===================================================================== */
export const titleBlock = css({
  position: 'relative',
  padding: { base: '18px 20px 32px', lg: '0' },
  marginTop: { base: '4vh', lg: '0' },
  zIndex: 2,
});

export const titleEyebrow = css({
  fontFamily: 'condensed',
  fontWeight: 700,
  fontSize: { base: '11px', lg: '13px' },
  letterSpacing: { base: '0.45em', lg: '0.55em' },
  textTransform: 'uppercase',
  marginBottom: { base: '12px', lg: '20px' },
  padding: { base: '4px 12px', lg: '6px 16px' },
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
  fontSize: { base: 'clamp(60px, 18vw, 92px)', lg: 'clamp(110px, 11vw, 200px)' },
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
  padding: { base: '4px 16px 6px', lg: '6px 26px 10px' },
  alignSelf: 'flex-start',
  border: { base: '3px solid var(--colors-ink)', lg: '5px solid var(--colors-ink)' },
  boxShadow: { base: '5px 5px 0 var(--colors-blood)', lg: '10px 10px 0 var(--colors-blood)' },
  transform: 'skewX(-6deg)',
});

export const titleRow2 = css({
  display: 'inline-block',
  background: 'blood',
  color: 'paper',
  padding: { base: '4px 16px 6px', lg: '6px 26px 10px' },
  alignSelf: 'flex-start',
  marginTop: { base: '8px', lg: '14px' },
  marginLeft: { base: '22px', lg: '60px' },
  border: { base: '3px solid var(--colors-ink)', lg: '5px solid var(--colors-ink)' },
  boxShadow: { base: '5px 5px 0 var(--colors-ink)', lg: '10px 10px 0 var(--colors-ink)' },
  transform: 'skewX(-6deg)',
});

export const titleText = css({
  display: 'inline-block',
  transform: 'skewX(6deg)',
});

export const subtitle = css({
  marginTop: { base: '18px', lg: '28px' },
  fontFamily: 'display',
  fontStyle: 'italic',
  fontSize: { base: '22px', lg: '28px' },
  letterSpacing: { base: '0.32em', lg: '0.42em' },
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

/* =====================================================================
 * HOOK — moved into titleArea on desktop, sits below subtitle.
 * ===================================================================== */
export const hook = css({
  position: 'relative',
  margin: { base: '0 20px 28px', lg: '40px 0 0' },
  padding: { base: '14px 16px', lg: '18px 22px' },
  background: 'inkSoft',
  border: '2px solid var(--colors-paper)',
  fontFamily: 'body',
  fontSize: { base: '14px', lg: '16px' },
  lineHeight: 1.65,
  color: 'bone',
  fontWeight: 600,
  letterSpacing: '0.04em',
  transform: 'skewX(-2deg)',
  boxShadow: '4px 4px 0 var(--colors-blood)',
  maxWidth: { lg: '480px' },
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

/* =====================================================================
 * ACTIONS — bigger, more spacious on desktop.
 * ===================================================================== */
export const actions = css({
  margin: { base: '0 20px', lg: '0' },
  display: 'flex',
  flexDirection: 'column',
  gap: { base: '14px', lg: '18px' },
  zIndex: 2,
});

const btnBase = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  // explicit width — wrapping the button in a motion.div removes it
  // from `actions` flex stretch, so without this the button collapses
  // to content-width.
  width: '100%',
  padding: { base: '18px 22px 18px 26px', lg: '26px 30px 26px 36px' },
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: { base: '22px', lg: '30px' },
  letterSpacing: '0.04em',
  fontStyle: 'italic',
  border: { base: '3px solid var(--colors-ink)', lg: '4px solid var(--colors-ink)' },
  transition: 'transform 0.12s, box-shadow 0.12s',
  minHeight: { base: '58px', lg: '84px' },
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
  fontSize: { base: '26px', lg: '36px' },
  transform: 'skewX(8deg)',
  marginLeft: '10px',
  fontStyle: 'normal',
});

export const btnPrimary = css({
  ...btnBase,
  background: 'blood',
  color: 'paper',
  boxShadow: { base: '6px 6px 0 var(--colors-ink)', lg: '8px 8px 0 var(--colors-ink)' },
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'skewX(-8deg) translate(-2px, -2px)',
      boxShadow: { base: '8px 8px 0 var(--colors-ink)', lg: '12px 12px 0 var(--colors-ink)' },
    },
  },
});

export const btnSecondary = css({
  ...btnBase,
  background: 'paper',
  color: 'ink',
  boxShadow: { base: '6px 6px 0 var(--colors-blood)', lg: '8px 8px 0 var(--colors-blood)' },
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-blood)',
  },
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'skewX(-8deg) translate(-2px, -2px)',
      boxShadow: { base: '8px 8px 0 var(--colors-blood)', lg: '12px 12px 0 var(--colors-blood)' },
    },
  },
});

const btnSubBase = {
  fontFamily: 'display',
  fontSize: { base: '11px', lg: '14px' },
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

/* =====================================================================
 * HOW-TO — keeps the same disclosure pattern.
 * ===================================================================== */
export const howto = css({
  margin: { base: '28px 20px 0', lg: '0' },
  textAlign: 'center',
});

export const howtoSummary = css({
  cursor: 'pointer',
  fontFamily: 'condensed',
  fontStyle: 'italic',
  letterSpacing: '0.28em',
  fontSize: { base: '11px', lg: '12px' },
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
  padding: { base: '14px 16px', lg: '18px 22px' },
  marginTop: '8px',
  textAlign: 'left',
  fontFamily: 'body',
  fontWeight: 600,
  fontSize: { base: '13px', lg: '14px' },
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

/* =====================================================================
 * FORM
 * ===================================================================== */
export const form = css({
  margin: { base: '8px 20px 0', lg: '0' },
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  // gentleIn — opacity + translateY only. Avoids skewing the parent
  // mid-animation, which would compound with each input's own
  // transform: skewX(-4deg) and snap back at animation end.
  animation: 'gentleIn 0.28s ease-out',
});

export const formTitle = css({
  fontFamily: 'cn',
  fontWeight: 900,
  fontSize: { base: '26px', lg: '34px' },
  fontStyle: 'italic',
  margin: '0 0 4px',
  color: 'paper',
  letterSpacing: '0.02em',
  display: 'inline-block',
  alignSelf: 'flex-start',
  background: 'inkSoft',
  padding: { base: '6px 14px', lg: '8px 18px' },
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
  fontSize: { base: '11px', lg: '12px' },
  color: 'blood',
  fontWeight: 700,
  '&::before': { content: '"› "' },
});

export const input = css({
  fontFamily: 'body',
  fontWeight: 700,
  fontSize: { base: '18px', lg: '20px' },
  padding: { base: '14px 16px', lg: '16px 18px' },
  background: 'paper',
  border: '3px solid var(--colors-ink)',
  color: 'ink',
  outline: 'none',
  transition: 'box-shadow 0.15s, transform 0.1s',
  minHeight: { base: '52px', lg: '60px' },
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
  fontSize: { base: '26px', lg: '32px' },
  padding: { base: '14px 16px', lg: '16px 18px' },
  background: 'paper',
  border: '3px solid var(--colors-ink)',
  color: 'ink',
  outline: 'none',
  transition: 'box-shadow 0.15s, transform 0.1s',
  minHeight: { base: '52px', lg: '60px' },
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
  fontSize: { base: '18px', lg: '22px' },
  padding: { base: '14px 18px', lg: '18px 24px' },
  minHeight: { base: '52px', lg: '64px' },
  fontWeight: 900,
  background: 'blood',
  color: 'paper',
  boxShadow: '6px 6px 0 var(--colors-ink)',
  '&:active': {
    transform: 'skewX(-8deg) translate(4px, 4px)',
    boxShadow: '2px 2px 0 var(--colors-ink)',
  },
});

/* =====================================================================
 * FOOTER
 * ===================================================================== */
export const footer = css({
  gridArea: { lg: 'footer' },
  position: 'relative',
  marginTop: { base: 'auto', lg: '40px' },
  padding: { base: '28px 20px 0', lg: '24px 0 0' },
  textAlign: 'center',
  fontFamily: 'display',
  fontStyle: 'italic',
  letterSpacing: '0.32em',
  color: 'rgba(250, 250, 243, 0.4)',
  fontSize: { base: '11px', lg: '13px' },
  textTransform: 'uppercase',
  borderTop: { lg: '1px solid rgba(230, 0, 34, 0.18)' },
  '&::before': { content: '"★"', color: 'blood', marginRight: '8px' },
  '&::after': { content: '"★"', color: 'blood', marginLeft: '8px' },
});
