// "我是谁"档案——根据 inf-fingerprint visitor_id 从服务端拉
// players 表里的 display_name，给昵称输入框预填默认值。
//
// 触发条件（任一不满足直接 silent skip）：
//   1. playerId 已就绪（identity.ts 异步 init + identify 完成）
//   2. myName 当前为空——用户/localStorage 已经有昵称就别打扰
//   3. /api/players/{pid} 返回 200 + 非空 display_name
//
// 失败语义：404 / 超时 / 网络错都 silent fail，按"新用户"流程走，
// 用户在 NamePromptView 自己输个名字即可。**永远不弹错**。
//
// fetch 期间用户可能已经在输名字了——response 回来时再读一次
// myName() 二次确认仍为空才写，避免覆盖用户主动输入。

import { createEffect, createRoot, on } from 'solid-js';
import { playerId } from './identity';
import { myName, setMyName } from './session';

interface PlayerProfile {
  id: string;
  display_name: string;
  matches_played: number;
  matches_won: number;
  last_seen: number;
}

const FETCH_TIMEOUT_MS = 3000;

async function fetchProfile(pid: string): Promise<PlayerProfile | null> {
  try {
    const resp = await fetch(`/api/players/${encodeURIComponent(pid)}`, {
      credentials: 'omit',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as PlayerProfile;
  } catch {
    // AbortError / NetworkError / parse error 都 silent
    return null;
  }
}

// 模块顶层 createEffect 没有 owner 会报"computation outside a
// reactive root"警告——createRoot 包一层把 effect 钉在 app 生命周期，
// 不传 dispose 表示永远 alive，模块级单例正合适
createRoot(() => {
  createEffect(
    on(playerId, async (pid) => {
      if (!pid) return; // 还没就绪
      if (myName()) return; // localStorage 已经记得，不打扰

      const profile = await fetchProfile(pid);
      if (!profile?.display_name) return; // 404 / 空响应

      // 二次确认：fetch 期间（最长 3s）用户可能已经开始输名字了，
      // 这种情况尊重用户输入，不要覆盖
      if (myName()) return;
      setMyName(profile.display_name);
    }),
  );
});
