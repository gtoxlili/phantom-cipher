'use client';

import { list } from 'radash';
import clsx from 'clsx';
import * as s from './Deck.css';

export function Deck({
  count,
  canDraw,
  onDraw,
}: {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const stack = Math.min(count, 4);
  return (
    <div className={s.deckGroup}>
      <button
        className={clsx(s.deck, canDraw && s.deckActive, count === 0 && s.deckEmpty)}
        onClick={canDraw ? onDraw : undefined}
        disabled={!canDraw}
        aria-label="抽牌"
        type="button"
      >
        <div className={s.deckStack}>
          {list(0, Math.max(stack, 1) - 1).map((i) => (
            <div
              key={i}
              className={s.deckCard}
              style={{
                transform: `translate(${i * 1.4}px, ${i * -1.6}px) rotate(${(i - 1.5) * 1.2}deg)`,
              }}
            >
              <DeckBackSvg />
            </div>
          ))}
        </div>
        <div className={s.deckCount}>
          <span>{count}</span>
        </div>
      </button>
      <div className={s.deckLabel}>
        {canDraw ? '▶ DRAW' : count === 0 ? 'EMPTY' : `STACK · ${count}`}
      </div>
    </div>
  );
}

function DeckBackSvg() {
  return (
    <svg viewBox="0 0 80 112" className={s.deckSvg}>
      <path d="M 4 4 L 64 4 L 76 16 L 76 108 L 4 108 Z" fill="#0a0a0a" stroke="#fafaf3" strokeWidth="3" />
      <path d="M 64 4 L 76 4 L 76 16 Z" fill="#e60022" stroke="#fafaf3" strokeWidth="2" />
      <g>
        <path d="M -10 60 L 80 30" stroke="#e60022" strokeWidth="14" />
        <path d="M -10 80 L 80 50" stroke="#fafaf3" strokeWidth="2" />
      </g>
      <text
        x="40"
        y="78"
        textAnchor="middle"
        fill="#fafaf3"
        fontStyle="italic"
        fontSize="28"
        fontWeight="700"
        className={s.deckMonogram}
      >
        DV
      </text>
      <g>
        {list(0, 5).map((i) => (
          <circle key={i} cx={10 + i * 11} cy={96} r={1.5} fill="#e60022" />
        ))}
      </g>
    </svg>
  );
}
