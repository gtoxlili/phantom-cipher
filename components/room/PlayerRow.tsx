'use client';

import { Tile } from '@/components/Tile';
import clsx from 'clsx';
import type { PublicPlayer, RevealInfo } from '@/lib/types';
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

export function PlayerRow({
  player,
  isMe,
  tiles,
  current,
  host,
  canTarget,
  selectedTileId,
  reveal,
  onTileTap,
}: PlayerRowProps) {
  return (
    <div
      className={clsx(
        s.row,
        isMe ? s.variant.me : s.variant.opponent,
        current && s.current,
        current && isMe && s.currentMe,
        !player.alive && s.dead,
        !player.connected && !isMe && s.offline,
      )}
    >
      <div className={s.playerHeader}>
        <span className={s.playerName}>
          {player.name.toUpperCase()}
          {isMe && <span className={s.youTag}>· YOU</span>}
          {host && <span className={s.hostTag}>HOST</span>}
        </span>
        <div className={s.playerStatus}>
          {current && <span className={s.turnTag}>NOW</span>}
          {!player.alive && <span className={s.deadTag}>OUT</span>}
          {!player.connected && !isMe && <span className={s.offlineTag}>OFF</span>}
        </div>
      </div>
      <div className={isMe ? s.hand.me : s.hand.op}>
        {tiles.length === 0 ? (
          <div className={s.emptyHand}>· · ·</div>
        ) : (
          tiles.map((c, i) => {
            const isRevealing = reveal?.tileId === c.id;
            return (
              <Tile
                key={c.id}
                index={i}
                size={isMe ? 'lg' : 'md'}
                number={isMe ? c.number : c.revealed ? c.number : undefined}
                color={c.color}
                // Owner always sees their joker; opponents only after reveal.
                joker={isMe ? c.joker : c.revealed && c.joker}
                faceDown={!isMe && !c.revealed}
                ownedHidden={isMe && !c.revealed && !c.pending}
                ownedExposed={isMe && c.revealed}
                pending={c.pending}
                selected={selectedTileId === c.id}
                selectable={canTarget && !c.revealed && player.alive}
                highlight={isRevealing ? (reveal?.correct ? 'correct' : 'wrong') : null}
                onClick={
                  onTileTap && !c.revealed && player.alive && canTarget
                    ? () => onTileTap(c.id)
                    : undefined
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
