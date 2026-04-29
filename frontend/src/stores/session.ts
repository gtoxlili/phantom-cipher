// 客户端持久状态：
//   - myName: 昵称——跟 inf-fingerprint visitor_id 一样跨 tab、关浏览器
//     记住，用 localStorage。语义上要跟服务端 players.display_name
//     对齐：服务端这条是"该 player_id 最近一局用的昵称"，客户端就保留
//     "该浏览器最近用过的昵称"，下次进来直接预填，不用再输。
//   - intentHost: "用户在 home 页点了创建还是加入"，标签页级意图，
//     跟身份/账号无关，sessionStorage 即可（关 tab 就丢，符合预期）。
//
// 文件名 session.ts 是历史遗留——之前两个值都是 sessionStorage，现在
// myName 升级了。re-export 在 game.ts，业务代码从 @/stores/game 引，
// 文件名不暴露给调用方，先不改。

import { createEffect, createMemo, createSignal, on } from 'solid-js';

type StorageKind = 'local' | 'session';

function pickStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Safari 隐私模式有时连 storage 对象都拿不到
    return null;
  }
}

function persistedSignal<T>(key: string, initial: T, kind: StorageKind) {
  const store = pickStorage(kind);
  let stored: T = initial;
  if (store) {
    try {
      const raw = store.getItem(key);
      if (raw !== null) stored = JSON.parse(raw) as T;
    } catch {
      // 旧版本写进去的、或者被人手动改坏了——忽略，回退到初值
    }
  }
  const [get, set] = createSignal<T>(stored);
  createEffect(
    on(get, (v) => {
      try {
        store?.setItem(key, JSON.stringify(v));
      } catch {
        // Safari 隐私模式 / 配额满都会 throw，丢就丢
      }
    }),
  );
  return [get, set] as const;
}

// 一次性迁移：老版本 davinci-name 在 sessionStorage，搬到 localStorage。
// 已经搬过的下次进来 sessionStorage 已空，迁移条件不再成立，幂等。
//
// 不删 sessionStorage 那条不行——会让"sessionStorage 有值 + 用户在
// 这个 tab 改名"的状态在下次启动时被错误识别成"老用户、迁移"。删了
// 干净。
if (typeof window !== 'undefined') {
  try {
    const legacy = window.sessionStorage.getItem('davinci-name');
    if (legacy !== null && window.localStorage.getItem('davinci-name') === null) {
      window.localStorage.setItem('davinci-name', legacy);
      window.sessionStorage.removeItem('davinci-name');
    }
  } catch {
    // ignore — 隐私模式 / 配额，老用户重新输一次昵称即可
  }
}

export const [myName, setMyName] = persistedSignal<string>('davinci-name', '', 'local');
export const [intentHost, setIntentHost] = persistedSignal<boolean>('davinci-host', false, 'session');

export const needName = createMemo(() => !myName());
