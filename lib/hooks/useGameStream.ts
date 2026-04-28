'use client';

import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  connectedAtom,
  currentRoomCodeAtom,
  playerIdAtom,
  privateStateAtom,
  publicStateAtom,
  revealAtom,
} from '@/lib/atoms';
import type { PrivateState, PublicGameState, RevealInfo } from '@/lib/types';

/**
 * Opens an EventSource to the active room's SSE endpoint and pipes typed
 * events into atoms. Only opens once `ready` is true (after the join action
 * has succeeded); reads code & pid from atoms so callers don't pass them.
 */
export function useGameStream(ready: boolean): void {
  const code = useAtomValue(currentRoomCodeAtom);
  const playerId = useAtomValue(playerIdAtom);
  const setPublic = useSetAtom(publicStateAtom);
  const setPrivate = useSetAtom(privateStateAtom);
  const setReveal = useSetAtom(revealAtom);
  const setConnected = useSetAtom(connectedAtom);

  useEffect(() => {
    if (!playerId || !code || !ready) return;
    const url = `/api/room/${encodeURIComponent(code)}/stream?pid=${encodeURIComponent(playerId)}`;
    const es = new EventSource(url);
    let revealTimer: number | undefined;

    const onPublic = (e: MessageEvent) => setPublic(JSON.parse(e.data) as PublicGameState);
    const onPrivate = (e: MessageEvent) => setPrivate(JSON.parse(e.data) as PrivateState);
    const onReveal = (e: MessageEvent) => {
      const info = JSON.parse(e.data) as RevealInfo;
      setReveal(info);
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => setReveal(null), 1500);
    };
    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);

    es.addEventListener('public', onPublic);
    es.addEventListener('private', onPrivate);
    es.addEventListener('reveal', onReveal);
    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);

    return () => {
      if (revealTimer) window.clearTimeout(revealTimer);
      es.removeEventListener('public', onPublic);
      es.removeEventListener('private', onPrivate);
      es.removeEventListener('reveal', onReveal);
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
      es.close();
      setConnected(false);
    };
  }, [code, playerId, ready, setPublic, setPrivate, setReveal, setConnected]);
}
