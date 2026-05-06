/**
 * 共用工具：相对时间格式化、时长格式化、状态机分支助手等。
 * 跟 frontend 各 route / 组件里手抄的一份逻辑保持一致。
 */

function relativeTime(ts, now) {
  const n = typeof now === 'number' ? now : Date.now();
  const diff = Math.max(0, n - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚才';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' 分钟前';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' 小时前';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + ' 天前';
  const mon = Math.floor(day / 30);
  return mon + ' 个月前';
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return sec + ' 秒';
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec === 0 ? min + ' 分钟' : min + ' 分 ' + remSec + ' 秒';
}

function forfeitSecondsLeft(deadline, now) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

module.exports = { relativeTime, formatDuration, forfeitSecondsLeft, clamp };
