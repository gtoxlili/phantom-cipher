/**
 * 震动反馈工具：所有调用都 try/catch 静默降级，
 *   - 用户在系统层关了震动 → wx 自己不会 throw 但也不震，无副作用
 *   - 老设备 / 鸿蒙某些版本不支持 wx.vibrateShort type 参数 → fallback 到不带 type
 *   - WeChat 真机若 base library 太老，调用直接抛 —— catch 掉即可
 *
 * 取值哲学：
 *   light  → 普通点击反馈（抽牌、选牌、按数字、收手等高频操作）
 *   medium → 状态性反馈（开局、命中对手、轮到我）
 *   heavy  → 失误 / 被命中（猜错 / 自己被人猜中）
 *   long   → 终局（胜利 / 失败）
 */

function safeShort(type) {
  try {
    wx.vibrateShort({ type, fail() { /* 静默 */ } });
  } catch (_e) {
    try { wx.vibrateShort({ fail() {} }); } catch (_e2) { /* 不支持就算了 */ }
  }
}

function light() { safeShort('light'); }
function medium() { safeShort('medium'); }
function heavy() { safeShort('heavy'); }
function long_() {
  try {
    wx.vibrateLong({ fail() {} });
  } catch (_e) { /* 不支持就算了 */ }
}

module.exports = {
  light,
  medium,
  heavy,
  long: long_,
};
