import '@/styles/index.css';
import '@/styles/global.css';

import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, Noto_Sans_SC, Oswald } from 'next/font/google';
import { Providers } from './Providers';

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
  title: '达芬奇密码 // DA VINCI\'S CIPHER',
  description: 'Take their cipher.',
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
    <html lang="zh-CN" className={`${bebas.variable} ${oswald.variable} ${inter.variable} ${notoSC.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
