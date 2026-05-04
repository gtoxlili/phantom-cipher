/**
 * 数字 picker 底部弹窗。
 *
 * 关键约束：applyAnimatedStyle 必须能找到目标节点，所以不能用 wx:if 把
 * 元素挂在条件渲染下——attached() 跑的时候节点还不在 DOM 里就会报
 * "applyAnimatedStyle can not find valid element"。
 *
 * 改为永远 mount 完整结构，靠 worklet 共享变量控制 sheetY / backOpacity
 * 让它"看起来"在屏幕外。可点击性靠 pointer-events 切换。
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
  },

  observers: {
    'visible': function (vis) {
      if (vis) {
        this._enter();
      } else {
        this._exit();
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

    _exit() {
      const ease = Easing.in(Easing.cubic);
      this._backOpacity.value = timing(0, { duration: 180, easing: ease });
      this._sheetY.value = timing(900, { duration: 200, easing: ease });
    },

    _emitClose() {
      this.triggerEvent('close', {});
    },

    onClose() {
      // worklet 先滑出，然后回 JS 让 parent 把 visible 置 false
      const ease = Easing.in(Easing.cubic);
      const onClose = this._emitClose.bind(this);
      this._backOpacity.value = timing(0, { duration: 180, easing: ease });
      this._sheetY.value = timing(900, { duration: 200, easing: ease }, (finished) => {
        'worklet';
        if (finished) runOnJS(onClose)();
      });
    },

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
      if (evt.state === GestureState.ACTIVE) {
        const next = this._sheetY.value + evt.deltaY;
        this._sheetY.value = next < 0 ? 0 : next;
      } else if (evt.state === GestureState.END || evt.state === GestureState.CANCELLED) {
        const onClose = this._emitClose.bind(this);
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
