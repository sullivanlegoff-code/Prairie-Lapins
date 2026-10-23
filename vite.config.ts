import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';

// The laboratory shares the shell, but must never advertise the game's app identity.
export default defineConfig(({mode}) => ({
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
