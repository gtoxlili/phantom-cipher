'use client';

import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Sketch } from '@/components/Sketch';
import { currentRoomCodeAtom, myNameAtom } from '@/lib/atoms';
import * as s from './NamePromptView.css';

export function NamePromptView({ onCancel }: { onCancel: () => void }) {
  const code = useAtomValue(currentRoomCodeAtom);
  const setName = useSetAtom(myNameAtom);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const n = draft.trim();
    if (!n) return;
    setName(n);
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
        <button className={s.submit} onClick={submit} disabled={!draft.trim()}>入局 ▶</button>
        <button className={s.linkBtn} onClick={onCancel}>← BACK TO LOBBY</button>
      </div>
    </main>
  );
}
