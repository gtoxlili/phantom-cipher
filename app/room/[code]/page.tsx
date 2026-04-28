import RoomClient from '@/components/room/RoomClient';

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase().slice(0, 6)} />;
}
