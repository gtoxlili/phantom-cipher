// 玩家身份 = 浏览器指纹（FingerprintJS visitorId）。
//
// 比之前的 sessionStorage UUID 强在哪：
//   1. 跨标签页同身份（不再"开两个 tab 算两个人"）
//   2. 关浏览器后再来还是同一个 ID，排行榜累计正确
//   3. 用户清 cookie / 清 site data 拦不住，胜场不能轻易刷
//
// 缺陷诚实交代：
//   1. 同电脑两个人轮流玩会撞 ID（共享设备场景，没救）
//   2. 反指纹浏览器（Brave / Firefox RFP / 部分 Safari）会拿到一个
//      退化的指纹——意味着用这些浏览器的玩家彼此之间会撞 ID。这部分
//      占比 <5%，可以接受
//   3. 浏览器更新可能让指纹漂移——FingerprintJS 内部有 stable hash
//      策略，95%+ 情况能稳住，但不是 100%
//
// 所以**不是**真正的"账号系统"——只是"比 sessionStorage UUID 更
// 接近真实玩家身份的近似"。要严格的多设备身份还是得做账号。

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { createSignal } from 'solid-js';

const STORAGE_KEY = 'davinci-fp-id';

function readCached(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    // Safari 隐私模式 / 配额满
    return null;
  }
}

function writeCached(id: string): void {
  try {
    localStorage?.setItem(STORAGE_KEY, id);
  } catch {
    // 同上，最坏情况是下次访问重算指纹（300ms），不影响功能
  }
}

const cached = readCached();
// 首次启动 + 没缓存的情况下 playerId 暂时是空字符串，
// Room.tsx 的 join effect 会因为 `!pid` 短路等待。FingerprintJS
// 跑完后再 set 进来，这时 effect 重新触发就拿到真身份了。
//
// 不用 UUID 兜底立即可用是为了避免一个 race：UUID 占位时如果用户
// 刚好这一瞬完成 join，服务端记的就是 UUID；几百 ms 后指纹算完，
// 后续动作改用指纹 ID 发，服务端会回"not in room"。直接让"无身份"
// 阶段卡住是更稳的设计，反正首次访问玩家还在打字，几乎感知不到。
const [playerId, setPlayerId] = createSignal<string>(cached ?? '');

if (!cached) {
  void (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fpId = result.visitorId; // 32 字符稳定哈希
      setPlayerId(fpId);
      writeCached(fpId);
    } catch {
      // 反指纹浏览器 / CSP / 网络异常的退化路径——退化成 UUID
      // localStorage 缓存住，下次进来就直接用，相当于"曾经能算指纹
      // 的浏览器升级 / 关闭 JS 后退化成 sessionStorage 时代的语义"。
      const uuid = crypto.randomUUID();
      setPlayerId(uuid);
      writeCached(uuid);
    }
  })();
}

export { playerId, setPlayerId };
