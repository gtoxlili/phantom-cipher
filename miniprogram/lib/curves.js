/**
 * Easing 曲线 + 工具，路由 builder / 自定义动画都共用。
 *
 * 注意：早期 access wx.worklet 可能触发 Skyline 内部 __subscribe_webviewId
 * 报错（页面还没 ready 就调它）。这里全部走 lazy getter，模块 require 阶段
 * 不碰 wx.worklet。
 */

let _Curves = null;
let _CurveAnimation = null;

function _ensureWorkletDeps() {
  if (_Curves) return;
  const w = wx.worklet || {};
  const Easing = w.Easing;
  const derived = w.derived;
  if (!Easing || !derived) {
    // 在 Skyline 还没 ready 的时候访问会拿不到，让调用方稍后再试
    return;
  }
  _Curves = {
    fastLinearToSlowEaseIn: Easing.cubicBezier(0.18, 1.0, 0.04, 1.0),
    linearToEaseOut: Easing.cubicBezier(0.35, 0.91, 0.33, 0.97),
    easeInToLinear: Easing.cubicBezier(0.67, 0.03, 0.65, 0.09),
    fastOutSlowIn: Easing.cubicBezier(0.4, 0.0, 0.2, 1.0),
  };
  _CurveAnimation = function CurveAnimation(opts) {
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
  };
}

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

module.exports = {
  AnimationStatus,
  GestureState,
  get Curves() {
    _ensureWorkletDeps();
    return _Curves;
  },
  CurveAnimation: function (opts) {
    _ensureWorkletDeps();
    return _CurveAnimation(opts);
  },
};
