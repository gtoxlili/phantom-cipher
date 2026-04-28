import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — drives the "Add to Home Screen" install prompt
 * and the app's identity once installed (icon, splash colors, name in
 * launcher). Served at /manifest.webmanifest by Next.js automatically.
 *
 * Goes hard on the P5 aesthetic: blood-red theme_color tints the
 * status bar of the installed PWA so the device chrome itself looks
 * like the All-Out Attack splash. Shortcuts give Android / Win11 /
 * ChromeOS a long-press quick-action menu — the manifest equivalent
 * of P5's right-shoulder shortcut wheel.
 *
 * No service worker is registered: this app is realtime SSE-only and
 * has no offline mode worth supporting (game state lives on the
 * server). Manifest + HTTPS is enough for installability on iOS 16+,
 * Chrome, Edge, etc.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'davinci-cipher',
    name: 'TAKE THEIR CIPHER // 达芬奇密码',
    short_name: '怪盗密码',
    description:
      '二十四块刻着数字的木牌 · 在藏匿与显露之间用演绎与直觉破译每一块尚未现身的密码。Take their cipher.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    // Blood red — installed PWA's status bar becomes P5-red, which
    // pops against the ink-black content like the All-Out Attack
    // overlay. (In-browser viewing still uses viewport.themeColor
    // from layout.tsx, which stays black.)
    theme_color: '#e60022',
    lang: 'zh-CN',
    dir: 'ltr',
    categories: ['games', 'entertainment', 'social'],
    // Re-use an existing window if the app is already open instead of
    // spawning a new one — feels closer to a native app.
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Maskable variant has the icon inset within the 512x512 frame
      // so Android's adaptive icon system can crop it to any shape
      // without clipping the artwork.
      {
        src: '/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Long-press the home-screen icon → quick actions menu. URL params
    // are read by app/page.tsx to skip straight into the right mode.
    shortcuts: [
      {
        name: '创建棋局 · CREATE',
        short_name: 'CREATE',
        description: '开一局新棋，等队友入局',
        url: '/?intent=create',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: '持密码入局 · JOIN',
        short_name: 'JOIN',
        description: '用 4 字符密码加入朋友的房间',
        url: '/?intent=join',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
