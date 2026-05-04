/**
 * 数字 picker 底部弹窗。
 *
 * 入场 / 拖拽下滑关闭都用 worklet 驱动：
 *   - attached 时设 sheetY 为 110%（屏幕外下方），spring 进入到 0
 *   - 用户向下拖：vertical-drag-gesture-handler → ACTIVE 阶段直接累加
 *     deltaY 到 sheetY；END 时按位移和速度判定关 / 弹回
 *   - 关闭：timing 滑出后 runOnJS 触发 close 事件
 */

const { shared, timing, spring, runOnJS, Easing } = wx.worklet;
const { GestureState } = require('../../lib/curves');

Component({
  options: { multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    targetName: { type: String, value: '' },
    position: { type: Number, value: 0 },
    color: { type: String, value: 'black' },
    safeBottom: { type: Number, value: 0 },
  },
  data: {
    nums: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    show: false,
  },

  observers: {
    'visible': function (vis) {
      if (vis) {
        this.setData({ show: true });
        wx.nextTick(() => this._enter());
      } else {
        // 父组件直接置 false 时也要把动画状态归位，避免下次 attach 残留
        this.setData({ show: false });
      }
    },
  },

  lifetimes: {
    attached() {
      this._sheetY = shared(800);
      this._backOpacity = shared(0);
      this.applyAnimatedStyle('#picker-sheet', () => {
        'worklet';
        return { transform: `translateY(${this._sheetY.value}px)` };
      });
      this.applyAnimatedStyle('#picker-back', () => {
        'worklet';
        return { opacity: this._backOpacity.value };
      });
    },
  },

  methods: {
    _enter() {
      const ease = Easing.cubicBezier(0.18, 1.0, 0.04, 1.0);
      this._sheetY.value = 800;
      this._backOpacity.value = 0;
      this._backOpacity.value = timing(1, { duration: 200, easing: ease });
      this._sheetY.value = spring(0, { damping: 22, stiffness: 240, mass: 0.8 });
    },

    _emitClose() {
      this.triggerEvent('close', {});
    },

    _dismiss() {
      // worklet → 滑出 → runOnJS 弹 close
      const ease = Easing.in(Easing.cubic);
      const onClose = this._emitClose.bind(this);
      this._backOpacity.value = timing(0, { duration: 180, easing: ease });
      this._sheetY.value = timing(900, { duration: 200, easing: ease }, (finished) => {
        'worklet';
        if (finished) runOnJS(onClose)();
      });
    },

    onClose() { this._dismiss(); },

    onPick(e) {
      const n = e.currentTarget.dataset.n;
      this.triggerEvent('pick', { number: n });
    },
    onJoker() {
      this.triggerEvent('pick', { number: null });
    },
    onSheetTap(e) { e.stopPropagation && e.stopPropagation(); },

    handleVerticalDrag(evt) {
      'worklet';
      if (evt.state === GestureState.BEGIN) {
        // 拖动开始无需特别处理，直接累加 deltaY
      } else if (evt.state === GestureState.ACTIVE) {
        const next = this._sheetY.value + evt.deltaY;
        // 不允许往上拖（超过原位）
        this._sheetY.value = next < 0 ? 0 : next;
      } else if (evt.state === GestureState.END || evt.state === GestureState.CANCELLED) {
        const onClose = this._emitClose.bind(this);
        // 触发关闭：拖了 ≥ 120px 或下滑速度 ≥ 800 px/s
        const shouldDismiss = this._sheetY.value > 120 || evt.velocityY > 800;
        if (shouldDismiss) {
          this._backOpacity.value = timing(0, { duration: 180 });
          this._sheetY.value = timing(900, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
            'worklet';
            if (finished) runOnJS(onClose)();
          });
        } else {
          this._sheetY.value = spring(0, {
            damping: 22, stiffness: 260, mass: 0.7,
            velocity: evt.velocityY,
          });
        }
      }
    },
  },
});
