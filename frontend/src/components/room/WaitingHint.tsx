import { currentRoomCode } from '@/stores/game';
import * as s from './WaitingHint.css';

export function WaitingHint() {
  return (
    <div class={s.wrap}>
      <div class={s.title}><span>STAND BY</span></div>
      <div class={s.sub}>
        把房间密码 <strong class={s.subStrong}>{currentRoomCode()}</strong> 告诉朋友<br />
        或点击上方密码复制邀请链接<br />
        <span style={{ opacity: 0.7, 'font-size': '12px', 'letter-spacing': '0.18em' }}>
          · 2–4 PLAYERS · 房主可在 ≥2 人时开局 ·
        </span>
      </div>
    </div>
  );
}
