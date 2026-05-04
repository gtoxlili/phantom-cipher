Component({
  properties: {
    visible: { type: Boolean, value: false },
    entries: { type: Array, value: [] },     // [{id, text, ts}, ...]
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
