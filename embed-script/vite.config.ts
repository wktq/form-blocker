import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'FormBlocker',
      formats: ['iife', 'es'],
      fileName: (format) => (format === 'es' ? 'form-blocker.mjs' : 'form-blocker.min.js'),
    },
    outDir: path.resolve(__dirname, '../public/embed'),
    emptyOutDir: false,
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Default export only to avoid wrapping the IIFE in a module object that hides init().
        exports: 'default',
      },
    },
  },
});
