/**
 * Easing 曲线 + AnimationStatus 工具，路由 builder / 自定义动画都共用。
 * 文件级单例：Easing 在 worklet 上下文也能直接 require 拿到（编译期
 * 静态注入）。
 */

const { Easing, derived } = wx.worklet;

const Curves = {
  // P5 的"砍下来"那种快速冲入再轻微反弹的感觉：开局快、收尾稳
  fastLinearToSlowEaseIn: Easing.cubicBezier(0.18, 1.0, 0.04, 1.0),
  linearToEaseOut: Easing.cubicBezier(0.35, 0.91, 0.33, 0.97),
  easeInToLinear: Easing.cubicBezier(0.67, 0.03, 0.65, 0.09),
  fastOutSlowIn: Easing.cubicBezier(0.4, 0.0, 0.2, 1.0),
};

const AnimationStatus = {
  dismissed: 0,
  forward: 1,
  reverse: 2,
  completed: 3,
};

const GestureState = {
  POSSIBLE: 0,
  BEGIN: 1,
  ACTIVE: 2,
  END: 3,
  CANCELLED: 4,
};

function CurveAnimation(opts) {
  const { animation, animationStatus, curve, reverseCurve } = opts;
  return derived(() => {
    'worklet';
    const useForward =
      !reverseCurve || animationStatus.value !== AnimationStatus.reverse;
    const c = useForward ? curve : reverseCurve;
    const t = animation.value;
    if (!c) return t;
    if (t === 0 || t === 1) return t;
    return c(t);
  });
}

module.exports = { Curves, AnimationStatus, GestureState, CurveAnimation };
