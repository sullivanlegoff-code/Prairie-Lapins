import {describe, expect, it} from 'vitest';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {MAX_RABBIT_NAME_LENGTH, normalizeRabbitName} from '../src/simulation/rabbitNames';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {collectionView} from '../src/ui/models';
import {sendToNursery} from './manual-transfer';
import {regressionStart} from './regression-start';
import type {Command, GameState} from '../src/state/types';

const rename = (id: string, name: string): Command => ({type: 'renameRabbit', id, name});
function run(s: GameState, command: Command, now = 0) { const r = act(s, command, now, () => .99); if (!r.ok) throw Error(r.reason); return r.state; }
/** A Paille and a Neige in a game that can feed, move and breed. */
function pair(): GameState {
  let s = regressionStart(0); s.rabbits[0].species = 'paille'; s.rabbits[1].species = 'neige'; s.discovered = ['paille', 'neige'];
  s.progression = {totalXp: cumulativeLevelXp(30), rewardedThroughLevel: 30}; s.grass = 500; s.pattes = 5000;
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20}); return run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
}
const named = (s: GameState, id: string) => s.rabbits.find(r => r.id === id)!;
const rabbitsWithoutName = (s: GameState) => s.rabbits.map(({name: _name, ...rest}) => rest);

describe('the rule for a personal name', () => {
  it.each([
    ['Mimi', 'Mimi'], ['  Mimi  ', 'Mimi'], ['Éloïse-Çà, va ?', 'Éloïse-Çà, va ?'], ['Jean  Pierre', 'Jean  Pierre'], ['', ''], ['   ', ''], [' Mimi ', 'Mimi'],
    ['🐰'.repeat(MAX_RABBIT_NAME_LENGTH), '🐰'.repeat(MAX_RABBIT_NAME_LENGTH)], ['a'.repeat(MAX_RABBIT_NAME_LENGTH), 'a'.repeat(MAX_RABBIT_NAME_LENGTH)], ['<b>x</b> & "q"', '<b>x</b> & "q"'],
  ])('accepts %j as %j', (raw, expected) => expect(normalizeRabbitName(raw)).toBe(expected));
  it.each([['a'.repeat(MAX_RABBIT_NAME_LENGTH + 1)], ['🐰'.repeat(MAX_RABBIT_NAME_LENGTH + 1)], ['a\nb'], ['Mimi\n'], ['\nMimi'], ['a\r\nb'], ['a\tb'], ['a\u0000b'], ['a b'], ['a b'], ['\u007f']])('refuses %j', raw => expect(normalizeRabbitName(raw)).toBeNull());
  it.each([[null], [undefined], [12], [{}]])('refuses a non-text value %j', value => expect(normalizeRabbitName(value)).toBeNull());
});

describe('naming a rabbit by command', () => {
  it('names, renames, trims and clears one individual, at no cost and with no other change', () => {
    const s = pair(), before = structuredClone(s);
    const a = run(s, rename('rabbit-2', '  Mimi ')); expect(named(a, 'rabbit-2').name).toBe('Mimi');
    const b = run(a, rename('rabbit-2', 'Éloïse')); expect(named(b, 'rabbit-2').name).toBe('Éloïse');
    const c = run(b, rename('rabbit-2', '   ')); expect('name' in named(c, 'rabbit-2')).toBe(false);
    expect(c).toEqual(before);
    for (const key of ['pattes', 'grass', 'hearts', 'progression', 'missions', 'pityFailures', 'recipeBook', 'discovered', 'buildings'] as const) expect(a[key], key).toEqual(before[key]);
    expect(rabbitsWithoutName(a)).toEqual(rabbitsWithoutName(before));
  });
  it('validates the command itself, atomically', () => {
    const s = pair(), before = structuredClone(s);
    for (const name of ['a'.repeat(33), 'x\ny', 'x\t', '\u0000']) expect(act(s, rename('rabbit-2', name), 0)).toEqual({ok: false, state: before, reason: 'INVALID_NAME'});
    expect(act(s, {type: 'renameRabbit', id: 'rabbit-2', name: 7 as never}, 0)).toMatchObject({ok: false, reason: 'INVALID_NAME'});
    expect(act(s, rename('rabbit-404', 'Mimi'), 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'}); expect(s).toEqual(before);
  });
  it('belongs to the individual: two rabbits of one species are independent and may share a name', () => {
    let s = pair(); s = run(s, {type: 'buyRabbit', species: 'paille', enclosureId: 'building-1'}); const second = s.rabbits.at(-1)!.id;
    s = run(s, rename('rabbit-2', 'Pomme')); expect(named(s, second).name).toBeUndefined();
    s = run(s, rename(second, 'Pomme')); expect([named(s, 'rabbit-2').name, named(s, second).name]).toEqual(['Pomme', 'Pomme']);
    s = run(s, rename(second, 'Poire')); expect([named(s, 'rabbit-2').name, named(s, second).name]).toEqual(['Pomme', 'Poire']);
    expect(collectionView(s)).toEqual(collectionView(run(pair(), {type: 'buyRabbit', species: 'paille', enclosureId: 'building-1'})));
  });
  it('is kept through feeding, moving and breeding, and newborns do not inherit it', () => {
    let s = pair(); s = run(s, rename('rabbit-2', 'Mimi')); s = run(s, rename('rabbit-3', 'Noisette'));
    s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: 'rabbit-3'}); expect([named(s, 'rabbit-2').name, named(s, 'rabbit-3').name]).toEqual(['Mimi', 'Noisette']);
    s = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}); s = advance(s, s.lastSimulatedAt + 20 * 60_000); s = sendToNursery(s);
    expect([named(s, 'rabbit-2').name, named(s, 'rabbit-3').name]).toEqual(['Mimi', 'Noisette']);
    s = advance(s, s.lastSimulatedAt + 60 * 60_000);
    const home = s.buildings.find(b => b.kind === 'enclosure')!, baby = s.buildings.find(b => b.kind === 'nursery')!.nursery!.babies[0];
    s = run(s, {type: 'welcome', enclosureId: home.id, birthId: baby.birth.id}, s.lastSimulatedAt); const born = s.rabbits.at(-1)!;
    expect(born.id).toBe(baby.birth.id); expect('name' in born).toBe(false); expect([named(s, 'rabbit-2').name, named(s, 'rabbit-3').name]).toEqual(['Mimi', 'Noisette']);
  });
  it('is kept when the rabbit moves to another habitat', () => {
    let s = pair(); s = run(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 18, y: 24}); s = run(s, rename('rabbit-2', 'Mimi'));
    s = run(s, {type: 'moveRabbit', id: 'rabbit-2', enclosureId: s.buildings.at(-1)!.id}); expect(named(s, 'rabbit-2')).toMatchObject({name: 'Mimi', enclosureId: s.buildings.at(-1)!.id});
  });
});

describe('saving personal names', () => {
  it('writes and reads the names exactly, and an unnamed rabbit has no field', () => {
    let s = pair(); s = run(s, rename('rabbit-2', 'Éloïse 🐰'));
    const json = encodeGame(s), parsed = JSON.parse(json); expect(parsed.version).toBe(17);
    expect(parsed.rabbits.find((r: {id: string}) => r.id === 'rabbit-2').name).toBe('Éloïse 🐰'); expect('name' in parsed.rabbits.find((r: {id: string}) => r.id === 'rabbit-3')).toBe(false);
    expect(decodeGame(json)).toEqual({ok: true, state: s});
  });
  it('survives a reload of the controller', () => {
    let s = pair(); s = run(s, rename('rabbit-3', 'Noisette'));
    const data = new Map([[SAVE_KEY, encodeGame(s)]]), storage = {getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }};
    const c = new GameController(storage, () => 0); expect(c.perform(rename('rabbit-2', 'Mimi')).ok).toBe(true); c.dispose();
    const again = new GameController(storage, () => 0); expect(named(again.getSnapshot().state!, 'rabbit-2').name).toBe('Mimi'); expect(named(again.getSnapshot().state!, 'rabbit-3').name).toBe('Noisette'); again.dispose();
  });
  it('rejects any non-canonical stored name', () => {
    const base = JSON.parse(encodeGame(pair()));
    const withName = (name: unknown) => { const copy = structuredClone(base); copy.rabbits[0].name = name; return decodeGame(JSON.stringify(copy)); };
    expect(withName('Mimi').ok).toBe(true);
    for (const bad of ['', ' Mimi', 'Mimi ', 'a'.repeat(33), 'a\nb', 'a\tb', 7, null]) expect(withName(bad), JSON.stringify(bad)).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
