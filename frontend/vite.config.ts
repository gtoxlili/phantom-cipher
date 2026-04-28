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
    // Keep chunk names predictable so the Rust static-server's
    // long-cache headers can target hashed asset paths.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
