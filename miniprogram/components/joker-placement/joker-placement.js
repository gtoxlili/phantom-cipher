const { shared, timing, spring, Easing } = wx.worklet;
const { GestureState } = require('../../lib/curves');

Component({
  options: { multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    pendingColor: { type: String, value: 'black' },
    others: { type: Array, value: [] },
    safeBottom: { type: Number, value: 0 },
  },
  data: {
    slots: [],
  },
  observers: {
    'others': function (others) {
      const len = (others ? others.length : 0) + 1;
      this.setData({ slots: Array.from({ length: len }, (_, i) => i) });
    },
    'visible': function (vis) {
      if (vis) this._enter();
      else this._exit();
    },
  },
  lifetimes: {
    attached() {
      this._sheetY = shared(800);
      this._backOpacity = shared(0);
      this.applyAnimatedStyle('#joker-sheet', () => {
        'worklet';
        return { transform: `translateY(${this._sheetY.value}px)` };
      });
      this.applyAnimatedStyle('#joker-back', () => {
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

    onSlot(e) {
      const pos = e.currentTarget.dataset.pos;
      this.triggerEvent('place', { position: pos });
    },
    onSheetTap(e) { e.stopPropagation && e.stopPropagation(); },

    handleVerticalDrag(evt) {
      'worklet';
      if (evt.state === GestureState.ACTIVE) {
        const next = this._sheetY.value + evt.deltaY;
        this._sheetY.value = next < 0 ? 0 : next;
      } else if (evt.state === GestureState.END || evt.state === GestureState.CANCELLED) {
        // joker placement 强制要求选位置——不允许真关闭，下拉只回弹
        this._sheetY.value = spring(0, {
          damping: 22, stiffness: 260, mass: 0.7,
          velocity: evt.velocityY,
        });
      }
    },
  },
});
