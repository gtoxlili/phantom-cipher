import { Show } from 'solid-js';
import { Key } from '@solid-primitives/keyed';
import clsx from 'clsx';
import { Tile } from '@/components/Tile';
import { nowMs } from '@/stores/game';
import type { PublicPlayer, RevealInfo } from '@/types';
import * as s from './PlayerRow.css';

/** 把 forfeit 截止时间换成"还剩 X 秒"，已经过期就给 0。
 *  服务端时钟跟客户端 ±几秒漂移在 30 秒窗口里也无所谓，看到
 *  -1 也只会显示 0 秒。 */
function forfeitSecondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

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
          {/* AFK forfeit 倒计时——只对队友（!isMe）显示，自己看着
              自己 30 秒倒计时没意义。`alive` 那一关由后端在
              to_public_player 里把 pending_forfeit_at 清空时已经
              做过了，但前端再 gate 一次防御性更强。 */}
          <Show
            when={
              !props.isMe &&
              props.player.alive &&
              props.player.pendingForfeitAt !== undefined
            }
          >
            <span class={s.forfeitTag}>
              <span class={s.forfeitDot} aria-hidden="true" />
              <span>
                {forfeitSecondsLeft(props.player.pendingForfeitAt!, nowMs())}s
              </span>
            </span>
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
                  // 这里把 onClick 写成 `cond ? fn : undefined` 是依赖
                  // Tile 内部用的 wrapper（onClick={() => props.onClick?.()}）——
                  // 那一层让 DOM 绑定不再受 props.onClick 闭包变化影响。
                  // 如果哪天 Tile 改回 `onClick={props.onClick}` 直绑，
                  // 这里就是 Deck.tsx 之前 VIOLET 点不动 bug 的同款源头，
                  // 必须改成永远传函数 + 在内部判断 canTarget。
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
