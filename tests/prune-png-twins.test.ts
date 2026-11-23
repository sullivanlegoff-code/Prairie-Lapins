import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync} from 'node:fs';
// @ts-expect-error -- idem.
import {execFileSync} from 'node:child_process';
// @ts-expect-error -- idem.
import {join, dirname} from 'node:path';
// @ts-expect-error -- idem.
import {tmpdir} from 'node:os';

describe('the published site without the twinned PNGs (plan 5.6)', () => {
  it('removes a PNG the game never asks for, and keeps the icons, the pictures named in styles, and those without a twin', () => {
    const root: string = mkdtempSync(join(tmpdir(), 'prune-'));
    const put = (path: string, text = 'x') => { mkdirSync(dirname(join(root, path)), {recursive: true}); writeFileSync(join(root, path), text); };
    try {
      put('index.html', '<link rel="apple-touch-icon" href="assets/app/apple-touch-icon.png">');
      put('assets/style.css', '.friend { background: url(../assets/benny-envol/ami-dragon.png) }');
      // The scripts name every picture (the twin list is bundled in them): that never keeps a PNG.
      put('assets/index.js', '"assets/agency/coco.png","assets/benny-envol/ami-volant.png"');
      for (const name of ['assets/agency/coco', 'assets/benny-envol/ami-dragon', 'assets/app/apple-touch-icon']) { put(name + '.png'); put(name + '.webp'); }
      put('assets/benny-envol/ami-volant.png');
      execFileSync('node', ['scripts/prune-png-twins.mjs', root]);
      expect(existsSync(join(root, 'assets/agency/coco.png'))).toBe(false);
      expect(existsSync(join(root, 'assets/agency/coco.webp'))).toBe(true);
      expect(existsSync(join(root, 'assets/benny-envol/ami-dragon.png'))).toBe(true);
      expect(existsSync(join(root, 'assets/app/apple-touch-icon.png'))).toBe(true);
      expect(existsSync(join(root, 'assets/benny-envol/ami-volant.png'))).toBe(true);
    } finally { rmSync(root, {recursive: true, force: true}); }
  });
});
