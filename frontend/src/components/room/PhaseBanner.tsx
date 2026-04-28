import { createMemo, For, Show } from 'solid-js';
import { connected, gameView, type GameView } from '@/stores/game';
import * as s from './PhaseBanner.css';

type Mood = 'idle' | 'turn' | 'wait' | 'end';

interface PhaseInfo {
  text: string;
  accent: string;
  mood: Mood;
}

interface KeyedPhaseInfo extends PhaseInfo {
  key: string;
}

export function PhaseBanner() {
  const info = createMemo<KeyedPhaseInfo>(() => {
    const i = computePhaseInfo(gameView(), connected());
    return { ...i, key: `${i.mood}-${i.text}` };
  });

  // Re-mount the inner div when the key changes so the streakIn keyframe
  // replays — the React original did this with `key={...}` on the wrapper.
  // Without remount, animation-name doesn't change between class swaps
  // and the entrance animation never runs again after the first mount.
  //
  // Strategy: wrap `info()` in a memo whose `equals` compares the key
  // string. The memo only re-publishes a new reference when the key
  // string actually changes; <For> then detects that as a new array
  // entry and remounts the child.
  const items = createMemo<KeyedPhaseInfo[]>(
    () => [info()],
    [info()],
    { equals: (prev, next) => prev[0]?.key === next[0]?.key },
  );

  return (
    <div class={s.banner}>
      <For each={items()}>
        {(i) => (
          <div class={s.inner[i.mood]}>
            <span class={s.text[i.mood]}>
              <Show when={i.accent}>
                <span class={s.accent[i.mood]}>{i.accent}</span>
              </Show>
              {i.text}
              <Show when={i.accent}>
                <span class={s.accent[i.mood]}>{i.accent}</span>
              </Show>
            </span>
          </div>
        )}
      </For>
    </div>
  );
}

function computePhaseInfo(v: GameView, isConnected: boolean): PhaseInfo {
  if (!isConnected) return { text: 'CONNECTING', accent: '', mood: 'idle' };
  if (!v.state) return { text: 'LOADING', accent: '', mood: 'idle' };

  if (v.state.phase === 'waiting') {
    const n = v.state.players.length;
    // Game accepts 2–4 players; show that explicitly so "2/4" doesn't
    // read as "need to reach 4 to start".
    if (n < 2) {
      return { text: 'WAITING · 等待 2–4 玩家', accent: `${n}/2`, mood: 'idle' };
    }
    // ︎ (Variation Selector-15) appended to ambiguous chars
    // forces text presentation on iOS Safari — without it ▶︎/★︎/⚠︎
    // fall back to colored Apple emoji glyphs.
    return { text: `READY · ${n} 玩家就位 · 房主开局`, accent: '▶︎', mood: 'turn' };
  }
  if (v.state.phase === 'ended') {
    const winner = v.state.players.find((p) => p.id === v.state!.winnerId);
    return {
      text: winner ? `${winner.name.toUpperCase()} WINS` : 'GAME OVER',
      accent: '★︎',
      mood: 'end',
    };
  }
  if (v.isMyTurn) {
    let text = 'YOUR TURN';
    if (v.canDraw) text = '你的回合 / DRAW';
    else if (v.state.phase === 'placing') text = '放置赖子 / PLACE JOKER';
    else if (v.canGuess && v.state.phase === 'continuing') text = '继续 OR 收手';
    else if (v.canGuess) text = '选一块 PICK A TILE';
    return { text, accent: '▶︎', mood: 'turn' };
  }
  const cur = v.state.players.find((p) => p.id === v.state!.currentPlayerId);
  const action = ({ drawing: 'DRAWING', placing: 'PLACING', guessing: 'GUESSING', continuing: 'DECIDING' } as Record<string, string>)[v.state.phase] ?? '';
  return {
    text: `${cur?.name?.toUpperCase() ?? '?'} ${action}`,
    accent: '·',
    mood: 'wait',
  };
}
