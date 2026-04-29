import { For } from 'solid-js';
import * as s from './RouteLoading.css';

/**
 * 路由 lazy chunk 加载期的 fallback 屏。
 *
 * 视觉锚点：三张达芬奇牌洗牌（DV / ? / ★）+ P5 红横幅 +"解读密码"
 * 大字打字感入场 + DECRYPTING 闪烁省略号。配色与 Home 一致——
 * ink/paper/blood 三色 + bone 卡牌底，halftone 由 global body::before
 * 提供。
 *
 * 慢 3G 下用户看到的"等开局"那一会儿应该跟在玩游戏一样——而不是
 * 跑到了"加载中"这种陌生页面。这个 fallback 就是这个目的。
 */
const TITLE_GLYPHS = ['解', '读', '密', '码'] as const;

export function RouteLoading() {
  return (
    <main class={s.screen} aria-busy="true" aria-live="polite">
      {/* BG: 红斜条带 + 一道速度线 */}
      <div class={s.stripes} aria-hidden="true" />
      <div class={s.speedLine} aria-hidden="true" />

      {/* 角落罗马数字 + 浮水汉字——跟 Sketch ornament 同款 */}
      <span class={s.cornerMark} aria-hidden="true">· VII · VIII · IX ·</span>
      <span class={s.cornerMarkRight} aria-hidden="true">密</span>

      {/* 中央洗牌 */}
      <div class={s.deckWrap} aria-hidden="true">
        <div class={s.card.three} />
        <div class={s.card.two} />
        <div class={s.card.one} />
      </div>

      {/* 文字层：横幅 + 主标 + 副标 */}
      <div class={s.textBlock}>
        <div class={s.ribbon}><span>· NOW LOADING ·</span></div>

        <h1 class={s.title}>
          {/* 逐字 slamIn——索引 * 90ms 错开，营造"打字"感 */}
          <For each={TITLE_GLYPHS as readonly string[]}>
            {(g, i) => (
              <span class={s.titleGlyph} style={{ 'animation-delay': `${i() * 0.09}s` }}>
                {g}
              </span>
            )}
          </For>
        </h1>

        <span class={s.subtitle}>
          DECRYPTING<span class={s.dots}>···</span>
        </span>
      </div>
    </main>
  );
}
