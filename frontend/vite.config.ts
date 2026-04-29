import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'node:path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'styled-system': path.resolve(import.meta.dirname, 'styled-system'),
    },
  },
  server: {
    // In dev, the Solid app runs on :5173 and proxies API calls to
    // the Rust backend on :3000. WebSockets need their own block
    // because Vite's default proxy doesn't upgrade them.
    port: 5173,
    proxy: {
      '/api/room': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/api/stats': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    // 默认 esbuild 的 CSS minify 已经够快，但 lightningcss（Rust
    // 写的）输出小 5-15%、还顺手做 vendor prefix 折叠。Solid 应用
    // 体积已经小，CSS 上能再省几 KB 不嫌多。
    cssMinify: 'lightningcss',
    // Vite 默认会注入一段几百字节的 modulepreload polyfill 兜底
    // 老 Safari (<11.1)，但能跑 Solid + ES2022 输出的浏览器全都
    // 原生支持 modulepreload，这段 polyfill 是死代码。
    modulePreload: { polyfill: false },
    // 命名加 hash，跟 Rust 端的 immutable 长缓配套。
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  css: {
    // 跟 cssMinify 配套——这层让 lightningcss 也接管 transform
    // 过程（autoprefixer 等价物 + 现代 CSS 语法降级），开发期就
    // 用上跟构建期一致的 CSS 引擎。
    transformer: 'lightningcss',
  },
});
