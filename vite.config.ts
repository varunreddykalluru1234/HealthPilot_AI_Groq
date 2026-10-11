import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // lucide-react uses dynamic imports that confuse the pre-bundler
    exclude: ['lucide-react'],
    // pdfjs-dist v6 is pure ESM — include it so Vite pre-bundles it
    // correctly and the worker URL resolves at runtime.
    include: ['pdfjs-dist'],
  },
  worker: {
    // Ensure web workers are emitted as ES modules (compatible with
    // pdfjs-dist's pdf.worker.min.mjs)
    format: 'es',
  },
});
