import {expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';

it('the quick test run leaves out only heavy files that exist (plan 6.1): a renamed one would run again, never vanish', () => {
  const quick: string = JSON.parse(readFileSync('package.json', 'utf8')).scripts['test:quick'];
  const left = [...quick.matchAll(/--exclude (\S+)/g)].map(m => m[1]);
  expect(left.length).toBeGreaterThan(0);
  for (const file of left) expect([file, existsSync(file)]).toEqual([file, true]);
});
