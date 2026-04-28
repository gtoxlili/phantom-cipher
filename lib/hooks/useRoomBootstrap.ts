'use client';

import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  currentRoomCodeAtom,
  intentHostAtom,
  myNameAtom,
  needNameAtom,
  playerIdAtom,
} from '@/lib/atoms';
import { useGameActions } from './useGameActions';
import { usePlayerId } from './usePlayerId';

interface BootstrapState {
  joined: boolean;
  needName: boolean;
}

/**
 * Drives the room entry flow. The active room code lives in
 * `currentRoomCodeAtom` from the moment this hook runs, so subcomponents
 * never need a context — they just read the atom.
 */
export function useRoomBootstrap(code: string): BootstrapState {
  // sessionStorage-backed identity
  usePlayerId();
  const playerId = useAtomValue(playerIdAtom);
  const myName = useAtomValue(myNameAtom);
  const intentHost = useAtomValue(intentHostAtom);
  const setIntentHost = useSetAtom(intentHostAtom);
  const needName = useAtomValue(needNameAtom);
  const setCurrentCode = useSetAtom(currentRoomCodeAtom);
  const actions = useGameActions();
  const [joined, setJoined] = useState(false);

  // Publish the active room code to the atom store.
  useEffect(() => {
    setCurrentCode(code);
    return () => setCurrentCode('');
  }, [code, setCurrentCode]);

  // Fire the join action when both name & pid are ready.
  useEffect(() => {
    if (!myName || !playerId || joined) return;
    let cancelled = false;
    (async () => {
      await actions.join(myName, intentHost);
      if (cancelled) return;
      setJoined(true);
      if (intentHost) setIntentHost(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [myName, playerId, joined, intentHost, actions, setIntentHost]);

  return { joined, needName };
}
