const store = require('../../lib/store');

Component({
  properties: {
    items: { type: Array, value: [] },
    topOffset: { type: Number, value: 50 },
  },
  methods: {
    onTap(e) {
      const id = e.currentTarget.dataset.id;
      store.dismissNotification(id);
    },
  },
});
