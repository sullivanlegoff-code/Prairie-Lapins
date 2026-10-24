import {previousStart} from './regression-start';
import {createGame} from '../src/simulation';
import {describe, expect, it} from 'vitest';
import {GameController} from '../src/application/GameController';
import {bindLifecycle, type LifecycleHost} from '../src/application/lifecycle';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries} from '../src/simulation';
import {HOUR, MINUTE} from '../src/config/balance';
import {cumulativeLevelXp} from '../src/simulation/progression';
import type {Command, GameState} from '../src/state/types';

class MemoryStorage implements SaveStorage {
  value: string | null = null; reads = 0; writes = 0; failRead = false; failWrite = false;
  getItem(key: string): string | null { expect(key).toBe(SAVE_KEY); this.reads++; if (this.failRead) throw new Error('read denied'); return this.value; }
  setItem(key: string, value: string): void {
    expect(key).toBe(SAVE_KEY); if (this.failWrite) throw new Error('quota'); this.writes++; this.value = value;
  }
}
function fixture(raw: string | null = null, now = 0) {
  const store = new MemoryStorage(); store.value = raw;
  const clock = {now}; const controller = new GameController(store, () => clock.now, () => 0.9);
  return {store, clock, controller};
}
function state(controller: GameController): GameState { return controller.getSnapshot().state!; }
function stored(store: MemoryStorage): GameState {
  const decoded = decodeGame(store.value!); if (!decoded.ok) throw new Error(decoded.reason); return decoded.state;
}
function pendingGuaranteed(): GameState {
  let s = previousStart(0); s.pattes = 10_000;
  function apply(command: Command) {
    const result = act(s, command, 0, () => 0); if (!result.ok) throw new Error(result.reason); s = result.state;
  }

  apply({type: 'feed', id: 'rabbit-2'}); apply({type: 'feed', id: 'rabbit-3'});
  // Feu x Neige at affection 4 and level 6: Feu Glacé is the one result the ordinary guarantee can reserve.
  s.rabbits[0].species='feu';s.discovered.push('feu');s.rabbits.forEach(r => r.affection = 4);s.progression = {totalXp: cumulativeLevelXp(6), rewardedThroughLevel: 6};
  s.pityFailures = 9; apply({type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
  return s;
}

describe('controller startup and normal saves', () => {
  it('creates and saves a first game at the injected current time', () => {
    const {controller, store} = fixture(null, 1234);
    expect(state(controller)).toEqual(createGame(1234)); expect(stored(store)).toEqual(createGame(1234));
    expect(store.writes).toBe(1); expect(controller.getSnapshot()).toMatchObject({status: 'saved', lastSavedAt: 1234, dirty: false});
  });
  it('restores and advances a game after absence, then saves it', () => {
    const original = createGame(0); const {controller, store} = fixture(encodeGame(original), 2 * HOUR);
    expect(state(controller)).toEqual(advance(original, 2 * HOUR)); expect(stored(store)).toEqual(state(controller));
    expect(store.writes).toBe(1);
  });
  it('saves immediately after an action succeeds', () => {
    const {controller, store, clock} = fixture(); clock.now = HOUR;
    const result = controller.perform({type: 'collectIncome', id: 'building-1'});
    expect(result.ok).toBe(true); expect(state(controller).pattes).toBe(312);
    expect(store.writes).toBe(2); expect(stored(store)).toEqual(state(controller));
  });
  it('keeps separate time advancement after refusing an action without spending', () => {
    const {controller, store, clock} = fixture(); clock.now = HOUR;
    const result = controller.perform({type:'expand',parcelId:'south',expectedCost:500});
    expect(result).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    expect(state(controller).pattes).toBe(300); expect(state(controller).buildings[0].incomeUnits).toBe(12 * HOUR);
    expect(stored(store)).toEqual(state(controller)); expect(store.writes).toBe(2);
  });
  it('does not write again when state has not evolved', () => {
    const {controller, store} = fixture(); controller.refresh(); controller.refresh();
    controller.perform({type:'expand',parcelId:'east',expectedCost:500}); expect(store.writes).toBe(1);
  });
  it('does not double count after repeated resumes or clock reversals', () => {
    const {controller, store, clock} = fixture();
    clock.now = HOUR; controller.refresh(); controller.refresh();
    clock.now = HOUR / 2; controller.refresh(); expect(state(controller).lastSimulatedAt).toBe(HOUR);
    const reloaded = new GameController(store, () => 2 * HOUR);
    reloaded.refresh(); reloaded.refresh();
    expect(state(reloaded).buildings[0].incomeUnits).toBe(24 * HOUR);
    expect(state(reloaded)).toEqual(advance(createGame(0), 2 * HOUR));
  });
  it('does not let consumers mutate the active state through snapshots or results', () => {
    const {controller} = fixture(); const copy = state(controller); copy.pattes = 0;
    const result = controller.perform({type: 'feed', id: 'rabbit-2'});
    if ('state' in result) result.state.grass = 0;
    expect(state(controller).pattes).toBe(300); expect(state(controller).grass).toBe(8);
  });
});

describe('storage failures and recovery', () => {
  it('catches initial read failure without writing or assuming there is no save', () => {
    const store = new MemoryStorage(); store.value = encodeGame(createGame(0)); store.failRead = true;
    const original = store.value; const controller = new GameController(store, () => HOUR);
    expect(controller.getSnapshot()).toMatchObject({state: null, status: 'read-error', lastSavedAt: null});
    controller.refresh(); expect(store.value).toBe(original); expect(store.writes).toBe(0);
    store.failRead = false; expect(controller.retrySave()).toEqual({ok: true});
    expect(state(controller).buildings[0].incomeUnits).toBe(12 * HOUR);
  });
  it('keeps a first game in memory when writing fails and retries successfully', () => {
    const store = new MemoryStorage(); store.failWrite = true;
    const controller = new GameController(store, () => 42);
    expect(state(controller)).toEqual(createGame(42)); expect(store.value).toBeNull();
    expect(controller.getSnapshot()).toMatchObject({status: 'write-error', dirty: true, lastSavedAt: null});
    store.failWrite = false; expect(controller.retrySave()).toEqual({ok: true});
    expect(controller.getSnapshot()).toMatchObject({status: 'saved', dirty: false, lastSavedAt: 42});
  });
  it('rejects an XP meal on save failure while preserving time and the last successful date', () => {
    const {controller, store, clock} = fixture(); const previous = store.value;
    clock.now = 1000; store.failWrite = true;
    expect(controller.perform({type: 'feed', id: 'rabbit-2'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
    expect(state(controller).grass).toBe(10); expect(state(controller).progression.totalXp).toBe(0); expect(store.value).toBe(previous);
    expect(controller.getSnapshot()).toMatchObject({status: 'write-error', lastSavedAt: 0, dirty: true});
    store.failWrite = false; controller.retrySave(); expect(stored(store)).toEqual(state(controller));
  });
  it('retains memory and exports even when reading storage later fails', () => {
    const {controller, store, clock} = fixture(); store.failRead = true; clock.now = HOUR;
    controller.refresh(); expect(controller.getSnapshot().status).toBe('read-error');
    const exported = controller.exportGame(); expect(exported.ok).toBe(true);
    if (exported.ok) expect(decodeGame(exported.json)).toEqual({ok: true, state: state(controller)});
  });
  it.each(['{', '{"version":99}', '{"version":16}'])('protects an existing invalid save: %s', raw => {
    const {controller, store, clock} = fixture(raw); clock.now = HOUR;
    controller.refresh(); controller.retrySave();
    expect(store.value).toBe(raw); expect(store.writes).toBe(0);
    expect(controller.getSnapshot()).toMatchObject({state: null, status: 'invalid-save', hasUnreadableBackup: true});
    expect(controller.unreadableBackup()).toBe(raw);
    expect(controller.restart(false)).toEqual({ok: false, reason: 'NOT_CONFIRMED'}); expect(store.value).toBe(raw);
  });
  it('restarts only after confirmation and successful storage, preserving invalid contents on failure', () => {
    const {controller, store} = fixture('{'); store.failWrite = true;
    expect(controller.restart(true)).toEqual({ok: false, reason: 'WRITE_FAILED'});
    expect(controller.getSnapshot().state).toBeNull(); expect(store.value).toBe('{');
    store.failWrite = false; expect(controller.restart(true)).toEqual({ok: true});
    expect(stored(store)).toEqual(createGame(0));
  });
  it('exports an up-to-date version 2 game despite a write failure', () => {
    const {controller, store, clock} = fixture(); const previous = store.value;
    store.failWrite = true; clock.now = HOUR;
    const exported = controller.exportGame(); expect(exported.ok).toBe(true);
    if (exported.ok) {
      expect(exported.filename).toBe('prairie-lapins-1970-01-01T01-00-00Z.json');
      expect(decodeGame(exported.json)).toEqual({ok: true, state: advance(createGame(0), HOUR)});
    }
    expect(store.value).toBe(previous); expect(controller.getSnapshot().status).toBe('write-error');
  });
});

describe('transactional imports', () => {
  it('validates and previews without changing anything, then saves before swapping state', () => {
    const {controller, store, clock} = fixture(); const original = controller.getSnapshot(), raw = store.value;
    const imported = createGame(0); imported.pattes = 987;
    const prepared = controller.prepareImport(encodeGame(imported)); expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.summary).toEqual({pattes: 987, grass: 10, hearts: 12, rabbits: 1, discovered: ['paille']});
    expect(controller.getSnapshot()).toEqual(original); expect(store.value).toBe(raw);
    clock.now = HOUR;
    const normalWrite = store.setItem.bind(store);
    store.setItem = (key, json) => { expect(state(controller).pattes).toBe(300); normalWrite(key, json); };
    expect(controller.confirmImport(prepared.token, true)).toEqual({ok: true});
    expect(state(controller)).toEqual(advance(imported, HOUR)); expect(stored(store)).toEqual(state(controller));
    expect(controller.getSnapshot()).toMatchObject({status: 'saved', lastSavedAt: HOUR});
  });
  it('cancels without changing state or previous storage', () => {
    const {controller, store} = fixture(); const previous = controller.getSnapshot(), raw = store.value;
    const prepared = controller.prepareImport(encodeGame(createGame(1))); if (!prepared.ok) throw new Error(prepared.reason);
    expect(controller.confirmImport(prepared.token, false)).toEqual({ok: false, reason: 'NOT_CONFIRMED'});
    expect(controller.getSnapshot()).toEqual(previous); expect(store.value).toBe(raw);
    expect(controller.confirmImport(prepared.token, true)).toEqual({ok: false, reason: 'STALE_IMPORT'});
  });
  it.each([
    ['{', 'INVALID_JSON'], ['{"version":17}', 'UNSUPPORTED_VERSION'], ['{"version":16}', 'INVALID_STATE'], ['{"version":1}', 'INCOMPATIBLE_CATALOG'], ['{"version":15}', 'INCOMPATIBLE_CATALOG'],
    [' '.repeat(1_000_001), 'FILE_TOO_LARGE'],
  ])('rejects a bad import with %s', (json, reason) => {
    const {controller, store} = fixture(); const previous = controller.getSnapshot(), raw = store.value;
    expect(controller.prepareImport(json)).toEqual({ok: false, reason});
    expect(controller.getSnapshot()).toEqual(previous); expect(store.value).toBe(raw);
  });
  it('rejects an oversized file before decoding its otherwise valid content', () => {
    const {controller} = fixture(); expect(controller.prepareImport(encodeGame(createGame(0)), 1_000_001))
      .toEqual({ok: false, reason: 'FILE_TOO_LARGE'});
  });
  it('does not replace memory or storage if import writing fails, and can retry', () => {
    const {controller, store, clock} = fixture(); const previous = controller.getSnapshot(), raw = store.value;
    const imported = createGame(0); imported.pattes = 999;
    const prepared = controller.prepareImport(encodeGame(imported)); if (!prepared.ok) throw new Error(prepared.reason);
    clock.now = HOUR; store.failWrite = true;
    expect(controller.confirmImport(prepared.token, true)).toEqual({ok: false, reason: 'WRITE_FAILED'});
    expect(controller.getSnapshot()).toEqual(previous); expect(store.value).toBe(raw);
    store.failWrite = false; expect(controller.confirmImport(prepared.token, true)).toEqual({ok: true});
    expect(state(controller)).toEqual(advance(imported, HOUR));
  });
  it('preserves the active game when import storage reading fails', () => {
    const {controller, store} = fixture(); const before = controller.getSnapshot();
    const prepared = controller.prepareImport(encodeGame(createGame(0))); if (!prepared.ok) throw new Error(prepared.reason);
    store.failRead = true; expect(controller.confirmImport(prepared.token, true)).toEqual({ok: false, reason: 'READ_FAILED'});
    expect(controller.getSnapshot()).toEqual(before);
  });
  it('recovers an invalid save through an explicitly confirmed valid import', () => {
    const {controller, store} = fixture('{"version":99}');
    const prepared = controller.prepareImport(encodeGame(createGame(0))); if (!prepared.ok) throw new Error(prepared.reason);
    expect(store.writes).toBe(0); expect(controller.confirmImport(prepared.token, true)).toEqual({ok: true});
    expect(stored(store)).toEqual(createGame(0));
  });
  it('invalidates older import callbacks after a newer selection or success', () => {
    const {controller} = fixture(); const a = controller.prepareImport(encodeGame(createGame(1)));
    const b = controller.prepareImport(encodeGame(createGame(2))); if (!a.ok || !b.ok) throw new Error('prepare');
    expect(controller.confirmImport(a.token, true)).toEqual({ok: false, reason: 'STALE_IMPORT'});
    expect(controller.confirmImport(b.token, true)).toEqual({ok: true});
    expect(controller.confirmImport(b.token, true)).toEqual({ok: false, reason: 'STALE_IMPORT'});
  });
  it('preserves guaranteed results and discovery reservations through export, import and restore', () => {
    const original = pendingGuaranteed(); const {controller, clock, store} = fixture(encodeGame(original));
    const exported = controller.exportGame(); if (!exported.ok) throw new Error(exported.reason);
    const prepared = controller.prepareImport(exported.json); if (!prepared.ok) throw new Error(prepared.reason);
    expect(controller.confirmImport(prepared.token, true)).toEqual({ok: true});
    clock.now = 35 * MINUTE; controller.refresh();
    const restored = new GameController(store, () => clock.now);
    expect(state(restored)).toEqual(advance(original, clock.now));
    expect(pendingDiscoveries(state(restored))).toEqual(['feu-glace']);
    expect(state(restored).discovered).not.toContain('feu-glace'); expect(state(restored).pityFailures).toBe(0);
    expect(state(restored).buildings.find(b => b.kind === 'nest')!.breeding!.birth)
      .toMatchObject({species: 'feu-glace', guaranteed: true, reservedDiscovery: true});
  });
  it('prevents an older controller from overwriting a newly imported game', () => {
    const {controller, store, clock} = fixture(); const second = new GameController(store, () => clock.now);
    const imported = createGame(0); imported.pattes = 777;
    const prepared = second.prepareImport(encodeGame(imported)); if (!prepared.ok) throw new Error(prepared.reason);
    expect(second.confirmImport(prepared.token, true)).toEqual({ok: true}); const saved = store.value;
    clock.now = HOUR; controller.refresh(); expect(controller.getSnapshot().status).toBe('conflict'); expect(store.value).toBe(saved);
    expect(controller.retrySave()).toEqual({ok: false, reason: 'STORAGE_CHANGED'}); expect(store.value).toBe(saved);
  });
  it('keeps future callbacks on the current controller pointing to the imported state', () => {
    const {controller, store, clock} = fixture(); const callback = () => controller.refresh();
    const imported = createGame(0); imported.pattes = 555;
    const prepared = controller.prepareImport(encodeGame(imported)); if (!prepared.ok) throw new Error(prepared.reason);
    controller.confirmImport(prepared.token, true); clock.now = HOUR; callback();
    expect(state(controller).pattes).toBe(555); expect(stored(store).pattes).toBe(555);
  });
  it('makes disposed controllers inert', () => {
    const {controller, store} = fixture(); const raw = store.value; controller.dispose();
    controller.refresh(); expect(controller.retrySave()).toEqual({ok: false, reason: 'DISPOSED'});
    expect(controller.perform({type: 'feed', id: 'rabbit-2'})).toEqual({ok: false, reason: 'DISPOSED'}); expect(store.value).toBe(raw);
  });
});

describe('lifecycle subscriptions', () => {
  it('starts once, resumes and stops without leaving duplicate timers or stale callbacks', () => {
    const events = new Map<string, () => void>(); const timers = new Set<() => void>();
    let visible = true, refreshes = 0;
    const host: LifecycleHost = {
      isVisible: () => visible,
      on(event, listener) { expect(events.has(event)).toBe(false); events.set(event, listener); return () => { events.delete(event); }; },
      every(milliseconds, listener) { expect(milliseconds).toBe(5000); timers.add(listener); return () => { timers.delete(listener); }; },
    };
    const lifecycle = bindLifecycle({refresh: () => { refreshes++; }}, host);
    lifecycle.start(); lifecycle.start(); expect(events.size).toBe(3); expect(timers.size).toBe(1);
    const timer = [...timers][0]; timer(); expect(refreshes).toBe(1);
    visible = false; timer(); expect(refreshes).toBe(1);
    events.get('visibilitychange')!(); expect(refreshes).toBe(2);
    visible = true; events.get('pageshow')!(); expect(refreshes).toBe(3);
    lifecycle.stop(); lifecycle.stop(); timer(); expect(refreshes).toBe(3); expect(events.size).toBe(0); expect(timers.size).toBe(0);
    lifecycle.start(); expect(timers.size).toBe(1); lifecycle.stop();
  });
});
