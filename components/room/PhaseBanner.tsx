'use client';

import { useAtomValue } from 'jotai';
import { connectedAtom, gameViewAtom } from '@/lib/atoms';
import * as s from './PhaseBanner.css';

type Mood = 'idle' | 'turn' | 'wait' | 'end';

interface PhaseInfo {
  text: string;
  accent: string;
  mood: Mood;
}

export function PhaseBanner() {
  const v = useAtomValue(gameViewAtom);
  const connected = useAtomValue(connectedAtom);
  const info = computePhaseInfo(v, connected);

  return (
    <div className={s.banner} key={`${info.mood}-${info.text}`}>
      <div className={s.inner[info.mood]}>
        <span className={s.text[info.mood]}>
          {info.accent && <span className={s.accent[info.mood]}>{info.accent}</span>}
          {info.text}
          {info.accent && <span className={s.accent[info.mood]}>{info.accent}</span>}
        </span>
      </div>
    </div>
  );
}

function computePhaseInfo(v: ReturnType<typeof useAtomValue<typeof gameViewAtom>>, connected: boolean): PhaseInfo {
  if (!connected) return { text: 'CONNECTING', accent: '', mood: 'idle' };
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
  const action = { drawing: 'DRAWING', placing: 'PLACING', guessing: 'GUESSING', continuing: 'DECIDING' }[v.state.phase] ?? '';
  return {
    text: `${cur?.name?.toUpperCase() ?? '?'} ${action}`,
    accent: '·',
    mood: 'wait',
  };
}
