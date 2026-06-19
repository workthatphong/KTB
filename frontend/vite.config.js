import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';

  return {
    root: process.cwd(),
    publicDir: resolve(process.cwd(), 'public'),
    plugins: [
      react(),
      viteCompression({ algorithm: 'gzip', ext: '.gz' }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
      isAnalyze
        ? visualizer({
            filename: resolve(process.cwd(), 'dist/stats.html'),
            gzipSize: true,
            brotliSize: true,
            open: false,
          })
        : null,
    ].filter(Boolean),
    build: {
      outDir: resolve(process.cwd(), 'dist'),
      emptyOutDir: true,
      manifest: true,
      sourcemap: false,
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'chart-vendor';
            }
            if (id.includes('/lucide-react/')) {
              return 'icon-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});
