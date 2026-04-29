import { createSignal, Show } from 'solid-js';
import { CheckIcon } from '@/components/icons';
import { connected, currentRoomCode, setShowLog } from '@/stores/game';
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
      {/*
        WS 连接状态指示器。connected=true 时整个元素 hidden（aria 也
        hidden），不抢视觉。一旦掉线立刻在 code label 旁亮起 blood
        色 chip + pulsing dot，玩家能感知到"正在重连"——之前默默
        重连导致 UI 看似卡死，玩家以为 bug。
      */}
      <Show when={!connected()}>
        <div class={s.disconnected} role="status" aria-live="polite">
          <span class={s.dot} aria-hidden="true" />
          <span>RECONNECTING</span>
        </div>
      </Show>
      <button class={s.iconBtn} onClick={() => setShowLog((v) => !v)} aria-label="日志">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </header>
  );
}
