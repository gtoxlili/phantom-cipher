/**
 * 设备安全区计算 —— 一次算好，所有页面共用。
 *
 * 顶端胶囊按钮：固定在右上角的"返回主页/···"系统胶囊。它占的位置
 * 由 `wx.getMenuButtonBoundingClientRect()` 给出（坐标都是 px）。
 * 我们的自定义导航栏要避开它，标准做法是：
 *   navBarHeight = capsule.bottom + (capsule.top - statusBarHeight)
 * 让胶囊在导航栏里垂直居中（上下边距相等）。
 *
 * 底部 home indicator：iPhone X 之后机型的横条占位。
 *   safeBottom = screenHeight - safeArea.bottom
 * 通常是 34px 左右；非全面屏机型为 0。
 *
 * 全部转 rpx 之后再交给页面用是错的——胶囊的尺寸跟屏幕宽度耦合，
 * 我们这边直接拿 px 用 inline style 喂给 padding/top，绕开 rpx 换算。
 */

let cached = null;

function ensureLayout() {
  if (cached) return cached;
  let win, menu;
  try { win = wx.getWindowInfo(); }
  catch (e) { try { win = wx.getSystemInfoSync(); } catch (_) { win = {}; } }
  try { menu = wx.getMenuButtonBoundingClientRect(); }
  catch (e) { menu = null; }

  const statusBarHeight = (win && win.statusBarHeight) || 20;
  const screenWidth = (win && win.screenWidth) || 375;
  const screenHeight = (win && win.screenHeight) || 667;
  const safeAreaBottom = (win && win.safeArea && typeof win.safeArea.bottom === 'number')
    ? win.safeArea.bottom
    : screenHeight;
  const safeBottom = Math.max(0, screenHeight - safeAreaBottom);

  // 没拿到胶囊位置（极端 fallback / 工具早期），按经验值给 32px 高 + 7px 上间距
  const capsuleHeight = (menu && menu.height) || 32;
  const capsuleTop = (menu && menu.top) || statusBarHeight + 6;
  const capsuleBottom = (menu && menu.bottom) || (capsuleTop + capsuleHeight);
  const capsuleLeft = (menu && menu.left) || (screenWidth - 87 - 7);
  const capsuleWidth = (menu && menu.width) || 87;

  // 让胶囊在自定义 navbar 里垂直居中：上下间距 = capsuleTop - statusBarHeight
  const padV = Math.max(0, capsuleTop - statusBarHeight);
  const navBarHeight = capsuleBottom + padV;

  cached = {
    statusBarHeight,
    safeBottom,
    screenWidth,
    screenHeight,
    capsuleTop,
    capsuleBottom,
    capsuleLeft,
    capsuleWidth,
    capsuleHeight,
    navBarHeight,
    // 给"右上角想放点东西"的页面用：胶囊左侧到屏幕右边缘的距离
    // = screenWidth - capsuleLeft. 我们想 fixed 元素不挡胶囊就设
    // 自己的 right >= 这个值 + 8(间距)。
    capsuleSafeRight: screenWidth - capsuleLeft + 8,
  };
  return cached;
}

module.exports = { ensureLayout };
