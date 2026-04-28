import '@/styles/index.css';
import '@/styles/global.css';

import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, Noto_Sans_SC, Oswald } from 'next/font/google';
import { Providers } from '@/components/Providers';

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-body',
  display: 'swap',
});

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-cn',
  display: 'swap',
});

export const metadata: Metadata = {
  // Object form sets the home-page title via `default` and reserves
  // `template` for any future nested route titles (e.g. `/room/ABCD`
  // could surface "ROOM · ABCD" without losing the brand suffix).
  title: {
    default: 'TAKE THEIR CIPHER · 达芬奇密码',
    template: '%s · 达芬奇密码',
  },
  description:
    '二十四块刻着数字的木牌 · 在藏匿与显露之间用演绎与直觉破译每一块尚未现身的密码。Take their cipher.',
  applicationName: '怪盗密码',
  keywords: [
    '达芬奇密码',
    'da vinci code',
    'persona 5',
    'P5',
    '怪盗',
    'multiplayer card game',
    '桌游',
    '在线桌游',
  ],
  // iOS home-screen label uses the short, codename-flavored variant
  // so it lines up with the manifest's `short_name`.
  appleWebApp: {
    capable: true,
    title: '怪盗密码',
    statusBarStyle: 'black-translucent',
  },
  // The app talks to no phone numbers / emails / addresses — disabling
  // these stops iOS Safari and the WeChat in-app webview from auto-
  // linking digit strings (e.g. room codes) and breaking taps.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  // Drives WeChat / Telegram / Twitter share-link previews. WeChat
  // pulls title + description + first og:image when the link gets
  // forwarded inside a chat — the Joker icon makes the preview pop.
  openGraph: {
    title: 'TAKE THEIR CIPHER · 达芬奇密码',
    description: '二十四块密码 · 唯一的胜者。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '怪盗密码',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: '达芬奇密码 · TAKE THEIR CIPHER',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning on <html>: browser extensions (e.g.
    // Immersive Translate) inject attributes like data-immersive-
    // translate-page-theme onto <html> before React hydrates, which
    // would otherwise blow up the entire tree as a mismatch.
    <html
      lang="zh-CN"
      className={`${bebas.variable} ${oswald.variable} ${inter.variable} ${notoSC.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
