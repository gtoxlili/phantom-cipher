'use client';

import { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Sketch } from '@/components/Sketch';
import { currentRoomCodeAtom, myNameAtom } from '@/lib/atoms';
import { pickRandomCodename } from '@/lib/codenames';
import * as s from './NamePromptView.css';

export function NamePromptView({ onCancel }: { onCancel: () => void }) {
  const code = useAtomValue(currentRoomCodeAtom);
  const setName = useSetAtom(myNameAtom);
  const [draft, setDraft] = useState('');
  // Don't pick the same codename twice in a row — keep shuffling fresh.
  const lastIdxRef = useRef(-1);

  const submit = () => {
    const n = draft.trim();
    if (!n) return;
    setName(n);
  };

  const shuffle = () => {
    const { name: picked, index } = pickRandomCodename(lastIdxRef.current);
    lastIdxRef.current = index;
    setDraft(picked);
  };

  return (
    <main className={s.main}>
      <Sketch />
      <div className={s.card}>
        <div className={s.eyebrow}>· ROOM · {code} ·</div>
        <h2 className={s.heading}>取一个代号</h2>
        <p className={s.lead}>朋友邀你入局，先告诉大家你的称呼。</p>
        <input
          className={s.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="JOKER"
          maxLength={16}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button className={s.shuffleBtn} onClick={shuffle} type="button">
          <span className={s.shuffleIcon}>✦</span>
          <span>随机代号 / SHUFFLE</span>
          <span className={s.shuffleIcon}>✦</span>
        </button>
        <button className={s.submit} onClick={submit} disabled={!draft.trim()}>入局 ▶</button>
        <button className={s.linkBtn} onClick={onCancel}>← BACK TO LOBBY</button>
      </div>
    </main>
  );
}
