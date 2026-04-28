'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { NamePromptView } from '@/components/room/NamePromptView';
import { RoomBoard } from '@/components/room/RoomBoard';
import { needNameAtom } from '@/lib/atoms';
import { useGameStream } from '@/lib/hooks/useGameStream';
import { useRoomBootstrap } from '@/lib/hooks/useRoomBootstrap';

/**
 * Thin shell. The active room code, player id, and join state all live in
 * jotai atoms — no React context, no prop drilling.
 *
 * Mount-gated because the NamePrompt-vs-Board branch reads from
 * sessionStorage-backed atoms, which the server can't see. Without the
 * gate, server renders one tree (always NamePrompt) and the client
 * renders another (Board if name was already cached) → hydration error.
 */
export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { joined } = useRoomBootstrap(code);
  const needName = useAtomValue(needNameAtom);
  useGameStream(joined);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (needName) return <NamePromptView onCancel={() => router.push('/')} />;
  return <RoomBoard onExit={() => router.push('/')} />;
}
