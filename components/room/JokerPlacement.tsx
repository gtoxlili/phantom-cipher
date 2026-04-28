'use client';

import { useAtomValue } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { Tile } from '@/components/Tile';
import { gameViewAtom } from '@/lib/atoms';
import { useGameActions } from '@/lib/hooks/useGameActions';
import * as s from './JokerPlacement.css';

/**
 * Bottom sheet shown during the 'placing' phase: the current player picks
 * an insertion index for the joker they just drew. The pending joker is
 * already in `myHand` (parked at the end by the server), so we render the
 * rest of the hand and drop a `+` slot before each tile and after the last.
 */
export function JokerPlacement() {
  const v = useAtomValue(gameViewAtom);
  const actions = useGameActions();

  const visible = v.phase === 'placing' && v.isMyTurn && !!v.pendingTileId;
  const pending = visible ? v.myHand.find((t) => t.id === v.pendingTileId) : undefined;
  const others = visible ? v.myHand.filter((t) => t.id !== v.pendingTileId) : [];

  return (
    <AnimatePresence>
      {visible && pending && (
        <motion.div
          key="joker-backdrop"
          className={s.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={s.sheet}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.7 }}
          >
            <div className={s.subtitle}>▶ JOKER · 赖子待放置 ◀</div>
            <div className={s.title}>
              选个位置 — <strong>把赖子塞进去</strong>
            </div>
            <div className={s.preview}>
              <div style={{ width: 70 }}>
                <Tile color={pending.color} joker number={undefined} size="lg" />
              </div>
            </div>
            <motion.div
              className={s.handRow}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
              }}
            >
              {Array.from({ length: others.length + 1 }).map((_, pos) => (
                <motion.div
                  key={`group-${pos}`}
                  style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 4 }}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { type: 'spring', stiffness: 460, damping: 24 },
                    },
                  }}
                >
                  <button
                    className={s.slot}
                    type="button"
                    aria-label={`放在第 ${pos + 1} 位`}
                    onClick={() => actions.placeJoker(pos)}
                  />
                  {pos < others.length && (
                    <div className={s.tileWrap} style={{ width: 50 }}>
                      <Tile
                        color={others[pos].color}
                        number={others[pos].number ?? undefined}
                        joker={others[pos].joker}
                        ownedHidden={!others[pos].revealed}
                        ownedExposed={others[pos].revealed}
                        size="md"
                        index={pos}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
            <div className={s.hint}>tap a slot · 点击空位放置</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
