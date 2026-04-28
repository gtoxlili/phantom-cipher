// REST client for Server-Action equivalents. Errors surface as
// notifications via the toast queue — same UX as the original
// `report()` helper in lib/hooks/useGameActions.ts.
//
// All endpoints are POSTed with JSON; the WebSocket carries
// state pushes (binary msgpack).

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
