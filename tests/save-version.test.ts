import {expect, it} from 'vitest';
import {SAVE_VERSION as written} from '../src/persistence/json';
import {SAVE_VERSION} from '../src/state/saveVersion';
import {createGame} from '../src/state/initial';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';

it('one save version for the new game, the save file and the coordinator’s notes (plan 4.5)', () => {
  expect(written).toBe(SAVE_VERSION); expect(createGame(0).version).toBe(SAVE_VERSION);
  expect(readFileSync('AGENTS.md', 'utf8')).toContain(`Format de sauvegarde actuel : **v${SAVE_VERSION}**`);
});
