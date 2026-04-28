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
  // Resolves relative URLs in icons / og:image / twitter:image to
  // absolute URLs at build time. SITE_URL comes from .env.production
  // (`https://cipher.gtio.work`) — dev falls back to localhost so
  // OG previews simply won't be useful in dev (which is fine, they
  // get regenerated per deploy anyway).
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3477'),
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
  // Share-link previews. og-image.png is 1200×1200 (1:1) with a SOLID
  // #0a0a0a background — WeChat strongly prefers square images, and
  // refuses to render transparent PNGs reliably on iPhone.
  //
  // Caveat: WeChat's H5 link-preview behaviour is not documented and
  // is unstable for sites without an Official Account + JS-SDK
  // integration. Even with perfect tags, the card may show as a
  // bare link in some chat contexts — that's WeChat's policy, not
  // a bug we can fix from the page side.
  openGraph: {
    title: 'TAKE THEIR CIPHER · 达芬奇密码',
    description: '二十四块密码 · 唯一的胜者。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '怪盗密码',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
        alt: '达芬奇密码 · TAKE THEIR CIPHER',
      },
    ],
  },
  // Twitter card — `summary_large_image` for the bigger preview.
  twitter: {
    card: 'summary_large_image',
    title: 'TAKE THEIR CIPHER · 达芬奇密码',
    description: '二十四块密码 · 唯一的胜者。',
    images: ['/og-image.png'],
  },
  // WeChat / 老式 social parsers besides og:* — Schema.org's
  // itemprop and the legacy `name="image"` are sometimes the only
  // signals certain crawlers pick up. Cheap insurance.
  other: {
    'image': 'https://cipher.gtio.work/og-image.png',
    'msapplication-TileImage': '/og-image.png',
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
