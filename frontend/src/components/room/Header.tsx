import { createSignal, Show } from 'solid-js';
import { CheckIcon } from '@/components/icons';
import { currentRoomCode, setShowLog } from '@/stores/game';
import * as s from './Header.css';

export function Header(props: { onBack: () => void }) {
  const [copied, setCopied] = createSignal(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${currentRoomCode()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header class={s.header}>
      <button class={s.iconBtn} onClick={props.onBack} aria-label="返回">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M12 4 L6 10 L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class={s.codeWrap} onClick={copyLink}>
        <span class={s.codeLabel}>· CIPHER KEY ·</span>
        <span class={s.code}>{currentRoomCode()}</span>
        <span
          class={s.copyHint}
          style={copied() ? { display: 'inline-flex', 'align-items': 'center', gap: '0.35em' } : undefined}
        >
          <Show when={copied()} fallback={'TAP TO SHARE'}>
            COPIED<CheckIcon size="0.9em" />
          </Show>
        </span>
      </div>
      <button class={s.iconBtn} onClick={() => setShowLog((v) => !v)} aria-label="日志">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </header>
  );
}
