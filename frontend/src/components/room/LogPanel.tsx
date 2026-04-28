import { Show } from 'solid-js';
import { Key } from '@solid-primitives/keyed';
import clsx from 'clsx';
import { publicState, setShowLog, showLog } from '@/stores/game';
import * as s from './LogPanel.css';

export function LogPanel() {
  const close = () => setShowLog(false);

  return (
    <Show when={showLog() && publicState()}>
      <div class={s.backdrop} onClick={close}>
        <aside class={s.panel} onClick={(e) => e.stopPropagation()}>
          <header class={s.header}>
            <h3 class={s.title}>对局记事 LOG</h3>
            <button class={s.closeBtn} onClick={close} aria-label="关闭" type="button">
              ×
            </button>
          </header>
          <ul class={s.list}>
            <Key each={[...publicState()!.log].reverse()} by="id">
              {(e) => <li class={s.entry}>{e().text}</li>}
            </Key>
            <Show when={publicState()!.log.length === 0}>
              <li class={clsx(s.entry, s.empty)}>NO RECORDS</li>
            </Show>
          </ul>
        </aside>
      </div>
    </Show>
  );
}
