// Toast 队列。容量上限 5 条，新进来的把最早的挤出去——避免
// "网络抖动一下"或者"连续 422 错误"刷出十几条堆叠的 toast。

import { createStore, produce } from 'solid-js/store';

export interface Notification {
  id: number;
  text: string;
  ts: number;
}

const QUEUE_CAP = 5;
let nextId = 0;

export const [notifications, setNotifications] = createStore<Notification[]>([]);

export function pushNotification(text: string) {
  setNotifications(
    produce((draft) => {
      draft.push({ id: ++nextId, text, ts: Date.now() });
      while (draft.length > QUEUE_CAP) draft.shift();
    }),
  );
}

export function dismissNotification(id: number) {
  setNotifications((arr) => arr.filter((n) => n.id !== id));
}
