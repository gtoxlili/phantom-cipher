'use client';

import { useAtom, useAtomValue } from 'jotai';
import { list } from 'radash';
import { gameViewAtom, selectedTileAtom } from '@/lib/atoms';
import { useGameActions } from '@/lib/hooks/useGameActions';
import * as s from './NumberPicker.css';

export function NumberPicker() {
  const [selectedTile, setSelectedTile] = useAtom(selectedTileAtom);
  const { opponents, canGuess } = useAtomValue(gameViewAtom);
  const actions = useGameActions();

  if (!selectedTile || !canGuess) return null;
  const op = opponents.find((p) => p.id === selectedTile.playerId);
  const tile = op?.tiles.find((t) => t.id === selectedTile.tileId);
  if (!op || !tile) return null;

  const close = () => setSelectedTile(null);

  return (
    <div className={s.backdrop} onClick={close}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.title}>
          <strong>{op.name.toUpperCase()}</strong>
          <span>第 {tile.position + 1} 张</span>
          <span className={tile.color === 'black' ? s.colorTag.black : s.colorTag.white}>
            {tile.color === 'black' ? '黑' : '白'}
          </span>
        </div>
        <div className={s.numberGrid}>
          {list(0, 11).map((n) => (
            <button
              key={n}
              className={s.numBtn}
              onClick={() => actions.guess(selectedTile.playerId, selectedTile.tileId, n)}
              type="button"
            >
              <span>{n}</span>
            </button>
          ))}
        </div>
        <button className={s.cancel} onClick={close} type="button">
          CANCEL ✕
        </button>
      </div>
    </div>
  );
}
