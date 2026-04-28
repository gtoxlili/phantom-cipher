'use client';

import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { playerIdAtom } from '@/lib/atoms';

/**
 * Returns a stable per-tab UUID. The id is persisted in sessionStorage
 * via atomWithStorage; this hook just guarantees it's populated on mount.
 */
export function usePlayerId(): string {
  const [pid, setPid] = useAtom(playerIdAtom);
  useEffect(() => {
    if (!pid) setPid(crypto.randomUUID());
  }, [pid, setPid]);
  return pid;
}
