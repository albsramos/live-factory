import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The GitHub Pages bundle: React included, so the site loads no scripts from anywhere else.
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: here('./artifact/site-entry.ts'), formats: ['iife'], name: 'LiveFactorySite', fileName: () => 'site.iife.js' },
    outDir: here('./site-dist/.bundle'),
    emptyOutDir: true,
    minify: true,
  },
});
