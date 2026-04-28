'use client';

import { list } from 'radash';
import clsx from 'clsx';
import type { Color } from '@/lib/types';
import * as s from './Tile.css';

interface TileProps {
  number?: number;
  color: Color;
  /** This tile is a joker — render as "-" instead of a number. */
  joker?: boolean;
  faceDown?: boolean;
  /** Owner's view of a still-secret tile (number visible to me, ? to opponents). */
  ownedHidden?: boolean;
  /** Owner's view of a tile that's been revealed to the table — visually "spent". */
  ownedExposed?: boolean;
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
  joker,
  faceDown,
  ownedHidden,
  ownedExposed,
  pending,
  selected,
  selectable,
  size = 'md',
  onClick,
  highlight,
  index = 0,
}: TileProps) {
  const isBlack = color === 'black';
  const showFace = !faceDown;
  const showNumber = showFace && !joker && number !== undefined;
  const showJoker = showFace && joker;
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
    ownedExposed && s.ownedExposed,
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
      ) : showJoker ? (
        // P5-inspired joker mark — a chunky five-point star (sized to
        // match the numeric glyphs above) with a blood-red offset
        // shadow, plus diagonal sparkle accents that mark this as a
        // special / wild tile.
        <g>
          {/* Faint radial burst behind the star */}
          <g stroke="#e60022" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
            <line x1="40" y1="34" x2="40" y2="40" />
            <line x1="40" y1="90" x2="40" y2="96" />
            <line x1="12" y1="62" x2="18" y2="62" />
            <line x1="62" y1="62" x2="68" y2="62" />
            <line x1="22" y1="44" x2="26" y2="48" />
            <line x1="58" y1="44" x2="54" y2="48" />
            <line x1="22" y1="80" x2="26" y2="76" />
            <line x1="58" y1="80" x2="54" y2="76" />
          </g>
          {/* Star with offset shadow */}
          <g transform="rotate(-6 40 62)">
            <path
              d="M 40 42 L 45 58 L 61 58 L 48 67 L 53 83 L 40 74 L 27 83 L 32 67 L 19 58 L 35 58 Z"
              fill="#e60022"
              transform="translate(2 3)"
            />
            <path
              d="M 40 42 L 45 58 L 61 58 L 48 67 L 53 83 L 40 74 L 27 83 L 32 67 L 19 58 L 35 58 Z"
              fill={numberColor}
              stroke={isBlack ? '#0a0a0a' : '#0a0a0a'}
              strokeWidth="0.5"
              strokeLinejoin="miter"
            />
          </g>
          {/* Corner sparkle diamonds */}
          <path d="M 14 36 L 17 39 L 14 42 L 11 39 Z" fill="#e60022" />
          <path d="M 66 88 L 69 91 L 66 94 L 63 91 Z" fill="#e60022" />
        </g>
      ) : (
        <text x="38" y="80" textAnchor="middle" className={s.questionText} style={{ fill: '#e60022' }}>
          ?
        </text>
      )}
    </svg>
  );

  const inlineDelay: React.CSSProperties = { animationDelay: `${index * 35}ms` };

  const decorations = (
    <>
      <div className={s.shadow} aria-hidden />
      {inner}
      {ownedExposed && <span className={s.exposedSlash} aria-hidden />}
      {pending && <span className={s.pendingTag}>暂 / NEW</span>}
      {ownedExposed && !pending && <span className={s.exposedTag}>亮 / OPEN</span>}
      {selected && <span className={s.targetTag}>标的</span>}
    </>
  );

  if (onClick) {
    return (
      <button className={className} onClick={onClick} disabled={!selectable && !!faceDown && !ownedHidden} style={inlineDelay} type="button">
        {decorations}
      </button>
    );
  }
  return (
    <div className={className} style={inlineDelay}>
      {decorations}
    </div>
  );
}
