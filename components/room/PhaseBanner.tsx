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
    return { text: 'WAITING FOR PLAYERS', accent: `${v.state.players.length}/4`, mood: 'idle' };
  }
  if (v.state.phase === 'ended') {
    const winner = v.state.players.find((p) => p.id === v.state!.winnerId);
    return {
      text: winner ? `${winner.name.toUpperCase()} WINS` : 'GAME OVER',
      accent: '★',
      mood: 'end',
    };
  }
  if (v.isMyTurn) {
    let text = 'YOUR TURN';
    if (v.canDraw) text = '你的回合 / DRAW';
    else if (v.canGuess && v.state.phase === 'continuing') text = '继续 OR 收手';
    else if (v.canGuess) text = '选一块 PICK A TILE';
    return { text, accent: '▶', mood: 'turn' };
  }
  const cur = v.state.players.find((p) => p.id === v.state!.currentPlayerId);
  const action = { drawing: 'DRAWING', guessing: 'GUESSING', continuing: 'DECIDING' }[v.state.phase] ?? '';
  return {
    text: `${cur?.name?.toUpperCase() ?? '?'} ${action}`,
    accent: '·',
    mood: 'wait',
  };
}
