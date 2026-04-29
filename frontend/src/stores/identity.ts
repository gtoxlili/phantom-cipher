// 玩家身份 = inf-fingerprint visitor_id（公司内部 Rust→WASM 指纹服务，
// 服务端做贝叶斯匹配 + 多次观测下的稳定归一化）。
//
// 比之前的 FingerprintJS 强在哪：
//   1. 在线匹配 + 服务端贝叶斯打分——浏览器版本/字体/系统更新引起
//      的特征漂移会在服务端自动归并到同一个 visitor_id（match_kind
//      = "fuzzy"），不会因小幅特征变化就裂出新身份
//   2. 中国大陆移动端 in-app 浏览器（微信/支付宝/钉钉/飞书/QQ/UC/
//      Quark/抖音/头条/X5/XWEB）有专门的识别和归一化逻辑
//   3. 多次观测累计的 observation_count 给反作弊侧多一个置信信号
//
// 缺陷诚实交代：
//   1. 同电脑两个人轮流玩仍会撞 ID（共享设备场景，没救）
//   2. 反指纹浏览器（Brave / Firefox RFP / 部分 Safari）依然拿到退化
//      指纹——这部分占比 <5%，可以接受
//   3. 服务端不可达时走 offline 降级：本地稳定特征的 xxh3 哈希。
//      文档明确说"不要持久化或作为业务主键"——本文件按这个语义处理：
//      offline 时 from_server=false → 退化成 UUID 占位，跟旧版保持
//      一致语义；不会把 16 位哈希写进 localStorage 镜像
//
// 所以**不是**真正的"账号系统"——只是"比 sessionStorage UUID 更
// 接近真实玩家身份的近似"。要严格的多设备身份还是得做账号。

import init, { identify, type IdentifyOptions } from 'inf-fingerprint';
import { createSignal } from 'solid-js';

const STORAGE_KEY = 'davinci-fp-id';
const FP_ENDPOINT = 'https://fp.influo-ai.com/v1/identify';
// 限流豁免 key，运维层（nginx/网关/WAF）匹配此 key 的请求会绕过
// 常规限流。从 GitHub Secrets → Docker build-arg → Vite define 走
// import.meta.env 注入：仓库代码不 hardcode（公开仓库 clone 就
// 泄露），CI 构建时才装进去。本地开发在 frontend/.env.local 填值
// （已 gitignored）。
//
// vite build 后这个值仍然会被 inline 进 dist 的 JS——任何前端 secret
// 都是这个命运，CI 注入的目标只是让仓库代码层干净 + key 轮换不需要
// 改代码（改 GitHub Secret 重 build 即可）。
//
// 没注入时 FP_API_KEY 为空，identify() 仍正常工作，只是不享受限流
// 豁免——本地 dev 没填值也能跑。
const FP_API_KEY = import.meta.env.VITE_INF_FP_API_KEY ?? '';

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
    // 同上，最坏情况是下次访问重新走 inf-fingerprint identify（命中
    // SDK 自带的 SWR 缓存还是 sync 级开销），不影响功能
  }
}

const cached = readCached();
// 占位策略：复访同步从 localStorage 镜像读出来给 playerId，零等待。
// 首访没镜像时 playerId 是空字符串，Room.tsx 的 join effect 会因为
// `!pid` 短路等 inf-fingerprint identify 返回再 join。
//
// 不立即用 UUID 兜底是为了避免一个 race：UUID 占位时如果用户刚好这
// 一瞬完成 join，服务端记的就是 UUID；几百 ms 后指纹算完，后续动作
// 改用指纹 ID 发，服务端会回"not in room"。直接让"无身份"阶段卡住
// 是更稳的设计，反正首次访问玩家还在打字，几乎感知不到。
//
// 注：inf-fingerprint SDK 内部也有自己的 SWR 缓存（key
// `__inf_fp_identity_cache`），但 storage key 是私有的不能直接读，
// 所以我们再维护一层自己的镜像让"复访同步可用"成立。
const [playerId, setPlayerId] = createSignal<string>(cached ?? '');

void (async () => {
  try {
    // wasm 模块加载——首次 ~50-100ms，浏览器后续自动缓存
    await init();
    // FP_API_KEY 没注入就 omit 整个字段（IdentifyOptions.apiKey 是
    // optional），避免给 SDK 传一个 falsy 空串扰乱 SDK 内部判断
    const opts: IdentifyOptions = { endpoint: FP_ENDPOINT };
    if (FP_API_KEY) opts.apiKey = FP_API_KEY;
    const result = await identify(opts);

    // offline 降级（服务端不可达）：文档明确警告 visitor_id 是本地
    // xxh3 哈希，"不要持久化或作为业务主键"。这里按"没缓存退化成
    // UUID 占位、有缓存继续用旧值"处理——跟旧 FingerprintJS 失败路径
    // 完全对齐。
    if (!result.from_server || !result.visitor_id) {
      if (!cached) {
        const uuid = crypto.randomUUID();
        setPlayerId(uuid);
        writeCached(uuid);
      }
      return;
    }

    // 服务端给出权威 visitor_id：跟镜像不一致就更新（fuzzy 匹配 /
    // 头一次访问 / 镜像被人手清掉 都会走这条）
    if (result.visitor_id !== cached) {
      setPlayerId(result.visitor_id);
      writeCached(result.visitor_id);
    }
  } catch {
    // identify() 文档说"永远不抛异常（除非 endpoint 缺失）"，这里兜
    // init() 加载失败 / wasm 启动异常等极端情况
    if (!cached) {
      const uuid = crypto.randomUUID();
      setPlayerId(uuid);
      writeCached(uuid);
    }
  }
})();

export { playerId, setPlayerId };
