import { onCleanup, onMount } from 'solid-js';
import { Key } from '@solid-primitives/keyed';
import { Motion, Presence } from 'solid-motionone';
import { spring } from '@motionone/dom';
import { dismissNotification, notifications } from '@/stores/game';
import * as s from './NotificationStack.css';

export function NotificationStack() {
  return (
    <div class={s.stack}>
      <Presence>
        <Key each={notifications} by="id">
          {(n) => <NotificationItem id={n().id} text={n().text} />}
        </Key>
      </Presence>
    </div>
  );
}

function NotificationItem(props: { id: number; text: string }) {
  let timer: number | undefined;
  onMount(() => {
    timer = window.setTimeout(() => dismissNotification(props.id), 2800);
  });
  onCleanup(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  return (
    <Motion.div
      // wrapper-only animation so the inner toast keeps its CSS skewX(-8deg)
      initial={{ opacity: 0, x: -60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ easing: spring({ stiffness: 380, damping: 26 }) }}
      press={{ scale: 0.95 }}
    >
      <div class={s.toast} onClick={() => dismissNotification(props.id)}>
        <span>{props.text}</span>
      </div>
    </Motion.div>
  );
}
