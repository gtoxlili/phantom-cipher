import type { Metadata } from 'next';
import RoomClient from '@/components/room/RoomClient';

/**
 * Per-room share metadata. The default share copy from app/layout.tsx
 * is generic ("TAKE THEIR CIPHER · 达芬奇密码"); when someone forwards
 * a room URL like /room/ABCD, the preview should clearly read as
 * "join my game with code ABCD" so the recipient knows to tap.
 *
 * Title format `入局 · ABCD` flows through the layout's title.template
 * → ends up as `入局 · ABCD · 达芬奇密码` in the browser tab.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().slice(0, 6);
  return {
    title: `入局 · ${code}`,
    description: `怪盗集结中 · 持密码 ${code} 加入这一局达芬奇密码。`,
    openGraph: {
      title: `入局 · ${code} · 达芬奇密码`,
      description: `怪盗集结中 · 持密码 ${code} 加入这一局达芬奇密码。`,
      type: 'website',
      locale: 'zh_CN',
      siteName: '怪盗密码',
      // Re-state the image because Next merges openGraph by replacement,
      // not deep-merge — without this, the room page would lose the
      // image entirely and inherit nothing useful.
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 1200,
          alt: `达芬奇密码 · 房间 ${code}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `入局 · ${code} · 达芬奇密码`,
      description: `怪盗集结中 · 持密码 ${code} 加入这一局。`,
      images: ['/og-image.png'],
    },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase().slice(0, 6)} />;
}
