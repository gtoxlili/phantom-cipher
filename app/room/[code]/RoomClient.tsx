'use client';

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
 */
export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { joined } = useRoomBootstrap(code);
  const needName = useAtomValue(needNameAtom);
  useGameStream(joined);

  if (needName) return <NamePromptView onCancel={() => router.push('/')} />;
  return <RoomBoard onExit={() => router.push('/')} />;
}
