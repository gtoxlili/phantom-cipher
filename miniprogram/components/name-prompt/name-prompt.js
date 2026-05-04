const { pickRandomCodename } = require('../../lib/codenames');
const wxapi = require('../../lib/wx');

Component({
  properties: {
    code: { type: String, value: '' },
  },
  data: {
    draft: '',
    lastIdx: -1,
    error: '',
    submitting: false,
  },
  methods: {
    onInput(e) {
      this.setData({ draft: e.detail.value, error: '' });
    },
    onShuffle() {
      const { name, index } = pickRandomCodename(this.data.lastIdx);
      this.setData({ draft: name, lastIdx: index, error: '' });
    },
    async onSubmit() {
      if (this.data.submitting) return;
      const n = (this.data.draft || '').trim();
      if (!n) return;
      this.setData({ submitting: true });
      try {
        const r = await wxapi.secCheck(n, 1);
        if (r && r.pass === false) {
          this.setData({ error: '该代号含违规内容', submitting: false });
          return;
        }
      } catch (e) { /* fallback pass */ }
      this.setData({ submitting: false });
      this.triggerEvent('submit', { name: n });
    },
    onCancel() {
      this.triggerEvent('cancel', {});
    },
  },
});
