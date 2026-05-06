/**
 * SVG 图标组件 —— 内嵌 SVG 走 data URI 喂给 <image>，全部 24×24
 * viewBox，颜色用 currentColor 占位、运行时按 color 属性替换。
 *
 * 跟系统 emoji 抢 codepoint 的 Unicode 字符（★ ▶ ◆ ✦ ※ ⚠ ✓ × …）
 * 全部用这套图标替代，避免微信渲染成彩色 emoji 破坏 P5 黑红视觉。
 */

const ICONS = {
  // ★ 五角星，P5 招牌 logo
  star:
    '<path d="M12 2 L14.5 9 L22 9.2 L16 13.7 L18.2 21 L12 17 L5.8 21 L8 13.7 L2 9.2 L9.5 9 Z" fill="currentColor"/>',
  // 实心右指三角，按钮箭头
  'arrow-right':
    '<path d="M5 4 L20 12 L5 20 Z" fill="currentColor"/>',
  // 实心左指三角
  'arrow-left':
    '<path d="M19 4 L4 12 L19 20 Z" fill="currentColor"/>',
  // 角括号左（返回按钮）
  'chevron-left':
    '<path d="M16 4 L8 12 L16 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-right':
    '<path d="M8 4 L16 12 L8 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-down':
    '<path d="M4 9 L12 17 L20 9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-up':
    '<path d="M4 15 L12 7 L20 15" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  // 二维码图标 —— 三个角定位块 + 中间几个像素点
  qr:
    '<g fill="currentColor">' +
    '<rect x="2" y="2" width="7" height="7"/>' +
    '<rect x="15" y="2" width="7" height="7"/>' +
    '<rect x="2" y="15" width="7" height="7"/>' +
    '<rect x="11" y="11" width="2" height="2"/>' +
    '<rect x="14" y="14" width="2" height="2"/>' +
    '<rect x="18" y="11" width="2" height="2"/>' +
    '<rect x="11" y="18" width="2" height="2"/>' +
    '<rect x="18" y="18" width="2" height="2"/>' +
    '</g>',
  // 扫码 / scan：相机取景框四角 + 中间 QR 像素点 + 中线扫描光带
  // 比单纯的 qr 更"扫一扫"，专门给 invite fallback 那个 icon button 用。
  'qr-scan':
    '<g fill="currentColor">' +
    '<path d="M2 2 L10 2 L10 4 L4 4 L4 10 L2 10 Z"/>' +
    '<path d="M22 2 L22 10 L20 10 L20 4 L14 4 L14 2 Z"/>' +
    '<path d="M2 22 L2 14 L4 14 L4 20 L10 20 L10 22 Z"/>' +
    '<path d="M22 22 L14 22 L14 20 L20 20 L20 14 L22 14 Z"/>' +
    '<rect x="7" y="7" width="3" height="3"/>' +
    '<rect x="14" y="7" width="3" height="3"/>' +
    '<rect x="7" y="14" width="3" height="3"/>' +
    '<rect x="14" y="14" width="3" height="3"/>' +
    '<rect x="11" y="11" width="2" height="2"/>' +
    '</g>',
  // 实心菱形（howto 列表项前缀、用于"重要"标记）
  diamond:
    '<path d="M12 2 L22 12 L12 22 L2 12 Z" fill="currentColor"/>',
  // 八芒星 sparkle，shuffle 按钮 / sketch 装饰
  sparkle:
    '<path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" fill="currentColor"/>',
  // 对勾 ✓
  check:
    '<path d="M4 12 L10 18 L20 6" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  // 叉 × 关闭
  cross:
    '<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>',
  // 警告三角 ⚠
  warning:
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M12 3 L22 21 L2 21 Z"/>' +
    '<path d="M12 9 L12 14"/>' +
    '<circle cx="12" cy="17.5" r="0.5" fill="currentColor"/>' +
    '</g>',
  // 米点 ※（hook mark），改成"四向米字"几何
  asterisk:
    '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none">' +
    '<path d="M12 4 L12 20"/>' +
    '<path d="M5 8 L19 16"/>' +
    '<path d="M5 16 L19 8"/>' +
    '</g>',
  // 三道杠 hamburger（log 按钮）
  bars:
    '<g fill="currentColor">' +
    '<rect x="3" y="5" width="18" height="2.5"/>' +
    '<rect x="3" y="11" width="18" height="2.5"/>' +
    '<rect x="3" y="17" width="12" height="2.5"/>' +
    '</g>',
  // 加号（joker placement 槽位）
  plus:
    '<g stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
    '<path d="M12 4 L12 20"/>' +
    '<path d="M4 12 L20 12"/>' +
    '</g>',
  // 实心圆点 bullet
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  // 信封（footer 邮件按钮，目前未用，备着）
  envelope:
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<rect x="3" y="6" width="18" height="13" rx="1"/>' +
    '<path d="M3 7 L12 14 L21 7"/>' +
    '</g>',
};

function buildSvgUrl(name, color) {
  const inner = ICONS[name];
  if (!inner) return '';
  const colored = inner.replace(/currentColor/g, color);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    colored +
    '</svg>';
  // utf8 + URL 编码——比 base64 短，调试时浏览器开发者工具能直接读
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    name: { type: String, value: '' },
    /** size 单位 rpx */
    size: { type: Number, value: 32 },
    /** CSS color，默认 currentColor 跟父级文本颜色 */
    color: { type: String, value: '#fafaf3' },
  },
  data: { src: '' },
  observers: {
    'name, color': function (name, color) {
      this.setData({ src: buildSvgUrl(name, color) });
    },
  },
});
