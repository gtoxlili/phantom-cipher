'use client';

import { list } from 'radash';
import clsx from 'clsx';
import * as s from './Deck.css';
import type { Color } from '@/lib/types';

export function Deck({
  color,
  count,
  canDraw,
  onDraw,
}: {
  color: Color;
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const stack = Math.min(count, 4);
  const empty = count === 0;
  const isBlack = color === 'black';
  return (
    <div className={s.deckGroup}>
      <button
        className={clsx(s.deck, canDraw && !empty && s.deckActive, empty && s.deckEmpty)}
        onClick={canDraw && !empty ? onDraw : undefined}
        disabled={!canDraw || empty}
        aria-label={isBlack ? '抽黑牌' : '抽白牌'}
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
              <DeckBackSvg color={color} />
            </div>
          ))}
        </div>
        <div className={s.deckCount}>
          <span>{count}</span>
        </div>
      </button>
      <div className={clsx(s.deckLabel, isBlack ? s.deckLabelBlack : s.deckLabelWhite)}>
        {isBlack ? '黑 BLACK' : '白 WHITE'}
      </div>
    </div>
  );
}

function DeckBackSvg({ color }: { color: Color }) {
  const isBlack = color === 'black';
  const cardFill = isBlack ? '#0a0a0a' : '#ece5cf';
  const cardStroke = isBlack ? '#fafaf3' : '#0a0a0a';
  const monoFill = isBlack ? '#fafaf3' : '#0a0a0a';
  return (
    <svg viewBox="0 0 80 112" className={s.deckSvg}>
      <path d="M 4 4 L 64 4 L 76 16 L 76 108 L 4 108 Z" fill={cardFill} stroke={cardStroke} strokeWidth="3" />
      <path d="M 64 4 L 76 4 L 76 16 Z" fill="#e60022" stroke={cardStroke} strokeWidth="2" />
      <g>
        <path d="M -10 60 L 80 30" stroke="#e60022" strokeWidth="14" />
        <path d="M -10 80 L 80 50" stroke={cardStroke} strokeWidth="2" />
      </g>
      <text
        x="40"
        y="78"
        textAnchor="middle"
        fill={monoFill}
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
