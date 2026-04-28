'use client';

import { list } from 'radash';
import clsx from 'clsx';
import type { Color } from '@/lib/types';
import * as s from './Tile.css';

interface TileProps {
  number?: number;
  color: Color;
  faceDown?: boolean;
  ownedHidden?: boolean;
  pending?: boolean;
  selected?: boolean;
  selectable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  highlight?: 'correct' | 'wrong' | null;
  index?: number;
}

export function Tile({
  number,
  color,
  faceDown,
  ownedHidden,
  pending,
  selected,
  selectable,
  size = 'md',
  onClick,
  highlight,
  index = 0,
}: TileProps) {
  const isBlack = color === 'black';
  const showNumber = !faceDown && number !== undefined;
  const bgPrimary = isBlack ? '#0a0a0a' : '#ece5cf';
  const numberColor = isBlack ? '#fafaf3' : '#0a0a0a';
  const halftoneStrokeColor = isBlack ? 'rgba(250,250,243,0.16)' : 'rgba(10,10,10,0.18)';
  const halftoneDotFill = 'rgba(230,0,34,0.55)';

  const className = clsx(
    s.tile,
    s.size[size],
    pending && s.pending,
    selected && s.selected,
    selectable && s.selectableHover,
    selectable && s.tappable,
    ownedHidden && s.ownedHidden,
    highlight === 'correct' && s.flashCorrect,
    highlight === 'wrong' && s.flashWrong,
    onClick && s.tappable,
  );

  const inner = (
    <svg viewBox="0 0 80 112" className={clsx(s.svg, selected && s.selectedSvg)} aria-hidden="true">
      <path
        d="M 4 4 L 64 4 L 76 16 L 76 108 L 4 108 Z"
        fill={bgPrimary}
        stroke="#0a0a0a"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <path d="M 64 4 L 76 4 L 76 16 Z" fill="#e60022" stroke="#0a0a0a" strokeWidth="2" />
      <g>
        {list(0, 7).map((i) => (
          <circle key={i} cx={10 + i * 8} cy={98} r={1.5} fill={halftoneDotFill} opacity="0.95" />
        ))}
      </g>
      <line x1="10" y1="22" x2="60" y2="22" stroke={halftoneStrokeColor} strokeWidth="1" />
      {showNumber ? (
        <text
          x="36"
          y="80"
          textAnchor="middle"
          className={s.numberText}
          style={{ fill: numberColor }}
        >
          {number}
        </text>
      ) : (
        <text x="38" y="80" textAnchor="middle" className={s.questionText} style={{ fill: '#e60022' }}>
          ?
        </text>
      )}
    </svg>
  );

  const inlineDelay: React.CSSProperties = { animationDelay: `${index * 35}ms` };

  if (onClick) {
    return (
      <button className={className} onClick={onClick} disabled={!selectable && !!faceDown && !ownedHidden} style={inlineDelay} type="button">
        <div className={s.shadow} aria-hidden />
        {inner}
        {pending && <span className={s.pendingTag}>暂 / NEW</span>}
        {selected && <span className={s.targetTag}>标的</span>}
      </button>
    );
  }
  return (
    <div className={className} style={inlineDelay}>
      <div className={s.shadow} aria-hidden />
      {inner}
      {pending && <span className={s.pendingTag}>暂 / NEW</span>}
      {selected && <span className={s.targetTag}>标的</span>}
    </div>
  );
}
