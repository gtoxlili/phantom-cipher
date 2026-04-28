'use client';

import { useAtomValue } from 'jotai';
import { Sketch } from '@/components/Sketch';
import { gameViewAtom } from '@/lib/atoms';
import { ActionZone } from './ActionZone';
import { Header } from './Header';
import { JokerPlacement } from './JokerPlacement';
import { LogPanel } from './LogPanel';
import { MyRow } from './MyRow';
import { NotificationStack } from './NotificationStack';
import { NumberPicker } from './NumberPicker';
import { OpponentsList } from './OpponentsList';
import { PhaseBanner } from './PhaseBanner';
import { RevealOverlay } from './RevealOverlay';
import * as s from './RoomBoard.css';

export function RoomBoard({ onExit }: { onExit: () => void }) {
  const { me, phase } = useAtomValue(gameViewAtom);

  return (
    <main className={s.main}>
      <Sketch intensity="subdued" />
      <Header onBack={onExit} />
      <PhaseBanner />
      <section className={s.opponentsArea}>
        <OpponentsList />
      </section>
      <ActionZone />
      <section className={s.myArea}>
        {me ? <MyRow /> : <div className={s.connectingMsg}>· CONNECTING · {phase} ·</div>}
      </section>
      <NumberPicker />
      <JokerPlacement />
      <RevealOverlay />
      <LogPanel />
      <NotificationStack />
    </main>
  );
}
