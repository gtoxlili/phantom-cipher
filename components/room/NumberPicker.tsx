'use client';

import { useAtom, useAtomValue } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { list } from 'radash';
import { gameViewAtom, selectedTileAtom } from '@/lib/atoms';
import { useGameActions } from '@/lib/hooks/useGameActions';
import * as s from './NumberPicker.css';

export function NumberPicker() {
  const [selectedTile, setSelectedTile] = useAtom(selectedTileAtom);
  const { opponents, canGuess } = useAtomValue(gameViewAtom);
  const actions = useGameActions();

  const op = selectedTile ? opponents.find((p) => p.id === selectedTile.playerId) : null;
  const tile = op && selectedTile ? op.tiles.find((t) => t.id === selectedTile.tileId) : null;
  const visible = !!(selectedTile && canGuess && op && tile);

  const close = () => setSelectedTile(null);

  return (
    <AnimatePresence>
      {visible && op && tile && selectedTile && (
        <motion.div
          key="picker-backdrop"
          className={s.backdrop}
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={s.sheet}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.7 }}
          >
            <div className={s.title}>
              <strong>{op.name.toUpperCase()}</strong>
              <span>第 {tile.position + 1} 张</span>
              <span className={tile.color === 'black' ? s.colorTag.black : s.colorTag.white}>
                {tile.color === 'black' ? '黑' : '白'}
              </span>
            </div>
            <motion.div
              className={s.numberGrid}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.025, delayChildren: 0.08 } },
              }}
            >
              {list(0, 11).map((n) => (
                // motion wrapper handles entrance + tap feedback so the
                // inner <button> retains its CSS `transform: skewX(-8deg)`.
                <motion.div
                  key={n}
                  className={s.numBtnSlot}
                  variants={{
                    hidden: { opacity: 0, scale: 0.6, y: 14 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { type: 'spring', stiffness: 480, damping: 22 },
                    },
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  <button
                    className={s.numBtn}
                    onClick={() => actions.guess(selectedTile.playerId, selectedTile.tileId, n)}
                    type="button"
                  >
                    <span>{n}</span>
                  </button>
                </motion.div>
              ))}
            </motion.div>
            <button className={s.cancel} onClick={close} type="button">
              CANCEL ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
