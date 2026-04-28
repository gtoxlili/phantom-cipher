'use client';

import { useAtom, useAtomValue } from 'jotai';
import { publicStateAtom, showLogAtom } from '@/lib/atoms';
import clsx from 'clsx';
import * as s from './LogPanel.css';

export function LogPanel() {
  const [showLog, setShowLog] = useAtom(showLogAtom);
  const state = useAtomValue(publicStateAtom);

  if (!showLog || !state) return null;
  const close = () => setShowLog(false);

  return (
    <div className={s.backdrop} onClick={close}>
      <aside className={s.panel} onClick={(e) => e.stopPropagation()}>
        <header className={s.header}>
          <h3 className={s.title}>对局记事 LOG</h3>
          <button className={s.closeBtn} onClick={close} aria-label="关闭" type="button">
            ×
          </button>
        </header>
        <ul className={s.list}>
          {[...state.log].reverse().map((e) => (
            <li key={e.id} className={s.entry}>{e.text}</li>
          ))}
          {state.log.length === 0 && <li className={clsx(s.entry, s.empty)}>NO RECORDS</li>}
        </ul>
      </aside>
    </div>
  );
}
