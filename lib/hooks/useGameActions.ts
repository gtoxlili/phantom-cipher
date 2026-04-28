'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import {
  decideContinue as decideContinueAction,
  drawTile as drawTileAction,
  guessTile as guessTileAction,
  joinOrCreateRoom,
  leaveRoom as leaveRoomAction,
  placeJoker as placeJokerAction,
  resetGame as resetGameAction,
  startGame as startGameAction,
} from '@/lib/actions';
import type { ActionResult } from '@/lib/actions';
import type { Color } from '@/lib/types';
import {
  currentRoomCodeAtom,
  playerIdAtom,
  pushNotificationAtom,
  selectedTileAtom,
} from '@/lib/atoms';

/**
 * Reads the active room and player id from atoms, so components can call
 * `useGameActions()` without prop drilling. Errors surface as toasts via
 * the notification queue.
 */
export function useGameActions() {
  const code = useAtomValue(currentRoomCodeAtom);
  const playerId = useAtomValue(playerIdAtom);
  const pushNotification = useSetAtom(pushNotificationAtom);
  const setSelectedTile = useSetAtom(selectedTileAtom);

  const report = (res: ActionResult) => {
    if (!res.ok) pushNotification(res.error);
    return res;
  };
  const ready = !!code && !!playerId;

  return {
    async join(name: string, asHost: boolean) {
      if (!ready) return;
      report(await joinOrCreateRoom(code, playerId, name, asHost));
    },
    async start() {
      if (!ready) return;
      report(await startGameAction(code, playerId));
    },
    async draw(color: Color) {
      if (!ready) return;
      report(await drawTileAction(code, playerId, color));
    },
    async guess(targetPlayerId: string, tileId: string, number: number | null) {
      if (!ready) return;
      setSelectedTile(null);
      report(await guessTileAction(code, playerId, targetPlayerId, tileId, number));
    },
    async placeJoker(position: number) {
      if (!ready) return;
      report(await placeJokerAction(code, playerId, position));
    },
    async decideContinue(cont: boolean) {
      if (!ready) return;
      report(await decideContinueAction(code, playerId, cont));
    },
    async reset() {
      if (!ready) return;
      report(await resetGameAction(code, playerId));
    },
    async leave() {
      if (!ready) return;
      await leaveRoomAction(code, playerId);
    },
  };
}

export type GameActions = ReturnType<typeof useGameActions>;
