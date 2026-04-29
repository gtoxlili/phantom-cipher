// 与 sessionStorage 绑定的小工具。原版 Jotai 的 atomWithStorage
// 干的是同样的事——读初值的时候同步从 sessionStorage 拿，写的时候
// 顺带写回去。Solid 没有现成的 helper，自己做一层很薄就够了。
//
// 注意只用 sessionStorage（标签页级），不是 localStorage。两边
// 行为差很多：sessionStorage 不跨 tab、关 tab 即销毁，正好就是
// 我们想要的"每个 tab 一个玩家身份"语义。

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

export const [playerId, setPlayerId] = sessionSignal<string>('davinci-pid', '');
export const [myName, setMyName] = sessionSignal<string>('davinci-name', '');
export const [intentHost, setIntentHost] = sessionSignal<boolean>('davinci-host', false);

export const needName = createMemo(() => !myName());
