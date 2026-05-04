const { pickRandomCodename } = require('../../lib/codenames');

Component({
  properties: {
    code: { type: String, value: '' },
  },
  data: {
    draft: '',
    lastIdx: -1,
  },
  methods: {
    onInput(e) {
      this.setData({ draft: e.detail.value });
    },
    onShuffle() {
      const { name, index } = pickRandomCodename(this.data.lastIdx);
      this.setData({ draft: name, lastIdx: index });
    },
    onSubmit() {
      const n = (this.data.draft || '').trim();
      if (!n) return;
      this.triggerEvent('submit', { name: n });
    },
    onCancel() {
      this.triggerEvent('cancel', {});
    },
  },
});
