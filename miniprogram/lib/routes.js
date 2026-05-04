/**
 * 自定义路由 builder：P5 风格的"斩入"转场。
 *
 * 视觉：新页面从右推入 + skewX(-8°→0°)；旧页面左移并淡化。
 */

const curves = require('./curves');

function p5SlashRouteBuilder(ctx) {
  const { primaryAnimation, primaryAnimationStatus, secondaryAnimation, secondaryAnimationStatus } = ctx;
  let W = 375;
  try {
    const win = wx.getWindowInfo();
    if (win && win.windowWidth) W = win.windowWidth;
  } catch (e) { /* ignore */ }

  const Curves = curves.Curves;
  const cPrimary = curves.CurveAnimation({
    animation: primaryAnimation,
    animationStatus: primaryAnimationStatus,
    curve: Curves.fastLinearToSlowEaseIn,
    reverseCurve: Curves.easeInToLinear,
  });
  const cSecondary = curves.CurveAnimation({
    animation: secondaryAnimation,
    animationStatus: secondaryAnimationStatus,
    curve: Curves.fastOutSlowIn,
  });

  const handlePrimaryAnimation = () => {
    'worklet';
    const t = cPrimary.value;
    const transX = (1 - t) * W;
    const linearT = primaryAnimation.value;
    const skew = (1 - linearT) * -8;
    return { transform: `translateX(${transX}px) skewX(${skew}deg)` };
  };

  const handleSecondaryAnimation = () => {
    'worklet';
    const t = cSecondary.value;
    const transX = -t * 80;
    const opacity = 1 - 0.36 * t;
    return { transform: `translateX(${transX}px)`, opacity };
  };

  return { handlePrimaryAnimation, handleSecondaryAnimation };
}

let registered = false;
function registerRoutes() {
  if (registered) return;
  if (!wx.router || !wx.router.addRouteBuilder) return;
  try {
    wx.router.addRouteBuilder('p5-slash', p5SlashRouteBuilder);
    registered = true;
  } catch (e) {
    console.warn('p5-slash route register failed', e);
  }
}

module.exports = { registerRoutes };
