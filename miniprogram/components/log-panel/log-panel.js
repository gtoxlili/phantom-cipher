Component({
  properties: {
    visible: { type: Boolean, value: false },
    entries: { type: Array, value: [] },     // [{id, text, ts}, ...]
    safeTop: { type: Number, value: 44 },
    safeBottom: { type: Number, value: 0 },
  },
  data: { reversed: [] },
  observers: {
    'entries': function (entries) {
      this.setData({ reversed: entries ? [...entries].reverse() : [] });
    },
  },
  methods: {
    onClose() { this.triggerEvent('close', {}); },
    onPanelTap(e) { e.stopPropagation && e.stopPropagation(); },
  },
});
