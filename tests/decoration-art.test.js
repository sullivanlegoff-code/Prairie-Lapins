import {expect, it} from 'vitest';
import {execFileSync} from 'node:child_process';
it('verifies every approved decoration source and derivative SHA-1', () => {
 expect(() => execFileSync(process.execPath, ['scripts/derive-decoration-art.mjs', '--check'], {encoding:'utf8'})).not.toThrow();
}, 30000);
