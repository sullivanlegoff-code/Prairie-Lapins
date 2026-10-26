import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';

// The laboratory shares the shell, but must never advertise the game's app identity.
export default defineConfig(({mode}) => ({
  // Phaser (the engine, about 1.2 MB minified) ships in its own file: the game code stays small and is cached apart.
  build: {chunkSizeWarningLimit: 1300, rollupOptions: {output: {manualChunks: (id: string) => id.replace(/\\/g, '/').includes('/node_modules/phaser/') ? 'phaser' : undefined}}},
  test: {css: {include: /(?:cooktap-prototype\/style|src\/display\/styles)\.css/}},
  ...(mode === 'cooking-prototype' ? {root: resolve('cooktap-prototype'), publicDir: resolve('cooktap-prototype/public')} : {}),
  plugins: [{
    name: 'game-install-metadata',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const laboratory = mode === 'laboratory' || mode === 'decorations-preview'
          || new URL(context.originalUrl ?? '/', 'http://local.invalid').searchParams.get('dev') === '1';
        return laboratory ? html.replace(/<!-- app-install:start -->[\s\S]*?<!-- app-install:end -->/, '') : html;
      },
    },
  }],
}));
