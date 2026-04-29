// 把每个动作映射成一个 POST。响应只关心 `ok` 字段，失败统一
// 弹 toast——错误信息后端已经写好中文了，UI 直接照抄即可。
//
// 状态推送走 WebSocket，不在这层。

import { currentRoomCode, playerId, pushNotification, setSelectedTile } from '@/stores/game';
import type { Color } from '@/types';

interface ActionResultOk {
  ok: true;
}
interface ActionResultErr {
  ok: false;
  error: string;
}
type ActionResult = ActionResultOk | ActionResultErr;

async function post<TBody>(path: string, body: TBody): Promise<ActionResult> {
  try {
    const resp = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      return { ok: false, error: `HTTP ${resp.status}` };
    }
    return (await resp.json()) as ActionResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '请求失败',
    };
  }
}

function report(res: ActionResult) {
  if (!res.ok) pushNotification(res.error);
  return res;
}

function ready() {
  return !!currentRoomCode() && !!playerId();
}

const url = (verb: string) => `/api/room/${encodeURIComponent(currentRoomCode())}/${verb}`;

export const actions = {
  async join(name: string, asHost: boolean) {
    if (!ready()) return;
    report(
      await post(url('join'), {
        playerId: playerId(),
        name,
        asHost,
      }),
    );
  },

  async start() {
    if (!ready()) return;
    report(await post(url('start'), { playerId: playerId() }));
  },

  async draw(color: Color) {
    if (!ready()) return;
    report(await post(url('draw'), { playerId: playerId(), color }));
  },

  async guess(targetPlayerId: string, tileId: string, number: number | null) {
    if (!ready()) return;
    setSelectedTile(null);
    report(
      await post(url('guess'), {
        playerId: playerId(),
        targetPlayerId,
        tileId,
        number,
      }),
    );
  },

  async placeJoker(position: number) {
    if (!ready()) return;
    report(await post(url('place-joker'), { playerId: playerId(), position }));
  },

  async decideContinue(cont: boolean) {
    if (!ready()) return;
    report(
      await post(url('continue'), {
        playerId: playerId(),
        continue: cont,
      }),
    );
  },

  async reset() {
    if (!ready()) return;
    report(await post(url('reset'), { playerId: playerId() }));
  },

  async leave() {
    if (!ready()) return;
    await post(url('leave'), { playerId: playerId() });
  },
};
