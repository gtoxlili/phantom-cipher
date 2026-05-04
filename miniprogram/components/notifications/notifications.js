const store = require('../../lib/store');

Component({
  properties: {
    items: { type: Array, value: [] },
  },
  methods: {
    onTap(e) {
      const id = e.currentTarget.dataset.id;
      store.dismissNotification(id);
    },
  },
});
