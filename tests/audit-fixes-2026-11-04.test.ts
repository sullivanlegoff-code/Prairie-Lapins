import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BACKUP_KEY, CLOUD_KEY, FINGERPRINT_FORMAT, fingerprint} from '../src/cloud/sync';
import {fixture} from './cloud-fixtures';
import {growthDuration} from '../src/config/balance';
import {act, advance, createGame} from '../src/simulation';

describe('audit 4 November 2026: parent challenge on automatic transfer', () => {
  it('counts the parent challenge once for both parents when the birth moves to the nursery by itself', () => {
    const state = createGame(0), enclosure = state.buildings[0];
    state.rabbits.push(
      {id: 'rabbit-a', species: 'amethyste', affection: 30, enclosureId: enclosure.id},
      {id: 'rabbit-b', species: 'fluffy', affection: 30, enclosureId: enclosure.id},
    );
    state.missions.completed.push('to-nursery');
    state.missions.claimed.push('to-nursery');
    const ends = growthDuration('paille');
    state.buildings.find(b => b.kind === 'nest')!.breeding = {
      parents: ['rabbit-a', 'rabbit-b'], startedAt: 0, endsAt: ends,
      birth: {id: 'birth-auto', species: 'paille', guaranteed: false, reservedDiscovery: false},
    };
    const moved = advance(state, ends);
    expect(moved.buildings.find(b => b.kind === 'nest')!.breeding).toBeNull();
    expect(moved.buildings.find(b => b.kind === 'nursery')!.nursery!.babies.map(baby => baby.birth.id)).toEqual(['birth-auto']);
    expect(moved.rabbits.find(r => r.id === 'rabbit-a')?.evolution?.challenges?.parent).toBe(1);
    expect(moved.rabbits.find(r => r.id === 'rabbit-b')?.evolution?.challenges?.parent).toBe(1);
    // Later simulation and an unrelated action never count the same birth again.
    const later = advance(moved, ends + 1000);
    expect(later.rabbits.find(r => r.id === 'rabbit-a')?.evolution?.challenges?.parent).toBe(1);
    const evolved = act(later, {type: 'evolveRabbit', rabbitId: 'rabbit-b'}, ends + 1000);
    // Fluffy still needs its picnic: the parent step alone is not enough.
    expect(evolved).toMatchObject({ok: false, reason: 'EVOLUTION_CHALLENGES'});
  });
});

describe('audit 4 November 2026: the caresses mission needs three rabbits', () => {
  it('is never offered with fewer than three rabbits', async () => {
    const {dailyMissionAvailable} = await import('../src/simulation/missions');
    const state = createGame(0), enclosure = state.buildings[0];
    state.rabbits = state.rabbits.slice(0, 2);
    while (state.rabbits.length < 2) state.rabbits.push({id: `rabbit-x${state.rabbits.length}`, species: 'paille', affection: 1, enclosureId: enclosure.id});
    expect(dailyMissionAvailable(state, 'pet-rabbits')).toBe(false);
    state.rabbits.push({id: 'rabbit-x9', species: 'paille', affection: 1, enclosureId: enclosure.id});
    expect(dailyMissionAvailable(state, 'pet-rabbits')).toBe(true);
  });
});

describe('audit 4 November 2026: online save after the v22 → v25 update', () => {
  /** A link as an older version of the game left it: no format, and a baseline whose shape the update changed. */
  async function legacyLink(f: ReturnType<typeof fixture>) {
    await f.sync.connect('player-a'); await f.sync.choose('local', true); f.sync.disconnect();
    const link = JSON.parse(f.data.get(CLOUD_KEY)!), baseline = JSON.parse(link.baseline);
    baseline.cozy = {...baseline.cozy, discoveries: [], events: []};
    for (const b of baseline.buildings) if (b.kind === 'enclosure') { b.x -= 1; b.formerFootprint = undefined; }
    delete baseline.missions.petted; delete baseline.missions.streak;
    delete link.format; link.baseline = JSON.stringify(baseline); f.data.set(CLOUD_KEY, JSON.stringify(link));
    expect(link.baseline).not.toBe(fingerprint(f.controller.getSnapshot().state!));
  }
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('a device that has not played since takes the newer online game, with the usual backup, without a conflict', async () => {
    const f = fixture(); try {
      await legacyLink(f);
      f.gateway.remote!.state.pattes = 777; f.gateway.remote!.revision++;
      await f.sync.connect('player-a');
      expect(f.sync.getView().status).toBe('saved'); expect(f.controller.getSnapshot().state!.pattes).toBe(777);
      expect(f.data.has(BACKUP_KEY)).toBe(true); expect(JSON.parse(f.data.get(CLOUD_KEY)!).format).toBe(FINGERPRINT_FORMAT);
    } finally { f.dispose(); }
  });
  it('still shows a conflict when both devices have played', async () => {
    const f = fixture(); try {
      await legacyLink(f); f.rename('Praline');
      f.gateway.remote!.state.pattes = 888; f.gateway.remote!.revision++;
      await f.sync.connect('player-a');
      expect(f.sync.getView().status).toBe('conflict'); expect(f.controller.getSnapshot().state!.pattes).not.toBe(888);
    } finally { f.dispose(); }
  });
  it('an untouched device with nothing newer online sends nothing', async () => {
    const f = fixture(); try {
      await legacyLink(f); const calls = f.gateway.calls.length;
      await f.sync.connect('player-a'); await vi.advanceTimersByTimeAsync(10_000);
      expect(f.sync.getView().status).toBe('saved'); expect(f.gateway.calls).toHaveLength(calls);
    } finally { f.dispose(); }
  });
  it('a caress and the streak change the fingerprint, so they are sent online', () => {
    const s = createGame(0), before = fingerprint(s);
    s.missions.daily.petted = [s.rabbits[0]!.id]; expect(fingerprint(s)).not.toBe(before);
    const petted = fingerprint(s); s.missions.streak = {count: 2, lastCycle: 1}; expect(fingerprint(s)).not.toBe(petted);
  });
});

describe('audit 4 November 2026: an evolution discovered stays discovered', () => {
  it('keeps the species revealed once its only evolved rabbit is released, across a save and reload', async () => {
    const {evolutionRevealed} = await import('../src/simulation/forest');
    const {decodeGame, encodeGame} = await import('../src/simulation');
    const state = createGame(0), evolvedId = `rabbit-${state.nextId++}`, otherId = `rabbit-${state.nextId++}`;
    state.rabbits.push({id: evolvedId, species: 'paille', affection: 30, enclosureId: 'building-1'}, {id: otherId, species: 'paille', affection: 1, enclosureId: 'building-1'});
    state.travel = {welcomed: true, trips: [{rabbitId: evolvedId, destination: 'Paris', startedAt: -10, endsAt: 0, hearts: 1}]};
    const returned = act(state, {type: 'claimTrip', rabbitId: evolvedId}, 0); if (!returned.ok) throw Error(returned.reason);
    const evolved = act(returned.state, {type: 'evolveRabbit', rabbitId: evolvedId}, 0); if (!evolved.ok) throw Error(evolved.reason);
    expect(evolved.state.evolvedSpecies).toEqual(['paille']);
    const released = act(evolved.state, {type: 'release', id: evolvedId}, 0); if (!released.ok) throw Error(released.reason);
    expect(released.state.rabbits.some(r => r.evolution?.done)).toBe(false);
    expect(evolutionRevealed(released.state, 'paille')).toBe(true);
    const reloaded = decodeGame(encodeGame(released.state)); if (!reloaded.ok) throw Error(reloaded.reason);
    expect(evolutionRevealed(reloaded.state, 'paille')).toBe(true);
    expect(evolutionRevealed(reloaded.state, 'neige')).toBe(false);
  });
  it('fills the list at load from the rabbits that have already evolved', async () => {
    const {decodeGame, encodeGame} = await import('../src/simulation');
    const state = createGame(0), id = `rabbit-${state.nextId++}`;
    state.rabbits.push({id, species: 'paille', affection: 30, enclosureId: 'building-1', evolution: {done: true, challenges: {voyage: 1}}});
    const loaded = decodeGame(encodeGame(state)); if (!loaded.ok) throw Error(loaded.reason);
    expect(loaded.state.evolvedSpecies).toEqual(['paille']);
  });
});

describe('audit 4 November 2026: the Magicien only performs when free', () => {
  it('starts a trick while resting, never walking (he stays still for his shows since 10 November 2026), asleep, kissing, at a picnic or in a chase', async () => {
    const {magicienFree} = await import('../src/display/magicienTimeline');
    expect(magicienFree('rest', false)).toBe(true);
    for (const mode of ['walk', 'sleep', 'kiss', 'meet', 'zoom', 'fed', 'hop', 'salto', undefined]) expect(magicienFree(mode, false)).toBe(false);
    expect(magicienFree('rest', true)).toBe(false); // A picnic guest, a chase runner or a visitor at a decoration.
  });
});
