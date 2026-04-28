'use client';

import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { dismissNotificationAtom, notificationsAtom } from '@/lib/atoms';
import * as s from './NotificationStack.css';

export function NotificationStack() {
  const notifications = useAtomValue(notificationsAtom);
  if (notifications.length === 0) return null;
  return (
    <div className={s.stack}>
      {notifications.map((n) => (
        <NotificationItem key={n.id} id={n.id} text={n.text} />
      ))}
    </div>
  );
}

function NotificationItem({ id, text }: { id: number; text: string }) {
  const dismiss = useSetAtom(dismissNotificationAtom);
  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 2800);
    return () => clearTimeout(t);
  }, [id, dismiss]);
  return (
    <div className={s.toast} onClick={() => dismiss(id)}>
      <span>{text}</span>
    </div>
  );
}
