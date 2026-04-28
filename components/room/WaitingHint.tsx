'use client';

import { useAtomValue } from 'jotai';
import { currentRoomCodeAtom } from '@/lib/atoms';
import * as s from './WaitingHint.css';

export function WaitingHint() {
  const code = useAtomValue(currentRoomCodeAtom);
  return (
    <div className={s.wrap}>
      <div className={s.title}><span>STAND BY</span></div>
      <div className={s.sub}>
        把房间密码 <strong className={s.subStrong}>{code}</strong> 告诉朋友<br />
        或点击上方密码复制邀请链接<br />
        <span style={{ opacity: 0.7, fontSize: '12px', letterSpacing: '0.18em' }}>
          · 2–4 PLAYERS · 房主可在 ≥2 人时开局 ·
        </span>
      </div>
    </div>
  );
}
