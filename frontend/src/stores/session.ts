// 标签页级的小状态：昵称、是否以房主意图打开 home 页。
// 跟 identity.ts（localStorage 缓存的指纹身份）分开管，因为这俩
// 的语义不一样——身份要跨 tab 一致，昵称只对当前 tab 有意义
// （用户开两个 tab 演两个玩家时各自起名）。
//
// 注：playerId 已经搬到 identity.ts，那里走的是 inf-fingerprint
// + localStorage 缓存的稳定 ID 路径。

import { createEffect, createMemo, createSignal, on } from 'solid-js';

function sessionSignal<T>(key: string, initial: T) {
  let stored: T = initial;
  if (typeof sessionStorage !== 'undefined') {
    const raw = sessionStorage.getItem(key);
    if (raw !== null) {
      try {
        stored = JSON.parse(raw) as T;
      } catch {
        // 旧版本写进去的、或者被人手动改坏了——忽略，回退到初值
      }
    }
  }
  const [get, set] = createSignal<T>(stored);
  createEffect(
    on(get, (v) => {
      try {
        sessionStorage?.setItem(key, JSON.stringify(v));
      } catch {
        // Safari 隐私模式 / 配额满都会 throw，丢就丢
      }
    }),
  );
  return [get, set] as const;
}

export const [myName, setMyName] = sessionSignal<string>('davinci-name', '');
export const [intentHost, setIntentHost] = sessionSignal<boolean>('davinci-host', false);

export const needName = createMemo(() => !myName());
