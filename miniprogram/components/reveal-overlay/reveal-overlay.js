/**
 * Reveal overlay —— 翻牌结果浮层（HIT! / MISS!）。
 *
 * 全 worklet 驱动：两条对角线扫入 → 红字 ribbon spring 爆出 → 黑底闪一下
 * → bars 滑出 → 等 visible 变 false 时 ribbon 淡出。
 *
 * 重要：永远 mount，不用 wx:if，否则 attached 跑 applyAnimatedStyle
 * 时元素不在 DOM 里。视觉初始态由 worklet 共享变量初值决定。
 */

const { shared, timing, spring, Easing } = wx.worklet;

Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    visible: { type: Boolean, value: false },
    correct: { type: Boolean, value: false },
    text: { type: String, value: '' },
  },

  observers: {
    'visible': function (vis) {
      if (vis) {
        this._playEnter();
      } else {
        this._playExit();
      }
    },
  },

  lifetimes: {
    attached() {
      this._barTopX = shared(-110);
      this._barBottomX = shared(110);
      this._ribbonScale = shared(0.4);
      this._ribbonOpacity = shared(0);
      this._bgOpacity = shared(0);

      this.applyAnimatedStyle('#reveal-bar-top', () => {
        'worklet';
        return { transform: `translateX(${this._barTopX.value}%) skewX(-22deg)` };
      });
      this.applyAnimatedStyle('#reveal-bar-bottom', () => {
        'worklet';
        return { transform: `translateX(${this._barBottomX.value}%) skewX(-22deg)` };
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
        return { opacity: this._bgOpacity.value };
      });
    },
  },

  methods: {
    _playEnter() {
      const fastEase = Easing.cubicBezier(0.18, 1.0, 0.04, 1.0);
      this._barTopX.value = -110;
      this._barBottomX.value = 110;
      this._ribbonScale.value = 0.4;
      this._ribbonOpacity.value = 0;
      this._bgOpacity.value = 0;

      this._bgOpacity.value = timing(0.55, { duration: 120, easing: fastEase }, () => {
        'worklet';
        this._bgOpacity.value = timing(0, { duration: 480, easing: Easing.in(Easing.quad) });
      });

      this._barTopX.value = timing(0, { duration: 240, easing: fastEase }, () => {
        'worklet';
        this._barTopX.value = timing(110, { duration: 520, easing: Easing.in(Easing.cubic) });
      });
      this._barBottomX.value = timing(0, { duration: 240, easing: fastEase }, () => {
        'worklet';
        this._barBottomX.value = timing(-110, { duration: 520, easing: Easing.in(Easing.cubic) });
      });

      this._ribbonOpacity.value = timing(1, { duration: 80, easing: fastEase });
      this._ribbonScale.value = spring(1, {
        damping: 8, stiffness: 220, mass: 0.7,
      });
    },

    _playExit() {
      // 父组件 1.5s 后 set visible=false 触发：把还显形的 ribbon 淡掉，
      // 顺便把所有共享值归位到屏幕外，下一次进入再重置
      this._ribbonOpacity.value = timing(0, { duration: 220, easing: Easing.in(Easing.quad) });
      this._bgOpacity.value = timing(0, { duration: 200 });
    },
  },
});
