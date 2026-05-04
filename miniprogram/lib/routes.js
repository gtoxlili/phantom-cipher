/**
 * 自定义路由 builder：P5 风格的"斩入"转场。
 *
 * 视觉构造（primaryAnimation 0→1 进入，1→0 退出）：
 *   - 新页面从右侧推入：translateX(W → 0)
 *   - 同时带 -8° → 0° 的 skewX，模拟 P5 那种"刀光劈下来"的运动错位
 *   - 短暂的红色斜条扫描带由页面自己渲染（路由层只控制页面级 transform）
 *
 * 旧页面（A 页 secondaryAnimation 0→1）：
 *   - 微微左移 + 暗化，让用户感知到层级被推到背景
 */

const { Curves, CurveAnimation } = require('./curves');

function p5SlashRouteBuilder(ctx) {
  const { primaryAnimation, primaryAnimationStatus, secondaryAnimation, secondaryAnimationStatus } = ctx;
  let W = 375;
  try {
    const win = wx.getWindowInfo();
    if (win && win.windowWidth) W = win.windowWidth;
  } catch (e) { /* ignore */ }

  // 进入曲线：开局快、收尾稳定
  const cPrimary = CurveAnimation({
    animation: primaryAnimation,
    animationStatus: primaryAnimationStatus,
    curve: Curves.fastLinearToSlowEaseIn,
    reverseCurve: Curves.easeInToLinear,
  });

  const handlePrimaryAnimation = () => {
    'worklet';
    const t = cPrimary.value;
    const transX = (1 - t) * W;
    // skew 单独走线性，不跟着曲线晃，否则结尾会闪一下
    const linearT = primaryAnimation.value;
    const skew = (1 - linearT) * -8;
    return {
      transform: `translateX(${transX}px) skewX(${skew}deg)`,
    };
  };

  const cSecondary = CurveAnimation({
    animation: secondaryAnimation,
    animationStatus: secondaryAnimationStatus,
    curve: Curves.fastOutSlowIn,
  });

  const handleSecondaryAnimation = () => {
    'worklet';
    const t = cSecondary.value;
    const transX = -t * 80;
    const opacity = 1 - 0.36 * t;
    return {
      transform: `translateX(${transX}px)`,
      opacity,
    };
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
