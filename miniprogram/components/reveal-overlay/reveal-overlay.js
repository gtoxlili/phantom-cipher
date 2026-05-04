/**
 * Reveal overlay —— 翻牌结果的浮层。
 *
 * 全 worklet 驱动：两条红/金对角线从屏幕外横扫进来，中间的红字 ribbon
 * 弹簧式爆出。CSS keyframes 不够"砍人"——worklet 在 UI 线程跑，能在
 * 100ms 内打到位，配 spring 的反弹收尾才像 P5 attack screen 那种感觉。
 */

const { shared, timing, spring, Easing } = wx.worklet;

Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    visible: { type: Boolean, value: false },
    correct: { type: Boolean, value: false },
    text: { type: String, value: '' },
  },
  data: {
    /** mirror visible into data so wxml wx:if reflects it */
    show: false,
  },

  observers: {
    'visible': function (vis) {
      this.setData({ show: !!vis });
      if (vis) {
        // 下一帧再启动动画，确保 applyAnimatedStyle 已经挂上节点
        wx.nextTick(() => this._playEnter());
      }
    },
  },

  lifetimes: {
    attached() {
      // 共享变量初始化在屏幕外
      this._barTopX = shared(-110);
      this._barBottomX = shared(110);
      this._ribbonScale = shared(0.4);
      this._ribbonOpacity = shared(0);
      this._bgOpacity = shared(0);

      this.applyAnimatedStyle('#reveal-bar-top', () => {
        'worklet';
        return {
          transform: `translateX(${this._barTopX.value}%) skewX(-22deg)`,
        };
      });
      this.applyAnimatedStyle('#reveal-bar-bottom', () => {
        'worklet';
        return {
          transform: `translateX(${this._barBottomX.value}%) skewX(-22deg)`,
        };
      });
      this.applyAnimatedStyle('#reveal-ribbon', () => {
        'worklet';
        return {
          opacity: this._ribbonOpacity.value,
          transform: `skewX(-9deg) scale(${this._ribbonScale.value})`,
        };
      });
      this.applyAnimatedStyle('#reveal-bg', () => {
        'worklet';
        return {
          opacity: this._bgOpacity.value,
        };
      });
    },
  },

  methods: {
    _playEnter() {
      const fastEase = Easing.cubicBezier(0.18, 1.0, 0.04, 1.0);
      // 重置初值：快速回到屏幕外（取消上一轮可能未结束的动画）
      this._barTopX.value = -110;
      this._barBottomX.value = 110;
      this._ribbonScale.value = 0.4;
      this._ribbonOpacity.value = 0;
      this._bgOpacity.value = 0;

      // 背景闪一下黑：120ms 升到 0.55 -> 480ms 降回 0
      this._bgOpacity.value = timing(0.55, { duration: 120, easing: fastEase }, () => {
        'worklet';
        this._bgOpacity.value = timing(0, { duration: 480, easing: Easing.in(Easing.quad) });
      });

      // 两条对角红/金条：280ms 同步扫到屏幕中心，再 480ms 滑出
      this._barTopX.value = timing(0, { duration: 240, easing: fastEase }, () => {
        'worklet';
        this._barTopX.value = timing(110, { duration: 520, easing: Easing.in(Easing.cubic) });
      });
      this._barBottomX.value = timing(0, { duration: 240, easing: fastEase }, () => {
        'worklet';
        this._barBottomX.value = timing(-110, { duration: 520, easing: Easing.in(Easing.cubic) });
      });

      // ribbon：晚一点(120ms)爆出，spring overshoot 后稳定
      this._ribbonOpacity.value = timing(1, { duration: 80, easing: fastEase });
      this._ribbonScale.value = spring(1, {
        damping: 8,
        stiffness: 220,
        mass: 0.7,
      });
    },
  },
});
