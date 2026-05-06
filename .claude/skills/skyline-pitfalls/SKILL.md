---
name: skyline-pitfalls
description: Skyline 1.4.7 实战踩坑清单。本项目（phantom-cipher 微信小程序端）在 Skyline 1.4.7 + glass-easel 上遇到的限制与绕坑方案。每条都给"症状 → 根因 → 绕法"。触发关键词：动画不生效、@keyframes、box-shadow、style isolation、styleIsolation、组件样式隔离、width max-content、min-width auto、fit-content、button margin、universal selector、*、scroll-view clip、scroll-into-view、tap 冒泡、自定义组件 bind:tap、letter-spacing 截断、片字消失、filter drop-shadow、动画跑了没效果、CSS 不生效、样式不生效。
---

# Skyline 1.4.7 实战踩坑清单

> 项目锁定 Skyline 1.4.7（升 1.4.15+ 可能修掉一部分）。每条都被本项目实测过，**先查这里再 debug**，省时间。

## 适用场景

- WXSS 写了样式但视觉上完全没动 → 先翻这里
- 动画 `animation:` 跑了但效果是 0 → 先翻这里
- `<button>` / `scroll-view` 行为反常 → 先翻这里
- "我代码没毛病但就是不工作" → 99% 来这里就能找到原因

---

## 1. 全局 @keyframes 在自定义组件 wxss 里**名字解析为空**

**症状**：组件 wxss 里写 `animation: my-anim 1s ...`，my-anim 在 app.wxss 定义。结果 animation 跑了（DOM 上看得到 animation 属性）但视觉上完全没动。

**根因**：自定义组件默认 `styleIsolation: 'isolated'`。app.wxss 的 `@keyframes` 在组件 scope 下名字解析成 0 帧（empty keyframe），等于动画跑空气。

**绕法**：**keyframe 必须在用它的组件 wxss 里本地定义**。哪怕几个组件都用同一段，复制粘贴比放 app.wxss 靠谱。

```css
/* ❌ 不行：app.wxss 定义，组件 wxss 引用 */
/* app.wxss */
@keyframes p5-pulse { 0% { ... } 100% { ... } }
/* deck.wxss */
.deck.active { animation: p5-pulse 1s infinite; }  /* 跑了但没效果 */

/* ✅ 行：组件 wxss 自定义 */
/* deck.wxss */
.deck.active { animation: deck-pulse 1s infinite; }
@keyframes deck-pulse { 0% { ... } 100% { ... } }
```

**本项目实例**：commit `cf92644`（tile / number-picker / player-row / qrcode-overlay 集体搬本地）。

---

## 2. `width / min-width / max-width / height / min-height / max-height` 只接受 `<length>`

**症状**：写 `width: max-content` 让按钮按内容撑开，结果按钮宽度被父容器收缩，文字被裁掉。

**根因**：Skyline 的 `width` 等盒模型尺寸属性 BNF 是 `<length>` —— 字面值（rpx / px）才有效。`max-content / fit-content / min-content / auto` 全部**静默忽略**，就当你没写。

**绕法**：估算内容宽度后给一个足够的 `min-width` 数值。

```css
/* ❌ 不行 */
.share-btn { width: max-content; }   /* 静默被忽略 */

/* ✅ 行 */
.share-btn { min-width: 480rpx; }    /* 算一下内容宽度，给硬下限 */
```

**本项目实例**：commit `8bdfae4`（"邀请好友 · 转发卡片" 最后一字"片"被裁）。

参考 `.claude/skills/skyline-wxss/references/layout.md`。

---

## 3. 微信 `<button>` 不接 `margin`（Skyline 下）

**症状**：在 `<button>` 上写 `margin / margin-left / ...`，怎么改都没效果。

**根因**：微信 `<button>` 自带一套 reset，Skyline 渲染时 margin 不生效。

**绕法**：把间距挪到**相邻的非 button 元素**上（margin-right / margin-left）。

```html
<!-- ❌ 不行 -->
<view class="back-btn">←</view>
<button class="cipher" style="margin-left: 14rpx">...</button>

<!-- ✅ 行 -->
<view class="back-btn" style="margin-right: 14rpx">←</view>
<button class="cipher">...</button>
```

**本项目实例**：commit `a1996fa`（CIPHER 卡跟 back 按钮间距）。

---

## 4. WXSS 不支持 universal selector `*`

**症状**：编译报错 `error at token '*'`，整个 wxss 文件挂掉。

**根因**：Skyline wxss 解析器不收 `*`，包括 `> *` / `*:last-child` / `* > *` 等。

**绕法**：枚举具体类名 / 标签。

```css
/* ❌ 报错 */
.row > * { margin-right: 18rpx; }
.row > *:last-child { margin-right: 0; }

/* ✅ 行 */
.row icon, .row .label { margin-right: 18rpx; }
/* .row 的最后一个具体子项不写规则就行 */
```

**本项目实例**：commit `eeedbd4`（number-picker / qrcode-overlay）。

---

## 5. `box-shadow` 在 keyframe 里不生效（1.4.7 bug，1.4.15 修复）

**症状**：keyframe 里 `box-shadow: 0 0 12rpx red;` 完全不动，可能还会闪退。

**根因**：1.4.7 的 CSS 动画引擎对 box-shadow 处理有 bug。changelog：「box-shadow 在 CSS 动画中不生效及导致的闪退问题」（fixed in 1.4.15）。

**绕法**：
- 静态 `box-shadow` 写在 class 上没问题，class 切换时 shadow 跟着出现/消失，做"瞬时光晕"够用
- 真要动画化光晕，用一个独立 view 模拟 halo（border-color + opacity + scale 都能在 keyframe 里跑）

```css
/* ❌ 不行 */
@keyframes glow {
  0% { box-shadow: 0 0 0 red; }
  50% { box-shadow: 0 0 24rpx red; }
}

/* ✅ 静态 + class 切换 */
.deck.active { box-shadow: 0 0 32rpx 6rpx rgba(230,0,34,0.55); }

/* ✅ 独立 halo view 做动效 */
.tile .halo { border: 4rpx solid transparent; opacity: 0; }
.tile.flash .halo {
  animation: halo 1s;
}
@keyframes halo {
  0% { opacity: 0; transform: scale(1); border-color: transparent; }
  35% { opacity: 1; transform: scale(1.2); border-color: gold; }
  100% { opacity: 0; transform: scale(1); border-color: transparent; }
}
```

**本项目实例**：commit `ba5e931`（牌堆红光 / tile 命中失手金红光晕）。

---

## 6. `filter` 限制：不支持 `drop-shadow()` / `url()` / 多函数组合

**症状**：`filter: drop-shadow(0 0 12rpx red)` 没效果，或多个 filter 函数组合时只生效一个。

**根因**：Skyline filter 仅支持 `blur / brightness / contrast / grayscale / hue-rotate / invert / opacity / saturate / sepia` 单函数。`url()` `drop-shadow()` 直接不收。

**绕法**：
- 想要 drop-shadow → 用 box-shadow（静态）或独立 halo view
- 多 filter 组合 → 嵌套两层 view 各 apply 一个 filter

参考 `.claude/skills/skyline-wxss/references/visual.md`。

---

## 7. `animation-fill-mode: backwards / none` 实际表现都是 `forwards`

**症状**：写了 `animation-fill-mode: backwards` 想让节点在动画前保持初始帧（隐藏），结果节点立刻显示在终止帧。

**根因**：Skyline 文档原话：「animation-fill-mode：none 和 backwards 虽可写但实际表现均为 forwards」。

**绕法**：用 `opacity: 0` + class 触发动画来实现"挂载即隐藏，等动画播完显示"。或者明确用 `forwards` 配合 `animation-delay`。

---

## 8. scroll-view 默认 `clip: true`，子元素溢出会被裁

**症状**：scroll-view 内放 tile，tile 顶部有 `position: absolute; top: -28rpx` 的标签，标签被 scroll-view 边界吃掉。

**根因**：Skyline scroll-view 专属属性 `clip` 默认 `true`，强制裁剪超出滚动容器的内容。**`overflow: visible` 在 scroll-view 上无效**。

**绕法**：scroll-view 加 `clip="{{false}}"`。

```html
<scroll-view scroll-x type="list" enhanced clip="{{false}}">
  <view><tile />  <!-- tile 顶部标签现在能溢出 --></view>
</scroll-view>
```

**本项目实例**：commit `0a7877d`（自己手牌横向滚动里 NEW/OPEN 标签被裁）。

---

## 9. scroll-view 的声明式 `scroll-into-view` 在新增节点同帧不可靠

**症状**：抽到新牌后想把 scroll-view 滚到这张牌，写 `scroll-into-view="{{newTileId}}"` 同时新 tile-cell 也是这一帧加进来 —— 滚动哑掉。

**根因**：scroll-view 计算 target 位置时新节点尚未完成布局，找不到目标 → 无操作。

**绕法**：scroll-view 开 `enhanced`，拿 ScrollViewContext，在 `wx.nextTick` 里调 `scrollIntoView()`。

```html
<scroll-view id="hand-scroll" enhanced ...>
```

```js
async _scrollToTile(tileId) {
  const ctx = await this._getScrollViewCtx();   // createSelectorQuery().select('#hand-scroll').node()
  ctx.scrollIntoView('#tile-' + tileId, {
    alignment: 'center',
    animated: true,
  });
},
observers: {
  'tiles': function (tiles) {
    const pending = tiles.find(t => t.pending);
    if (!pending) return;
    wx.nextTick(() => this._scrollToTile(pending.id));   // 等渲染落地后再滚
  },
},
```

**本项目实例**：commit `f7e2632`（player-row 抽牌自动滚动）。

参考 `.claude/skills/skyline-scroll-api/references/api/scroll-view-context.md`。

---

## 10. 自定义组件的 `bind:tap` 同时收原生 tap 和自定义 tap 事件

**症状**：tile 组件内部判断 `if (!clickable) return` 不 triggerEvent，但父组件 `<tile bind:tap="onTileTap">` 还是收到 tap 事件。

**根因**：父组件 `bind:tap` on custom component 接两份事件：
1. 自定义 `triggerEvent('tap', ...)` 触发的事件
2. 组件根 view 上**原生** tap 事件冒泡

子组件 `triggerEvent` 不发，原生 tap 还是会冒上来。

**绕法**：父组件 handler 里再做一次门禁，按业务条件过滤。

```js
// player-row.js
onTileTap(e) {
  const id = e.currentTarget.dataset.id;
  if (!id) return;
  // 子组件已经判过一次，但原生 tap 还会冒上来，这里再判一次
  if (!this.data.canTarget) return;
  const tile = this.data.tiles.find(t => t.id === id);
  if (!tile || tile.revealed) return;
  this.triggerEvent('tileTap', { tileId: id });
}
```

**本项目实例**：commit `4ae2f21`（已亮牌不应可点）。

---

## 11. 微信 `<button>` 默认 `overflow: hidden`，要 reset 一堆默认样式

**症状**：用 `<button>` 当大型按钮，里面文字被裁；或者按钮带默认圆角 / 默认描边 / 比 view 多一圈 padding。

**根因**：微信 `<button>` 自带 padding / line-height / border-radius / `::after` 描边等默认样式。Skyline 下还自带 `overflow: hidden`，加上外层 skewX 会让里面的反斜成直的 text 戳出斜框被裁。

**绕法**：明确 reset。

```css
.my-button {
  padding: 0;
  line-height: 1;
  border-radius: 0;
  overflow: visible;       /* 想让 skew + counter-skew 内容溢出可见 */
}
.my-button::after { border: none; }
```

**本项目实例**：commit `b287e14` / `6592b74`（CIPHER 卡 + 邀请按钮）。

---

## 12. flex `gap` 在 1.4.7 不稳，最后一个 flex item 可能被裁

**症状**：flex 容器用 `gap: 14rpx`，最后一个子节点显示不全或被截。

**根因**：Skyline 1.4.7 flex+gap 已知 bug（1.4.13+ 修）。

**绕法**：去掉 gap，改用子元素 `margin-right`（或 `margin-bottom` 看方向）。

```css
/* ❌ */
.row { display: flex; gap: 14rpx; }

/* ✅ */
.row { display: flex; }
.row > .item { margin-right: 14rpx; }
.row > .item:last-child { margin-right: 0; }
/* 注意：Skyline 不支持 *，要用具体类名（见第 4 条） */
```

**本项目实例**：tile-cell 间距、deck-row、joker-row 等多处。

---

## 13. keyframe 里的 transform 会**完全替换**基础 transform

**症状**：`.tile { transform: rotate(-2deg); }` 是基础态。keyframe 里写 `transform: scale(1.1)` 想做"放大同时保持旋转"，结果旋转直接没了 —— 节点被强制 scale(1.1) rotate(0deg)。

**根因**：CSS transform 是单值属性，keyframe 的 transform 整体替换基础 transform。

**绕法**：keyframe 里把基础 transform 也写全。

```css
.tile { transform: rotate(-2deg); }

/* ❌ 旋转丢了 */
@keyframes pop { 50% { transform: scale(1.1); } }

/* ✅ */
@keyframes pop {
  0%, 100% { transform: rotate(-2deg) scale(1); }
  50%      { transform: rotate(-2deg) scale(1.1); }
}
```

---

## 14. 字体 / 文本相关属性**不可 transition / animation**

不支持 transition/animation 的：`color`、`font-size`、`font-weight`、`font-style`、`font-family`、`line-height`、`letter-spacing`、`word-spacing`、`text-align`、`text-shadow`、`white-space`、`word-break`、`visibility`、`pointer-events`。

想做颜色渐变？用 `background-color` + `color` 装文字载体（一般是 view 包文字）；想做尺寸渐变？用 `transform: scale()`。

参考 `.claude/skills/skyline-wxss/references/animation.md`。

---

## 15. `will-change` 只支持 `auto / contents`

`will-change: transform` 等具体属性名都不收。直接写 `will-change: contents` 或不写。

---

## 16. 自定义组件接收的 prop 改成 kebab-case 传

WXML 里写 `<my-comp can-draw="{{x}}">` 对应组件里 `canDraw` 属性。混着写 `canDraw="{{x}}"` 也能 work，但所有组件用了 kebab-case 标准就一致。

---

## 调试速查表

| 症状 | 怀疑顺序 |
|------|----------|
| animation 跑了视觉没变化 | 1（全局 keyframe）→ 13（transform 被替换）→ 5（box-shadow keyframe）|
| 元素宽度被压缩 / 不按内容撑开 | 2（width:max-content 不收）|
| `<button>` 行为反常 | 3（margin 不生效）→ 11（默认 overflow:hidden / `::after`）|
| 编译报 `error at token '*'` | 4（universal selector）|
| scroll-view 内子元素被裁 | 8（clip:true）|
| 滚动定位失败 | 9（声明式 scroll-into-view 时序）|
| 自定义组件 tap 重复触发 / 不该响应却响应 | 10（原生 tap + 自定义 tap 双发）|
| 最后一项 flex 子节点被裁 | 12（gap bug）|
| filter 没效果 | 6（drop-shadow / 多函数组合不收）|

## 相关技能

- `skyline-wxss`：CSS 属性支持完整清单
- `skyline-scroll-api`：ScrollViewContext / DraggableSheetContext 完整 API
- `skyline-worklet`：worklet 动画系统（CSS 不够用时的兜底）
- `skyline-overview/references/changelog/changelog.md`：bug 修复历史，确认你踩的坑哪个版本修了
