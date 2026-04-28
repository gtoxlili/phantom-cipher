import { Show } from 'solid-js';
import { Sketch } from '@/components/Sketch';
import { gameView } from '@/stores/game';
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

export function RoomBoard(props: { onExit: () => void }) {
  return (
    <main class={s.main}>
      <Sketch intensity="subdued" />
      <Header onBack={props.onExit} />
      <PhaseBanner />
      <section class={s.opponentsArea}>
        <OpponentsList />
      </section>
      <ActionZone />
      <section class={s.myArea}>
        <Show
          when={gameView().me}
          fallback={<div class={s.connectingMsg}>· CONNECTING · {gameView().phase} ·</div>}
        >
          <MyRow />
        </Show>
      </section>
      <NumberPicker />
      <JokerPlacement />
      <RevealOverlay />
      <LogPanel />
      <NotificationStack />
    </main>
  );
}
