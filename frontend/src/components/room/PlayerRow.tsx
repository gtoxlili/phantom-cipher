import { Show } from 'solid-js';
import { Key } from '@solid-primitives/keyed';
import clsx from 'clsx';
import { Tile } from '@/components/Tile';
import type { PublicPlayer, RevealInfo } from '@/types';
import * as s from './PlayerRow.css';

export interface PlayerCell {
  id: string;
  color: 'black' | 'white';
  revealed: boolean;
  number?: number;
  joker: boolean;
  pending: boolean;
}

interface PlayerRowProps {
  player: PublicPlayer;
  isMe: boolean;
  tiles: PlayerCell[];
  current: boolean;
  host: boolean;
  canTarget: boolean;
  selectedTileId: string | null;
  reveal: RevealInfo | null;
  onTileTap?: (tileId: string) => void;
}

export function PlayerRow(props: PlayerRowProps) {
  return (
    <div
      class={clsx(
        s.row,
        props.isMe ? s.variant.me : s.variant.opponent,
        props.current && s.current,
        props.current && props.isMe && s.currentMe,
        !props.player.alive && s.dead,
        !props.player.connected && !props.isMe && s.offline,
      )}
    >
      <div class={s.playerHeader}>
        <span class={s.playerName}>
          {props.player.name.toUpperCase()}
          <Show when={props.isMe}>
            <span class={s.youTag}>· YOU</span>
          </Show>
          <Show when={props.host}>
            <span class={s.hostTag}>HOST</span>
          </Show>
        </span>
        <div class={s.playerStatus}>
          <Show when={props.current}>
            <span class={s.turnTag}>NOW</span>
          </Show>
          <Show when={!props.player.alive}>
            <span class={s.deadTag}>OUT</span>
          </Show>
          <Show when={!props.player.connected && !props.isMe}>
            <span class={s.offlineTag}>OFF</span>
          </Show>
        </div>
      </div>
      <div class={props.isMe ? s.hand.me : s.hand.op}>
        <Show
          when={props.tiles.length > 0}
          fallback={<div class={s.emptyHand}>· · ·</div>}
        >
          {/* `Key by="id"` is required: server pushes replace tile objects
              wholesale, so `For` (which keys by reference) would unmount
              and remount each tile on every state change, replaying the
              tileIn entrance animation. Keying by id keeps tile DOM nodes
              stable so only the changed properties update. */}
          <Key each={props.tiles} by="id">
            {(c, i) => {
              const isRevealing = () => props.reveal?.tileId === c().id;
              return (
                <Tile
                  index={i()}
                  size={props.isMe ? 'lg' : 'md'}
                  number={props.isMe ? c().number : c().revealed ? c().number : undefined}
                  color={c().color}
                  // Owner always sees their joker; opponents only after reveal.
                  joker={props.isMe ? c().joker : c().revealed && c().joker}
                  faceDown={!props.isMe && !c().revealed}
                  ownedHidden={props.isMe && !c().revealed && !c().pending}
                  ownedExposed={props.isMe && c().revealed}
                  pending={c().pending}
                  selected={props.selectedTileId === c().id}
                  selectable={props.canTarget && !c().revealed && props.player.alive}
                  highlight={isRevealing() ? (props.reveal?.correct ? 'correct' : 'wrong') : null}
                  onClick={
                    props.onTileTap && !c().revealed && props.player.alive && props.canTarget
                      ? () => props.onTileTap!(c().id)
                      : undefined
                  }
                />
              );
            }}
          </Key>
        </Show>
      </div>
    </div>
  );
}
