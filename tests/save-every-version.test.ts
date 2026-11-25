import {expect, it} from 'vitest';
import {createGame} from '../src/state/initial';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {SAVE_VERSION} from '../src/state/saveVersion';

// 25 November 2026: v31 was published without accepting v30, so every save of the previous version was refused (« la sauvegarde
// ne charge pas »). Every version from 16 to the current one must be read, or converted, never called unknown.
it('never calls a save of an older supported version unknown', () => {
  for (let version = 16; version <= SAVE_VERSION; version++) {
    const raw = JSON.parse(encodeGame(createGame(0))); raw.version = version;
    const decoded = decodeGame(JSON.stringify(raw));
    expect(decoded.ok ? 'ok' : decoded.reason, `version ${version}`).not.toBe('UNSUPPORTED_VERSION');
  }
  expect(decodeGame(JSON.stringify({...JSON.parse(encodeGame(createGame(0))), version: SAVE_VERSION + 1}))).toEqual({ok: false, reason: 'UNSUPPORTED_VERSION'});
});

it('loads a save of the previous version (v30) unchanged, in the current version', () => {
  const s = createGame(0), raw = JSON.parse(encodeGame(s)); raw.version = SAVE_VERSION - 1;
  expect(decodeGame(JSON.stringify(raw))).toEqual({ok: true, state: s});
});
