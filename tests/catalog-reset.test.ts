import {describe, expect, it} from 'vitest';
import {GameController} from '../src/application/GameController';
import {SAVE_VERSION, decodeGame, encodeGame, readPresentationId} from '../src/persistence/json';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {createGame} from '../src/simulation';
import {HOUR} from '../src/config/balance';

/** A save written before the catalogue boundary: the same document, stamped with an older version. */
const oldSave = (version = 15, mutate: (raw: Record<string, unknown>) => void = () => {}) => {
  const raw = JSON.parse(encodeGame(createGame(0))) as Record<string, unknown>; raw.version = version; mutate(raw); return JSON.stringify(raw);
};
/** A browser storage shared by the normal game and the laboratory (which prefixes every key), plus unrelated keys that must survive. */
function browser(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial)), flags = {fail: ''}, writes: string[] = [];
  const area = (prefix: string, scope: 'normal' | 'laboratory'): SaveStorage => ({scope, getItem: key => data.get(prefix + key) ?? null,
    setItem: (key, value) => { if (flags.fail === prefix + key) throw new Error('quota'); data.set(prefix + key, value); writes.push(prefix + key); }});
  return {data, flags, writes, normal: area('', 'normal'), laboratory: area('laboratory:', 'laboratory')};
}
const state = (c: GameController) => c.getSnapshot().state!;

describe('the save boundary of the new catalogue', () => {
  it('writes version 17 and reads it back without any reset', () => {
    expect(SAVE_VERSION).toBe(21);
    const b = browser(), first = new GameController(b.normal, () => 0);
    expect(first.getSnapshot()).toMatchObject({status: 'saved', issue: null, catalogReset: false}); expect(JSON.parse(b.data.get(SAVE_KEY)!).version).toBe(21);
    first.dispose();
    const again = new GameController(b.normal, () => HOUR); expect(again.getSnapshot()).toMatchObject({status: 'saved', catalogReset: false}); again.dispose();
  });

  it.each([1, 2, 8, 12, 14, 15])('starts a new valid game on a normal save of version %i, saves it and says why', version => {
    const b = browser({[SAVE_KEY]: oldSave(version)}), c = new GameController(b.normal, () => 1234);
    expect(c.getSnapshot()).toMatchObject({status: 'saved', issue: null, catalogReset: true, dirty: false, lastSavedAt: 1234, hasUnreadableBackup: false});
    expect(state(c)).toEqual(createGame(1234));
    const saved = decodeGame(b.data.get(SAVE_KEY)!); expect(saved).toEqual({ok: true, state: createGame(1234)});
    c.dispose();
  });

  it('does not reset again on the next load, nor after play', () => {
    const b = browser({[SAVE_KEY]: oldSave()}), c = new GameController(b.normal, () => 0);
    expect(c.getSnapshot().catalogReset).toBe(true); expect(c.perform({type: 'renameRabbit', id: 'rabbit-2',name:'Miel'}).ok).toBe(true); const played = state(c); c.dispose();
    const again = new GameController(b.normal, () => 0);
    expect(again.getSnapshot()).toMatchObject({status: 'saved', catalogReset: false}); expect(state(again)).toEqual(played);
    expect(b.writes.length).toBeGreaterThanOrEqual(2); again.dispose();
  });

  it('never restores an older copy: migration backups are neither read nor changed, and nothing else in storage is touched', () => {
    const backups = {'prairie-lapins.backup.before-v15': oldSave(14), 'prairie-lapins.backup.before-v11': oldSave(10), 'prairie-lapins.migration-latest': 'prairie-lapins.backup.before-v15'};
    const unrelated = {'prairie-lapins.ui.v1': '{"tutorial":false}', 'something-else': 'kept'};
    const b = browser({[SAVE_KEY]: oldSave(), ...backups, ...unrelated}), c = new GameController(b.normal, () => 0);
    expect(c.getSnapshot().catalogReset).toBe(true); expect(state(c)).toEqual(createGame(0));
    for (const [key, value] of Object.entries({...backups, ...unrelated})) expect(b.data.get(key), key).toBe(value);
    expect(b.writes).toEqual([SAVE_KEY]); c.dispose();
  });

  it('resets the normal game and the laboratory game independently, each only in its own save', () => {
    const normalOld = oldSave(15), labOld = oldSave(15, raw => { raw.pattes = 999; });
    const b = browser({[SAVE_KEY]: normalOld, ['laboratory:' + SAVE_KEY]: labOld});
    const lab = new GameController(b.laboratory, () => 5);
    expect(lab.getSnapshot()).toMatchObject({status: 'saved', catalogReset: true}); expect(state(lab)).toEqual(createGame(5));
    expect(b.data.get(SAVE_KEY)).toBe(normalOld); // the normal game is untouched until it is itself opened
    const normal = new GameController(b.normal, () => 7);
    expect(normal.getSnapshot()).toMatchObject({status: 'saved', catalogReset: true}); expect(state(normal)).toEqual(createGame(7));
    expect(decodeGame(b.data.get('laboratory:' + SAVE_KEY)!)).toEqual({ok: true, state: createGame(5)});
    lab.dispose(); normal.dispose();
  });

  it('keeps the old save and the failure handling when the new game cannot be written, then writes once storage works', () => {
    const raw = oldSave(), b = browser({[SAVE_KEY]: raw}); b.flags.fail = SAVE_KEY;
    const c = new GameController(b.normal, () => 0);
    expect(c.getSnapshot()).toMatchObject({status: 'write-error', issue: 'WRITE_FAILED', catalogReset: true, dirty: true});
    expect(state(c)).toEqual(createGame(0)); expect(b.data.get(SAVE_KEY)).toBe(raw);
    expect(c.exportGame().ok).toBe(true);
    b.flags.fail = ''; expect(c.retrySave()).toEqual({ok: true});
    expect(c.getSnapshot().status).toBe('saved'); expect(decodeGame(b.data.get(SAVE_KEY)!)).toEqual({ok: true, state: createGame(0)}); c.dispose();
  });

  it('refuses an incompatible import with its own reason and changes neither the game nor the storage', () => {
    const b = browser(), c = new GameController(b.normal, () => 0); c.perform({type: 'feed', id: 'rabbit-2'});
    const before = c.getSnapshot(), stored = b.data.get(SAVE_KEY), writes = b.writes.length;
    for (const version of [1, 11, 15]) {
      expect(c.prepareImport(oldSave(version))).toEqual({ok: false, reason: 'INCOMPATIBLE_CATALOG'});
      expect(c.confirmImport(1, true)).toEqual({ok: false, reason: 'STALE_IMPORT'});
    }
    expect(c.getSnapshot()).toEqual(before); expect(b.data.get(SAVE_KEY)).toBe(stored); expect(b.writes).toHaveLength(writes); c.dispose();
  });

  it('refuses a newer or unknown version as unsupported, and a current-version file naming a removed species as invalid', () => {
    const b = browser(), c = new GameController(b.normal, () => 0), before = c.getSnapshot();
    expect(c.prepareImport(oldSave(22))).toEqual({ok:false,reason:'UNSUPPORTED_VERSION'});
    expect(c.prepareImport(oldSave(0))).toEqual({ok: false, reason: 'UNSUPPORTED_VERSION'});
    expect(c.prepareImport(oldSave(16, raw => { (raw.rabbits as {species: string}[])[0].species = 'terre'; }))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(c.prepareImport(oldSave(16, raw => { raw.recipeBook = ['brumelin']; }))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(c.prepareImport(oldSave(16, raw => { raw.discovered = ['paille', 'mottelin']; }))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(c.getSnapshot()).toEqual(before); c.dispose();
  });

  it('protects a current-version save that is invalid for another reason, instead of resetting it', () => {
    const raw = oldSave(16, r => { (r.rabbits as {species: string}[])[0].species = 'terre'; }), b = browser({[SAVE_KEY]: raw});
    const c = new GameController(b.normal, () => 0);
    expect(c.getSnapshot()).toMatchObject({state: null, status: 'invalid-save', issue: 'INVALID_STATE', catalogReset: false, hasUnreadableBackup: true});
    expect(b.data.get(SAVE_KEY)).toBe(raw); expect(b.writes).toEqual([]); c.dispose();
  });

  it('still imports a current-version file after a reset, and exports a version 17 file', () => {
    const b = browser({[SAVE_KEY]: oldSave()}), c = new GameController(b.normal, () => 0);
    const source = createGame(0); source.pattes = 4321;
    const prepared = c.prepareImport(encodeGame(source)); if (!prepared.ok) throw Error(prepared.reason);
    expect(c.confirmImport(prepared.token, true)).toEqual({ok: true}); expect(state(c).pattes).toBe(4321);
    const exported = c.exportGame(); if (!exported.ok) throw Error(exported.reason);
    expect(JSON.parse(exported.json).version).toBe(21); expect(readPresentationId(exported.json)).toBeDefined(); c.dispose();
  });
});
