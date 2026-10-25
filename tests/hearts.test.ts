import {cumulativeLevelXp,requiredExtensionLevel} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as createGame} from './regression-start';
import {describe, expect, it, vi} from 'vitest';
import {HOUR, MINUTE} from '../src/config/balance';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries} from '../src/simulation';
import {quoteComplement} from '../src/simulation/actions';
import {accelerationCost, complementCost, quoteAcceleration} from '../src/simulation/hearts';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {Command, GameState, PattesCommand, TimedStage} from '../src/state/types';
import {stateBaby, welcomeOf} from './nursery-baby';

const DAY = 24 * HOUR;
function run(s: GameState, command: Command, now = s.lastSimulatedAt): GameState {
  const result = act(s, command, now, () => .5);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}
function prepared(): GameState {
  let s = createGame(0); s.pattes = 5000;
  s = run(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 20});
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 26, y: 20});
  s = run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 18, y: 24});
  s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: 'rabbit-3'});
  // Feu x Neige at affection 4 and level 6: the Feu Glacé recipe is admissible, so the ordinary guarantee has a result to reserve.
  s.rabbits[0].species='feu';s.discovered.push('feu');s.rabbits.forEach(r=>r.affection=4);s.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6};
  return s;
}
const breed = {type: 'breed', parents: ['rabbit-2', 'rabbit-3']} as const as Extract<Command,{type:'breed'}>;
function speed(s: GameState, id: string, stage: TimedStage, now = s.lastSimulatedAt): Extract<Command, {type: 'accelerate'}> {
  const birthId = stage === 'growth' ? stateBaby(s)?.birth.id : undefined;
  const q = quoteAcceleration(s, id, stage, now, birthId); if (!q.ok) throw new Error(q.reason);
  return {type: 'accelerate', id, stage, jobKey: q.jobKey, maxHearts: q.hearts, ...(birthId ? {birthId} : {})};
}
function pay(s: GameState, action: PattesCommand): Extract<Command, {type: 'payWithHearts'}> {
  const q = quoteComplement(s, action, s.lastSimulatedAt); if (!q.ok) throw new Error(q.reason);
  return {type: 'payWithHearts', action, maxHearts: q.hearts, maxPattes: q.pattes};
}
function store(raw?: string) {
  const data = new Map<string, string>(raw === undefined ? [] : [[SAVE_KEY, raw]]);
  const flags = {fail: ''};
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => {
    if (key === flags.fail) throw new Error('write denied'); data.set(key, value);
  }};
  return {data, flags, storage};
}
const current = (c: GameController) => c.getSnapshot().state!;

describe('hearts initialization, migration and gifts', () => {
  it('creates 12 hearts and a first gift exactly 24 hours after creation', () => {
    expect(createGame(123)).toMatchObject({version: 16, hearts: 12, nextHeartGiftAt: 123 + DAY});
  });
  it('refuses a gift before 24 hours, allows the boundary once and schedules from the claim', () => {
    const initial = createGame(0);
    expect(act(initial, {type: 'claimHearts'}, DAY - 1)).toMatchObject({ok: false, state: initial, reason: 'NOT_READY'});
    const s = run(initial, {type: 'claimHearts'}, DAY);
    expect(s).toMatchObject({hearts: 14, nextHeartGiftAt: 2 * DAY});
    expect(act(s, {type: 'claimHearts'}, DAY)).toMatchObject({ok: false, state: s});
    expect(act(s, {type: 'claimHearts'}, 0)).toMatchObject({ok: false, state: s});
    expect(run(s, {type: 'claimHearts'}, 2 * DAY).hearts).toBe(16);
  });
  it('never accumulates missed gifts across multiple days', () => {
    const s = run(createGame(0), {type: 'claimHearts'}, 9 * DAY + HOUR);
    expect(s).toMatchObject({hearts: 14, nextHeartGiftAt: 10 * DAY + HOUR});
    expect(act(s, {type: 'claimHearts'}, 10 * DAY)).toMatchObject({ok: false});
  });
  it('preserves claimed gifts across reload and refuses another claim after clock reversal', () => {
    const memory = store(); let now = 0; const c = new GameController(memory.storage, () => now);
    now = DAY; c.perform({type: 'claimHearts'}); now = HOUR;
    const reloaded = new GameController(memory.storage, () => now);
    expect(reloaded.perform({type: 'claimHearts'})).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(current(reloaded)).toMatchObject({hearts: 14, nextHeartGiftAt: HOUR + DAY, lastSimulatedAt: HOUR});
  });
});

describe('acceleration transactions', () => {
  it.each([[0, 0], [1, 1], [5 * MINUTE, 1], [5 * MINUTE + 1, 2], [6 * MINUTE, 2], [20 * MINUTE, 4]])('rounds %i milliseconds to %i hearts', (remaining, expected) => {
    expect(accelerationCost(remaining)).toBe(expected);
  });
  it('finishes only the selected farm at now, without extra income or changing another timer', () => {
    let s = run(prepared(), {type: 'startOrder', id: 'building-4', recipe: 'large'});
    s = run(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 24});
    s = run(s, {type: 'startOrder', id: 'building-7', recipe: 'medium'});
    const baseline = advance(s, MINUTE), command = speed(s, 'building-4', 'order', MINUTE);
    const result = run(s, command, MINUTE);
    expect(result.lastSimulatedAt).toBe(MINUTE); expect(result.grass).toBe(s.grass);
    expect(result.buildings[0].incomeUnits).toBe(baseline.buildings[0].incomeUnits);
    expect(result.buildings.find(b => b.id === 'building-7')).toEqual(baseline.buildings.find(b => b.id === 'building-7'));
    expect(result.buildings[1].order?.endsAt).toBe(MINUTE); expect(result.hearts).toBe(s.hearts - command.maxHearts);
    expect(run(result, {type: 'collectOrder', id: 'building-4'}).grass).toBe(s.grass + 100);
    expect(decodeGame(encodeGame(result))).toEqual({ok: true, state: result});
  });
  it('uses the lower price at confirmation, without resetting the clock or next gift', () => {
    const s = run(prepared(), {type: 'startOrder', id: 'building-4', recipe: 'medium'});
    const command = speed(s, 'building-4', 'order'); expect(command.maxHearts).toBe(3);
    const memory = store(encodeGame(s)); const c = new GameController(memory.storage, () => 11 * MINUTE);
    expect(c.perform(command)).toMatchObject({ok: true, value: 1});
    expect(current(c)).toMatchObject({hearts: 11, nextHeartGiftAt: DAY, lastSimulatedAt: 11 * MINUTE});
  });
  it('spends nothing if the stage has already ended or the button is pressed twice', () => {
    const s = run(prepared(), {type: 'startOrder', id: 'building-4', recipe: 'small'});
    const command = speed(s, 'building-4', 'order');
    expect(act(s, command, 5 * MINUTE)).toMatchObject({ok: false, reason: 'ACTION_FINISHED', state: s});
    const paid = run(s, command); expect(act(paid, command)).toMatchObject({ok: false, state: paid});
  });
  it('refuses insufficient hearts, unconfirmed higher prices and changed targets without mutation', () => {
    const s = run(prepared(), {type: 'startOrder', id: 'building-4', recipe: 'medium'});
    const command = speed(s, 'building-4', 'order');
    expect(act(s, {...command, maxHearts: 2}, 0)).toMatchObject({ok: false, reason: 'PRICE_CHANGED', state: s});
    expect(act(s, {...command, jobKey: 'old'}, 0)).toMatchObject({ok: false, reason: 'STALE_ACTION', state: s});
    s.hearts = 0; expect(act(s, command, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_HEARTS', state: s});
  });
  it('keeps the reserved birth and starts full growth now without any random redraw', () => {
    let s = prepared(); s.pityFailures = 9; s = run(s, breed);
    const birth = s.buildings.find(b => b.breeding)!.breeding!.birth, rng = vi.fn(() => 0);
    const result = act(s, speed(s, 'building-5', 'breeding'), MINUTE, rng);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(rng).not.toHaveBeenCalled();
    expect(stateBaby(result.state)).toBeNull();
    const baby = stateBaby(sendToNursery(result.state))!;
    expect(baby).toEqual({slot: 0, birth, startedAt: MINUTE, readyAt: 31 * MINUTE});
    expect(result.state.discovered).not.toContain(birth.species); expect(pendingDiscoveries(result.state)).toEqual(['feu-glace']);
    expect(result.state.pityFailures).toBe(0);
    expect(decodeGame(encodeGame(result.state))).toEqual({ok: true, state: result.state});
  });
  it('allows a running reproduction to finish into an occupied nursery wait, then transfers normally', () => {
    let s = sendToNursery(advance(run(prepared(), breed),20 * MINUTE));
    const firstBaby = stateBaby(s);
    s = run(s, breed); const birth = s.buildings.find(b => b.breeding)!.breeding!.birth;
    s = run(s, speed(s, 'building-5', 'breeding'));
    expect(stateBaby(s)).toEqual(firstBaby);
    expect(s.buildings.find(b => b.breeding)!.breeding).toMatchObject({endsAt: 20 * MINUTE, birth});
    expect(quoteAcceleration(s, 'building-5', 'breeding', s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'ACTION_FINISHED'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    s = run(s, welcomeOf(s, 'building-1'), 35 * MINUTE);
    expect(stateBaby(s)).toBeNull();s=sendToNursery(s);
    expect(stateBaby(s)).toEqual({slot: 0, birth, startedAt: 35 * MINUTE, readyAt: 40 * MINUTE});
  });
  it('makes growth ready without welcoming, and refuses accelerating a capacity blockage', () => {
    let s = sendToNursery(advance(run(prepared(), breed),20 * MINUTE));
    const command = speed(s, 'building-6', 'growth'), paid = run(s, command);
    expect(paid.rabbits).toHaveLength(2); expect(paid.discovered).toEqual(s.discovered);
    expect(stateBaby(paid)!.readyAt).toBe(s.lastSimulatedAt);
    expect(decodeGame(encodeGame(paid))).toEqual({ok: true, state: paid});
    s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: 'building-1'});
    expect(act(s, command, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'CAPACITY_FULL', state: s});
  });
  it('rejects incomplete or negative heart fields and a shortened stage still in the future', () => {
    let s = run(prepared(), {type: 'startOrder', id: 'building-4', recipe: 'small'});
    s = run(s, speed(s, 'building-4', 'order'));
    const raw = JSON.parse(encodeGame(s)); delete raw.hearts; expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
    raw.hearts = -1; expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
    raw.hearts = 0; raw.nextHeartGiftAt = -1; expect(decodeGame(JSON.stringify(raw)).ok).toBe(true); // Overdue rebased timestamps may precede the epoch.
    raw.nextHeartGiftAt = -.5; expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
    raw.nextHeartGiftAt = DAY; raw.buildings[1].order.endsAt = MINUTE;
    expect(decodeGame(JSON.stringify(raw)).ok).toBe(false); // A shortened stage cannot still be in the future.
  });
});

describe('pattes complement transactions', () => {
  it.each([[0, 0], [1, 1], [25, 1], [26, 2], [50, 2], [51, 3]])('rounds %i missing pattes to %i hearts', (missing, expected) => {
    expect(complementCost(missing)).toBe(expected);
  });
  it.each<PattesCommand>([
    {type: 'buyBuilding', kind: 'enclosure', x: 22, y: 24},
    {type: 'buyRabbit', species: 'neige', enclosureId: 'building-1'},
    {type:'expand',parcelId:'east',expectedCost:500}, {type: 'startOrder', id: 'building-4', recipe: 'small'},
  ])('explicitly pays the exact shortage for $type and does not grant change', action => {
    const s = prepared();if(action.type==='expand'){const level=requiredExtensionLevel(1);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};} s.pattes = 3; s.hearts = 100;
    const before = structuredClone(s), q = quoteComplement(s, action, 0); expect(s).toEqual(before);
    if (!q.ok) throw new Error(q.reason);
    expect(act(s, action, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_PATTES', state: s});
    const result = run(s, pay(s, action)); expect(result.pattes).toBe(0); expect(result.hearts).toBe(100 - q.hearts); // The prepared game is at level 6: these purchases cross no level.
    expect(decodeGame(encodeGame(result))).toEqual({ok: true, state: result});
  });
  it('implements 30 pattes + 2 hearts for an 80-patte rabbit', () => {
    const s = createGame(0); s.pattes = 30; const action: PattesCommand = {type: 'buyRabbit', species: 'neige', enclosureId: 'building-1'};
    expect(quoteComplement(s, action, 0)).toEqual({ok: true, cost: 80, pattes: 30, missing: 50, hearts: 2});
    const paid = run(s, pay(s, action)); expect(paid).toMatchObject({pattes: 0, hearts: 10}); expect(paid.rabbits).toHaveLength(3);
  });
  it('keeps breeding free and refuses the retired complement even through an indirect request', () => {
    const s=prepared();s.pattes=0;s.hearts=0;
    expect(quoteComplement(s,breed as unknown as PattesCommand,0)).toEqual({ok:false,reason:'INVALID_CHOICE'});
    expect(act(s,{type:'payWithHearts',action:breed as unknown as PattesCommand,maxHearts:100,maxPattes:100},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:s});
    expect(run(s,breed)).toMatchObject({pattes:0,hearts:0});
  });
  it('rejects payment if another condition changes, funds are insufficient or a cap is exceeded', () => {
    const s = prepared(); s.pattes = 30; const action: PattesCommand = {type: 'buyRabbit', species: 'neige', enclosureId: 'building-1'}, command = pay(s, action);
    s.hearts = 1; expect(act(s, command)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_HEARTS', state: s});
    s.hearts = 12; s.pattes = 0; expect(act(s, command)).toMatchObject({ok: false, reason: 'PRICE_CHANGED', state: s});
    s.pattes = 31; expect(act(s, command)).toMatchObject({ok: false, reason: 'PRICE_CHANGED', state: s});
    s.pattes = 30; const full = run(s, command);
    expect(act(full, command)).toMatchObject({ok: false, reason: 'CAPACITY_FULL', state: full});
  });
  it('cannot substitute hearts for grass', () => {
    const s = createGame(0); s.grass = 0;
    expect(act(s, {type: 'feed', id: 'rabbit-2'}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_GRASS', state: s});
    expect(act(s, {type: 'payWithHearts', action: {type: 'feed', id: 'rabbit-2'}, maxPattes: 0, maxHearts: 12} as unknown as Command, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE', state: s});
  });
});

describe('imports and exports', () => {
  it('imports and exports the current version without granting hearts again', () => {
    const memory = store(), c = new GameController(memory.storage, () => HOUR);
    const s = createGame(0); s.hearts = 3;
    const preview = c.prepareImport(encodeGame(s)); if (!preview.ok) throw new Error(preview.reason);
    expect(preview.summary.hearts).toBe(3); expect(c.confirmImport(preview.token, true)).toEqual({ok: true});
    expect(current(c).hearts).toBe(3); const exported = c.exportGame(); if (!exported.ok) throw new Error(exported.reason);
    expect(JSON.parse(exported.json)).toMatchObject({version: 16, hearts: 3});
  });
});
