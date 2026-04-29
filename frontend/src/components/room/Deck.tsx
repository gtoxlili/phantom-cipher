import { For } from 'solid-js';
import clsx from 'clsx';
import * as s from './Deck.css';
import type { Color } from '@/types';

export function Deck(props: {
  color: Color;
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const stack = () => Math.min(props.count, 4);
  const empty = () => props.count === 0;
  const isBlack = () => props.color === 'black';
  const stackCount = () => Math.max(stack(), 1);
  return (
    <div class={s.deckGroup}>
      {/*
        onClick 永远绑一个无脑 wrapper——Solid 的事件 handler 不是
        反应式的，`onClick={cond ? fn : undefined}` 这种条件三元表
        达式只在初次渲染绑一次。如果初次渲染时 canDraw=false（不是
        本玩家先手的回合），onClick 会被永久绑成 undefined，等回合
        转过来 canDraw 变 true、按钮看起来活了，**点击其实没人接
        手**——这就是之前 VIOLET / 红蔷薇"牌堆亮着却点不动"的 bug。

        正确做法：onClick 永远是 `() => props.onDraw()`，让浏览器
        原生的 `disabled` 属性来拦截不该响应的点击（disabled 上的
        button 浏览器层面就不触发 click 事件）。
      */}
      <button
        class={clsx(s.deck, props.canDraw && !empty() && s.deckActive, empty() && s.deckEmpty)}
        onClick={() => props.onDraw()}
        disabled={!props.canDraw || empty()}
        aria-label={isBlack() ? '抽黑牌' : '抽白牌'}
        type="button"
      >
        <div class={s.deckStack}>
          <For each={Array.from({ length: stackCount() }, (_, i) => i)}>
            {(i) => (
              <div
                class={s.deckCard}
                style={{
                  transform: `translate(${i * 1.4}px, ${i * -1.6}px) rotate(${(i - 1.5) * 1.2}deg)`,
                }}
              >
                <DeckBackSvg color={props.color} />
              </div>
            )}
          </For>
        </div>
        <div class={s.deckCount}>
          <span>{props.count}</span>
        </div>
      </button>
      <div class={clsx(s.deckLabel, isBlack() ? s.deckLabelBlack : s.deckLabelWhite)}>
        {isBlack() ? '黑 BLACK' : '白 WHITE'}
      </div>
    </div>
  );
}

function DeckBackSvg(props: { color: Color }) {
  const isBlack = () => props.color === 'black';
  const cardFill = () => (isBlack() ? '#0a0a0a' : '#ece5cf');
  const cardStroke = () => (isBlack() ? '#fafaf3' : '#0a0a0a');
  const monoFill = () => (isBlack() ? '#fafaf3' : '#0a0a0a');
  return (
    <svg viewBox="0 0 80 112" class={s.deckSvg}>
      <path d="M 4 4 L 64 4 L 76 16 L 76 108 L 4 108 Z" fill={cardFill()} stroke={cardStroke()} stroke-width="3" />
      <path d="M 64 4 L 76 4 L 76 16 Z" fill="#e60022" stroke={cardStroke()} stroke-width="2" />
      <g>
        <path d="M -10 60 L 80 30" stroke="#e60022" stroke-width="14" />
        <path d="M -10 80 L 80 50" stroke={cardStroke()} stroke-width="2" />
      </g>
      <text
        x="40"
        y="78"
        text-anchor="middle"
        fill={monoFill()}
        font-style="italic"
        font-size="28"
        font-weight="700"
        class={s.deckMonogram}
      >
        DV
      </text>
      <g>
        <For each={Array.from({ length: 6 }, (_, i) => i)}>
          {(i) => <circle cx={10 + i * 11} cy={96} r={1.5} fill="#e60022" />}
        </For>
      </g>
    </svg>
  );
}
