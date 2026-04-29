import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';
import path from 'node:path';
import { constants as zlibConstants } from 'node:zlib';

export default defineConfig({
  plugins: [
    solidPlugin(),
    // 构建期预压缩——产物旁边出 .br / .gz 兄弟文件。
    //
    // 服务器侧 nginx 已配 `brotli_static on; gzip_static on`，但
    // Vite 默认不产 .br/.gz，导致 *_static 完全没生效，每个未缓存
    // 请求让 nginx 实时压一次（level 5 中庸值）。预压缩后：
    //
    //   - br quality 11（最高比）一次性压好，nginx 直接 sendfile，
    //     CPU 开销归零
    //   - 比 nginx 运行时 level 5 再小 10-20%
    //   - CF 边缘缓存的也是更小的版本，下行带宽双重省
    //
    // threshold: 1024 跟 nginx brotli_min_length / gzip_min_length
    // 对齐——< 1KB 的小文件压不动，省得污染目录
    compression({
      algorithms: [
        defineAlgorithm('brotliCompress', {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
        }),
        defineAlgorithm('gzip', { level: 9 }),
      ],
      // 显式 include：插件默认 pattern (`html|xml|css|json|js|mjs|svg|yaml|yml|toml`)
      // 不含 .wasm，inf-fingerprint 那个 345KB 的 wasm 主体不压就是 ~250KB
      // 浪费下行，加进来后 br q=11 能压到 ~95KB
      include: [/\.(html|xml|css|json|js|mjs|svg|wasm)$/],
      exclude: [/\.(br|gz|woff2?)$/],
      threshold: 1024,
    }),
  ],
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
