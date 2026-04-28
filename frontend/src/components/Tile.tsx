import { For, Show, type JSX } from 'solid-js';
import { Motion } from 'solid-motionone';
import { spring } from '@motionone/dom';
import clsx from 'clsx';
import type { Color } from '@/types';
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

export function Tile(props: TileProps) {
  const size = () => props.size ?? 'md';
  const index = () => props.index ?? 0;
  const isBlack = () => props.color === 'black';
  const showFace = () => !props.faceDown;
  const showNumber = () => showFace() && !props.joker && props.number !== undefined;
  const showJoker = () => showFace() && props.joker;
  const bgPrimary = () => (isBlack() ? '#0a0a0a' : '#ece5cf');
  const numberColor = () => (isBlack() ? '#fafaf3' : '#0a0a0a');
  const halftoneStrokeColor = () =>
    isBlack() ? 'rgba(250,250,243,0.16)' : 'rgba(10,10,10,0.18)';
  const halftoneDotFill = 'rgba(230,0,34,0.55)';

  const className = () =>
    clsx(
      s.tile,
      s.size[size()],
      props.pending && s.pending,
      // Selected tiles intentionally get no visual treatment — the picker
      // modal opens immediately and covers the board, so the lift/glow
      // effect was both redundant and invisible.
      props.selectable && s.selectableHover,
      props.selectable && s.tappable,
      props.ownedHidden && s.ownedHidden,
      props.ownedExposed && s.ownedExposed,
      props.highlight === 'correct' && s.flashCorrect,
      props.highlight === 'wrong' && s.flashWrong,
      props.onClick && s.tappable,
    );

  const inner = () => (
    <svg viewBox="0 0 80 112" class={s.svg} aria-hidden="true">
      <path
        d="M 4 4 L 64 4 L 76 16 L 76 108 L 4 108 Z"
        fill={bgPrimary()}
        stroke="#0a0a0a"
        stroke-width="3"
        stroke-linejoin="miter"
      />
      <path d="M 64 4 L 76 4 L 76 16 Z" fill="#e60022" stroke="#0a0a0a" stroke-width="2" />
      <g>
        <For each={Array.from({ length: 8 }, (_, i) => i)}>
          {(i) => (
            <circle cx={10 + i * 8} cy={98} r={1.5} fill={halftoneDotFill} opacity="0.95" />
          )}
        </For>
      </g>
      <line x1="10" y1="22" x2="60" y2="22" stroke={halftoneStrokeColor()} stroke-width="1" />
      <Show
        when={showNumber()}
        fallback={
          <Show
            when={showJoker()}
            fallback={
              // Layered "?" face — a soft contrast echo for depth, the main
              // red glyph in front, plus diagonal slash accents in the
              // corners for a P5-style "mystery / unknown" feel.
              <g>
                <text
                  x="38"
                  y="80"
                  text-anchor="middle"
                  class={s.questionText}
                  style={{ fill: numberColor(), opacity: 0.18 }}
                  transform="translate(-3 -2)"
                >
                  ?
                </text>
                <text
                  x="38"
                  y="80"
                  text-anchor="middle"
                  class={s.questionText}
                  style={{ fill: '#e60022' }}
                >
                  ?
                </text>
                <g stroke="#e60022" stroke-width="1.6" stroke-linecap="round" opacity="0.85">
                  <line x1="14" y1="44" x2="22" y2="36" />
                  <line x1="58" y1="92" x2="66" y2="84" />
                </g>
                <circle cx="11" cy="38" r="1.6" fill="#e60022" />
                <circle cx="69" cy="94" r="1.6" fill="#e60022" />
              </g>
            }
          >
            {/* P5-inspired joker mark — a chunky five-point star (sized to
                match the numeric glyphs above) with a blood-red offset
                shadow, plus diagonal sparkle accents that mark this as a
                special / wild tile. */}
            <g>
              {/* Faint radial burst behind the star */}
              <g stroke="#e60022" stroke-width="1.2" stroke-linecap="round" opacity="0.5">
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
                  fill={numberColor()}
                  stroke="#0a0a0a"
                  stroke-width="0.5"
                  stroke-linejoin="miter"
                />
              </g>
              {/* Corner sparkle diamonds */}
              <path d="M 14 36 L 17 39 L 14 42 L 11 39 Z" fill="#e60022" />
              <path d="M 66 88 L 69 91 L 66 94 L 63 91 Z" fill="#e60022" />
            </g>
          </Show>
        }
      >
        <text
          x="36"
          y="80"
          text-anchor="middle"
          class={s.numberText}
          style={{ fill: numberColor() }}
        >
          {props.number}
        </text>
      </Show>
    </svg>
  );

  // ALWAYS declare both animations inline. Toggling the `animation`
  // shorthand between renders re-evaluates animation-name and replays
  // tileIn from scratch (a 0.45s entrance from rotate(-12deg)) — that
  // replay is what made selecting feel "abrupt", not the lift itself.
  // Use animation-play-state for pulse on/off — the name doesn't change,
  // so tileIn keeps its original timeline.
  const showPulse = () => props.selectable && !props.selected && !props.pending;
  const inlineDelay = (): JSX.CSSProperties => ({
    animation: `tileIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index() * 35}ms backwards, tileSelectablePulse 0.75s ease-in-out ${500 + index() * 60}ms infinite`,
    'animation-play-state': showPulse() ? 'running' : 'running, paused',
  });

  // Lift handled by Motion on an inner wrapper rather than CSS on the
  // button: solid-motionone interpolates the transform from "wherever it
  // is now" (mid-pulse-cycle is fine) to the target via spring, so
  // there's no animation→static snap regardless of the outer button's
  // pulse state.
  const decorations = () => (
    <>
      <div class={s.shadow} aria-hidden="true" />
      <Motion.div
        style={{ display: 'block', position: 'relative', 'z-index': 2 }}
        animate={{
          y: props.selected ? -14 : 0,
          scale: props.selected ? 1.06 : 1,
          rotate: props.selected ? 1 : 0,
        }}
        transition={{ easing: spring({ stiffness: 380, damping: 28, mass: 0.5 }) }}
      >
        {inner()}
      </Motion.div>
      <Show when={props.ownedExposed}>
        <span class={s.exposedSlash} aria-hidden="true" />
      </Show>
      <Show when={props.pending}>
        <span class={s.pendingTag}>暂 / NEW</span>
      </Show>
      <Show when={props.ownedExposed && !props.pending}>
        <span class={s.exposedTag}>亮 / OPEN</span>
      </Show>
    </>
  );

  return (
    <Show
      when={props.onClick}
      fallback={
        <div class={className()} style={inlineDelay()}>
          {decorations()}
        </div>
      }
    >
      <button
        class={className()}
        onClick={props.onClick}
        disabled={!props.selectable && !!props.faceDown && !props.ownedHidden}
        style={inlineDelay()}
        type="button"
      >
        {decorations()}
      </button>
    </Show>
  );
}
