import { createSignal } from 'solid-js';
import { ArrowLeftIcon, PlayIcon, SparkleIcon } from '@/components/icons';
import { Sketch } from '@/components/Sketch';
import { currentRoomCode, setMyName } from '@/stores/game';
import { pickRandomCodename } from '@/lib/codenames';
import * as s from './NamePromptView.css';

export function NamePromptView(props: { onCancel: () => void }) {
  const [draft, setDraft] = createSignal('');
  // Don't pick the same codename twice in a row — keep shuffling fresh.
  let lastIdx = -1;

  const submit = () => {
    const n = draft().trim();
    if (!n) return;
    setMyName(n);
  };

  const shuffle = () => {
    const { name: picked, index } = pickRandomCodename(lastIdx);
    lastIdx = index;
    setDraft(picked);
  };

  return (
    <main class={s.main}>
      <Sketch />
      <div class={s.card}>
        <div class={s.eyebrow}>· ROOM · {currentRoomCode()} ·</div>
        <h2 class={s.heading}>取一个代号</h2>
        <p class={s.lead}>朋友邀你入局，先告诉大家你的称呼。</p>
        <input
          class={s.input}
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          placeholder="JOKER"
          maxLength={16}
          autofocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button class={s.shuffleBtn} onClick={shuffle} type="button">
          <span class={s.shuffleIcon}><SparkleIcon size="1em" /></span>
          <span>随机代号 / SHUFFLE</span>
          <span class={s.shuffleIcon}><SparkleIcon size="1em" /></span>
        </button>
        <button
          class={s.submit}
          onClick={submit}
          disabled={!draft().trim()}
          style={{ display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', gap: '0.35em' }}
        >
          入局<PlayIcon size="0.85em" />
        </button>
        <button
          class={s.linkBtn}
          onClick={props.onCancel}
          style={{ display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', gap: '0.35em' }}
        >
          <ArrowLeftIcon size="0.9em" />BACK TO LOBBY
        </button>
      </div>
    </main>
  );
}
