'use client';

import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { dismissNotificationAtom, notificationsAtom } from '@/lib/atoms';
import * as s from './NotificationStack.css';

export function NotificationStack() {
  const notifications = useAtomValue(notificationsAtom);
  return (
    <div className={s.stack}>
      <AnimatePresence>
        {notifications.map((n) => (
          <NotificationItem key={n.id} id={n.id} text={n.text} />
        ))}
      </AnimatePresence>
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
    <motion.div
      // wrapper-only animation so the inner toast keeps its CSS skewX(-8deg)
      initial={{ opacity: 0, x: -60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={s.toast} onClick={() => dismiss(id)}>
        <span>{text}</span>
      </div>
    </motion.div>
  );
}
