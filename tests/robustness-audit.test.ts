import {afterEach, expect, it, vi} from 'vitest';
import * as simulation from '../src/simulation';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {MAX_JSON_LENGTH} from '../src/persistence/json';
import {DAILY_MISSIONS} from '../src/config/missions';
import {HOUR} from '../src/config/balance';

afterEach(() => vi.restoreAllMocks());
function memory(raw: string | null = null) {
  const storage = {raw, getItem: () => storage.raw, setItem: (_key: string, value: string) => { storage.raw = value; }};
  return storage;
}
function claimedDaily(now: number) {
  const state = createGame(now);
  state.missions.daily.progress['collect-pattes'] = DAILY_MISSIONS['collect-pattes'].target;
  const result = act(state, {type: 'claimDailyMission', id: 'collect-pattes', cycleStart: now}, now);
  if (!result.ok) throw Error(result.reason);
  return result.state;
}
it('keeps a claimed daily encodable and reloadable after a one-day clock reversal and action', () => {
  const now = 48 * HOUR, initial = claimedDaily(now), clock = {now};
  const storage = memory(encodeGame(initial)), controller = new GameController(storage, () => clock.now);
  clock.now -= 24 * HOUR;
  const rebased = advance(initial, clock.now);
  expect(rebased.missions.daily.nextAt).toBe(initial.missions.daily.nextAt! - 24 * HOUR);
  expect(decodeGame(encodeGame(rebased))).toEqual({ok: true, state: rebased});
  expect(controller.perform({type: 'renameRabbit', id: initial.rabbits[0].id, name: 'Nuage'}).ok).toBe(true);
  const saved = controller.getSnapshot().state;
  expect(decodeGame(storage.raw!)).toEqual({ok: true, state: saved});
  const reload = new GameController(storage, () => clock.now);
  expect(reload.getSnapshot()).toMatchObject({status: 'saved', state: saved});
  controller.dispose(); reload.dispose();
});
it('cleans released rabbits while preserving the remaining cuisine cycle', () => {
  const state = createGame(0), first = state.rabbits[0];
  const second = {...first, id: `rabbit-${state.nextId++}`}; state.rabbits.push(second);
  state.cuisine.affectionCycles = {[first.id]: 0, [second.id]: 0};
  const result = act(state, {type: 'release', id: second.id}, 0);
  expect(result.ok).toBe(true);
  expect(result.state.cuisine.affectionCycles).toEqual({[first.id]: 0});
  expect(state.cuisine.affectionCycles[second.id]).toBe(0);
});
it('accepts compact and indented JSON and prunes a large historical import before rewriting it', () => {
  const state = createGame(0), raw = JSON.parse(encodeGame(state));
  raw.cuisine.affectionCycles[state.rabbits[0].id] = 0;
  for (let id = 100; id < 45000; id++) raw.cuisine.affectionCycles[`rabbit-${id}`] = 0;
  const compact = JSON.stringify(raw);
  expect(compact.length).toBeLessThanOrEqual(MAX_JSON_LENGTH);
  expect(JSON.stringify(raw, null, 2).length).toBeGreaterThan(MAX_JSON_LENGTH);
  expect(decodeGame(JSON.stringify(state, null, 2))).toEqual(decodeGame(encodeGame(state)));
  const decoded = decodeGame(compact); if (!decoded.ok) throw Error(decoded.reason);
  expect(decoded.state.cuisine.affectionCycles).toEqual({[state.rabbits[0].id]: 0});
  const storage = memory(), controller = new GameController(storage, () => 0);
  const prepared = controller.prepareImport(compact); if (!prepared.ok) throw Error(prepared.reason);
  expect(controller.confirmImport(prepared.token, true)).toEqual({ok: true});
  expect(storage.raw!.length).toBeLessThanOrEqual(MAX_JSON_LENGTH);
  expect(decodeGame(storage.raw!)).toEqual({ok: true, state: controller.getSnapshot().state});
  const reload = new GameController(storage, () => 0);
  expect(reload.getSnapshot().status).toBe('saved');
  controller.dispose(); reload.dispose();
});
it('refuses oversized encoded writes, confirmed imports and exports, keeping the old save intact', () => {
  const storage = memory(), controller = new GameController(storage, () => 0);
  const prepared = controller.prepareImport(encodeGame(createGame(0))); if (!prepared.ok) throw Error(prepared.reason);
  const before = storage.raw, state = controller.getSnapshot().state;
  vi.spyOn(simulation, 'encodeGame').mockReturnValue(' '.repeat(MAX_JSON_LENGTH + 1));
  expect(controller.retrySave()).toEqual({ok: false, reason: 'FILE_TOO_LARGE'});
  expect(controller.getSnapshot().issue).toBe('FILE_TOO_LARGE');
  expect(controller.confirmImport(prepared.token, true)).toEqual({ok: false, reason: 'FILE_TOO_LARGE'});
  expect(controller.exportGame()).toEqual({ok: false, reason: 'FILE_TOO_LARGE'});
  expect(storage.raw).toBe(before); expect(controller.getSnapshot().state).toEqual(state);
  controller.dispose();
});
