/**
 * 注册和 web 端 frontend 一致的 P5 拉丁字体：
 *   Bebas Neue (display) / Oswald (condensed) / Inter (body)。
 * CDN 用 jsd.onmicrosoft.cn（jsdelivr 国内镜像），@fontsource 子集 WOFF。
 *
 * 格式选择：@fontsource v5+ 包里只发 WOFF / WOFF2，不再发 TTF。
 * WeChat wx.loadFontFace 支持 TTF / OTF / WOFF（不支持 WOFF2），所以
 * 走 .woff。错路径会返回 HTML 404 文本（magic bytes 0x436F756C = "Coul"
 * 即 "Couldn't find..."），日志报 "OTS parsing error: invalid sfntVersion"。
 *
 * 注意：
 *   - wx.loadFontFace 默认 scope='webview'，必须显式 'global' 才会跨页面生效
 *   - URL 所在域名 (jsd.onmicrosoft.cn) 需要在微信公众平台后台「downloadFile
 *     合法域名」白名单里登记，否则真机调起会失败（开发者工具勾"不校验合法
 *     域名"也能跑）
 *   - 加载失败不抛、不影响首屏；font-family fallback 链里有系统字体顶上
 *
 * 字体加载是异步的，等 wx 触发渲染重排时已经生效。我们这里 fire-and-forget
 * 即可，App.onLaunch 里调一次就行。
 */

const FONTS = [
  {
    family: 'Bebas Neue',
    source: 'https://jsd.onmicrosoft.cn/npm/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
    weight: '400',
    style: 'normal',
  },
  {
    family: 'Oswald',
    source: 'https://jsd.onmicrosoft.cn/npm/@fontsource/oswald/files/oswald-latin-700-normal.woff',
    weight: '700',
    style: 'normal',
  },
  {
    family: 'Oswald',
    source: 'https://jsd.onmicrosoft.cn/npm/@fontsource/oswald/files/oswald-latin-700-italic.woff',
    weight: '700',
    style: 'italic',
  },
  {
    family: 'Inter',
    source: 'https://jsd.onmicrosoft.cn/npm/@fontsource/inter/files/inter-latin-700-normal.woff',
    weight: '700',
    style: 'normal',
  },
  {
    family: 'Inter',
    source: 'https://jsd.onmicrosoft.cn/npm/@fontsource/inter/files/inter-latin-900-normal.woff',
    weight: '900',
    style: 'normal',
  },
];

function loadOne({ family, source, weight, style }) {
  try {
    wx.loadFontFace({
      family,
      source: 'url("' + source + '")',
      desc: { weight, style },
      scope: 'global',
      success() { /* loaded */ },
      fail() { /* 系统 fallback 兜底，不影响功能 */ },
    });
  } catch (_e) { /* 老 base library 不支持就放弃 */ }
}

function loadAll() {
  FONTS.forEach(loadOne);
}

module.exports = { loadAll };
