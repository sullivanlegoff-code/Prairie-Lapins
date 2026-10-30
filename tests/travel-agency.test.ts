// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, HOUR, RARE_INCOME_BONUS_SPECIES, SPECIES, SPECIES_IDS, TRAVEL, drawTrip, tripHearts} from '../src/config/balance';
import {HABITAT_CAPS, habitatCap, type HabitatType} from '../src/config/habitats';
import {rabbitIncome} from '../src/simulation/time';
import {buildingPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {SAVE_KEY} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import {COCO_WELCOME, fromPlace, toPlace} from '../src/display/agency';

const run = (s: GameState, command: Command, now = s.lastSimulatedAt, roll = 0) => {
  const result = act(s, command, now, () => roll);
  if (!result.ok) throw Error(`${command.type}: ${result.reason}`);
  return result.state;
};
const atLevel = (level: number, now = 0) => {
  const s = createGame(now);
  s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  s.pattes = 5000;
  return s;
};
const free = (s: GameState) => {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('no free cell');
};
const agency = (now = 0) => {
  const s = atLevel(8, now);
  return run(s, {type: 'buyBuilding', kind: 'agency', ...free(s)});
};
const secondRabbit = (s: GameState) => {
  s.rabbits.push({...s.rabbits[0], id: `rabbit-${s.nextId++}`, affection: 2});
  s.rabbits[0].affection = 2;
  return s;
};

describe('travel agency rules', () => {
  it('opens at level 8, costs 1000 pattes and allows only one agency', () => {
    const early = atLevel(7);
    expect(act(early, {type: 'buyBuilding', kind: 'agency', ...free(early)}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    const ready = atLevel(8), command = {type: 'buyBuilding', kind: 'agency', ...free(ready)} as const;
    ready.pattes = 999;
    expect(act(ready, command, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_PATTES'});
    ready.pattes = 2000;
    const s = run(ready, command);
    expect(BALANCE.buildings.agency).toEqual({price: 1000, maximum: 1});
    expect(s.pattes).toBe(1000);
    expect(act(s, {...command, ...free(s)}, 0)).toMatchObject({ok: false, reason: 'BUILDING_LIMIT'});
  });

  it('draws exactly the 72 destination/duration pairs, including both random boundaries', () => {
    const destinations = ['Londres', 'Vannes', 'Le Caire', 'Hammamet', 'Le Lavandou', 'Bandol', 'Lille', 'Paris', 'Marrakech'];
    expect(TRAVEL.destinations).toEqual(destinations);
    const trips = Array.from({length: 72}, (_, i) => drawTrip((i + .5) / 72));
    expect(new Set(trips.map(t => `${t.destination}/${t.hours}`)).size).toBe(72);
    expect(new Set(trips.map(t => t.destination))).toEqual(new Set(destinations));
    expect([...new Set(trips.map(t => t.hours))]).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(drawTrip(0)).toEqual({destination: 'Londres', hours: 3});
    expect(drawTrip(1 - Number.EPSILON)).toEqual({destination: 'Marrakech', hours: 10});
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(tripHearts)).toEqual([1, 1, 2, 2, 2, 3, 3, 3]);
  });

  it('requires an agency and rejects invalid random draws without changing state', () => {
    const missing = createGame(0);
    expect(act(missing, {type: 'startTrip', rabbitId: 'rabbit-2'}, 0)).toMatchObject({ok: false, reason: 'MISSING_BUILDING'});
    const s = agency();
    for (const roll of [-1, 1, NaN, Infinity]) {
      expect(act(s, {type: 'startTrip', rabbitId: 'rabbit-2'}, 0, () => roll)).toEqual({ok: false, reason: 'INVALID_RANDOM', state: s});
    }
  });

  it('keeps the traveller’s place and income, blocks all other activities until welcomed home', () => {
    let s = secondRabbit(agency());
    s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'kitchen', free(s).x, free(s).y));
    const home = s.rabbits[0].enclosureId;
    s = run(s, {type: 'startTrip', rabbitId: 'rabbit-2'});
    expect(act(s, {type: 'startTrip', rabbitId: s.rabbits[1].id}, 0)).toMatchObject({ok: false, reason: 'BUSY'});
    const blocked: Command[] = [
      {type: 'feed', id: 'rabbit-2'}, {type: 'breed', parents: ['rabbit-2', s.rabbits[1].id]},
      {type: 'moveRabbit', id: 'rabbit-2', enclosureId: home}, {type: 'release', id: 'rabbit-2'},
      {type: 'rewardCuisine', rabbitId: 'rabbit-2', recipeId: 'salad'},
    ];
    for (const now of [0, s.travel!.trips[0]!.endsAt]) for (const command of blocked)
      expect(act(s, command, now)).toMatchObject({ok: false, reason: 'TRAVELING'});
    expect(advance(s, HOUR).rabbits[0].enclosureId).toBe(home);
    expect(advance(s, HOUR).buildings[0].incomeUnits).toBe(22 * HOUR);
    expect(act(s, {type: 'claimTrip', rabbitId: 'rabbit-2'}, 3 * HOUR - 1)).toMatchObject({ok: false, reason: 'NOT_READY'});
    const hearts = s.hearts;
    s = run(s, {type: 'claimTrip', rabbitId: 'rabbit-2'}, 3 * HOUR);
    expect(s.hearts).toBe(hearts + 1);
    expect(s.travel!.trips).toHaveLength(0);
    expect(act(s, {type: 'claimTrip', rabbitId: 'rabbit-2'}, 3 * HOUR)).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(run(s, {type: 'startTrip', rabbitId: 'rabbit-2'}).travel!.trips).toHaveLength(1);
  });

  it.each([0, .5, 1 - Number.EPSILON])('credits the exact souvenir at return (roll %s)', roll => {
    const s = run(agency(), {type: 'startTrip', rabbitId: 'rabbit-2'}, 0, roll), trip = s.travel!.trips[0]!;
    expect(run(s, {type: 'claimTrip', rabbitId: 'rabbit-2'}, trip.endsAt).hearts - s.hearts).toBe(tripHearts((trip.endsAt - trip.startedAt) / HOUR));
  });

  it('reports TRAVELING for breeding even when the traveller has affection 1', () => {
    let s = secondRabbit(agency()); s.rabbits[0].affection = 1;
    s = run(s, {type: 'startTrip', rabbitId: 'rabbit-2'});
    expect(act(s, {type: 'breed', parents: ['rabbit-2', s.rabbits[1].id]}, 0)).toMatchObject({ok: false, reason: 'TRAVELING'});
  });

  it('does not let a parent at the nest leave', () => {
    let s = secondRabbit(agency());
    s.rabbits[1].species = 'frisket'; s.discovered.push('frisket');
    s = run(s, {type: 'breed', parents: ['rabbit-2', s.rabbits[1].id]});
    expect(act(s, {type: 'startTrip', rabbitId: 'rabbit-2'}, 0)).toMatchObject({ok: false, reason: 'PARENT_BUSY'});
  });

  it('round-trips an ongoing trip and rejects inconsistent saves', () => {
    const s = run(agency(), {type: 'startTrip', rabbitId: 'rabbit-2'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    const mutations: ((s: GameState) => void)[] = [
      s => { s.travel!.trips[0]!.endsAt = 3 * HOUR + 1; },
      s => { s.travel!.trips[0]!.endsAt = 2 * HOUR; },
      s => { s.travel!.trips[0]!.endsAt = 11 * HOUR; },
      s => { s.travel!.trips[0]!.hearts = 3; },
      s => { s.travel!.trips[0]!.rabbitId = 'rabbit-999'; },
      s => { s.buildings = s.buildings.filter(b => b.kind !== 'agency'); },
      s => { s.travel!.trips[0]!.destination = 'inconnue' as typeof TRAVEL.destinations[number]; },
      s => { s.travel!.trips[0]!.startedAt++; s.travel!.trips[0]!.endsAt++; },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(s); mutate(bad);
      expect(decodeGame(JSON.stringify(bad))).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
    let nested = secondRabbit(agency());
    nested.rabbits[1].species = 'frisket'; nested.discovered.push('frisket');
    nested = run(nested, {type: 'breed', parents: ['rabbit-2', nested.rabbits[1].id]});
    nested.travel = structuredClone(s.travel);
    expect(decodeGame(JSON.stringify(nested))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });

  it('preserves remaining travel time after a large backward clock change, including after reload', () => {
    const s = run(agency(10 * HOUR), {type: 'startTrip', rabbitId: 'rabbit-2'});
    const rebased = advance(s, HOUR);
    expect(rebased.travel!.trips[0]).toMatchObject({startedAt: HOUR, endsAt: 4 * HOUR});
    expect(decodeGame(encodeGame(rebased))).toEqual({ok: true, state: rebased});
    expect(act(rebased, {type: 'claimTrip', rabbitId: 'rabbit-2'}, 4 * HOUR - 1)).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(run(rebased, {type: 'claimTrip', rabbitId: 'rabbit-2'}, 4 * HOUR).hearts).toBe(s.hearts + 1);
  });
});

describe('habitat storage and species income', () => {
  const types: HabitatType[] = ['paille', 'neige', 'feu', 'universal', 'metal', 'vol'];
  const specialized: HabitatType[] = ['paille', 'neige', 'feu', 'metal', 'vol'];
  it('strictly increases by type at levels 1–2 (universal follows Vol) and is equal at level 3', () => {
    for (const level of [1, 2] as const) {
      const caps = specialized.map(t => habitatCap(t, level));
      for (let i = 1; i < caps.length; i++) expect(caps[i]).toBeGreaterThan(caps[i - 1]);
      expect(habitatCap('universal', level)).toBe(habitatCap('vol', level));
    }
    expect(new Set(types.map(t => habitatCap(t, 3)))).toEqual(new Set([HABITAT_CAPS[3].paille]));
  });
  it.each([1, 2, 3] as const)('settles former full storage once at level %s, without accepting excess beyond both caps', level => {
    const s = createGame(0), oldCap = {1: 2400, 2: 4000, 3: 5600}[level];
    s.buildings[0].habitat!.level = level;
    s.buildings[0].incomeUnits = oldCap * HOUR;
    const decoded = decodeGame(JSON.stringify(s));
    expect(decoded.ok).toBe(true); if (!decoded.ok) return;
    expect(decoded.state.pattes).toBe(s.pattes + oldCap - habitatCap('paille', level));
    expect(decoded.state.buildings[0].incomeUnits).toBe(habitatCap('paille', level) * HOUR);
    expect(decodeGame(encodeGame(decoded.state))).toEqual(decoded);
    s.buildings[0].incomeUnits++;
    expect(decodeGame(JSON.stringify(s))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
  it('preserves a store filled to the current maximum of its level', () => {
    const s = createGame(0); s.rabbits = []; s.buildings[0].habitat = {type: 'vol', level: 3}; s.buildings[0].incomeUnits = habitatCap('vol', 3) * HOUR;
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('has no species-wide rare bonus: each rare rolls its own income, epics and legendaries multiply it', () => {
    expect(RARE_INCOME_BONUS_SPECIES).toEqual([]);
    for (const id of SPECIES_IDS) {
      const rarity = SPECIES[id].rarity;
      if (rarity === 'common') { expect([rabbitIncome(1, id), rabbitIncome(20, id)]).toEqual([10, 29]); continue; }
      const multiplier = rarity === 'epic' ? 1.3 : rarity === 'legendary' ? 1.5 : 1;
      expect([rabbitIncome(1, id, 0), rabbitIncome(1, id, 9999)]).toEqual([Math.round(10 * multiplier), Math.round(19.999 * multiplier)]);
    }
  });
});

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const panel = () => document.getElementById('panel-content')!;
function mount(s: GameState, clock = {now: 0}) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => clock.now, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('travel-agency-test'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => clock.now, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller};
}

describe('agency interface and French text', () => {
  it('refreshes an open agency panel at an isolated return deadline', () => {
    let s = agency(); s = run(s, {type: 'welcomeAgency'});
    s = run(s, {type: 'startTrip', rabbitId: s.rabbits[0].id});
    for (const b of s.buildings) if (b.habitat) b.incomeUnits = habitatCap(b.habitat.type, b.habitat.level) * HOUR;
    const end = s.travel!.trips[0].endsAt, clock = {now: end - 1};
    const {ui, controller} = mount(s, clock);
    ui.select({kind: 'building', id: s.buildings.find(b => b.kind === 'agency')!.id});
    expect(panel().querySelector('.agency-return button')).toBeNull();
    const revision = controller.getSnapshot().viewRevision;
    const before = controller.getSnapshot().state!;
    clock.now = end; controller.refresh();
    expect(controller.getSnapshot().state).toEqual({...before, lastSimulatedAt: end});
    expect(controller.getSnapshot().viewRevision).toBe(revision + 1);
    expect(panel().querySelector<HTMLButtonElement>('.agency-return button')!.disabled).toBe(false);
  });
  it('lists independent returns, keeps Coco and confirms the next Heart upgrade', () => {
    let s = secondRabbit(agency()); const id = s.buildings.at(-1)!.id;
    s.hearts = 200; s = run(s, {type: 'welcomeAgency'});
    s = run(s, {type: 'upgradeAgency', id, fromLevel: 1});
    for (const rabbit of s.rabbits) s = run(s, {type: 'startTrip', rabbitId: rabbit.id});
    const clock = {now: 3 * HOUR}, {ui, controller} = mount(s, clock);
    ui.select({kind: 'building', id});
    expect(panel().querySelectorAll('.agency-return')).toHaveLength(2);
    expect(panel().querySelectorAll('.traveller-bubble')).toHaveLength(2);
    expect(panel().querySelectorAll('.agency-host-portrait')).toHaveLength(1);
    expect(panel().querySelector('.agency-travellers')).toBeNull();
    panel().querySelector<HTMLButtonElement>('.agency-return button')!.click();
    expect(controller.getSnapshot().state!.travel!.trips).toHaveLength(1);
    expect(controller.getSnapshot().state!.grass).toBe(75);
    expect(panel().querySelectorAll('[data-traveller]')).toHaveLength(1);
    const before = controller.getSnapshot().state!.hearts;
    [...panel().querySelectorAll<HTMLButtonElement>('.heart-spend')].find(b => b.textContent!.includes('Améliorer'))!.click();
    expect(controller.getSnapshot().state!.hearts).toBe(before);
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('#game-dialog button')].find(b => b.textContent === 'Confirmer');
    confirm!.click();
    expect(controller.getSnapshot().state!.buildings.at(-1)!.agencyLevel).toBe(3);
    expect(controller.getSnapshot().state!.hearts).toBe(before - 120);
  });
  it('locks advanced crops, confirms farm expansion during a crop, and explains precious resale', () => {
    let s = atLevel(22); s.hearts = 200; s = run(s, {type: 'buyBuilding', kind: 'farm', ...free(s)});
    const id = s.buildings.at(-1)!.id; s.startCourse = undefined;
    const {ui, controller} = mount(s); ui.select({kind: 'building', id});
    expect(panel().querySelectorAll('.farm-order-locked')).toHaveLength(5);
    expect(panel().querySelector('[data-crop="fanes"]')!.textContent).toContain('Ferme niveau 2');
    panel().querySelector<HTMLButtonElement>('[data-crop="foin"] button')!.click();
    expect(controller.getSnapshot().state!.buildings.at(-1)!.order).not.toBeNull();
    [...panel().querySelectorAll<HTMLButtonElement>('.heart-spend')].find(b => b.textContent!.includes('Améliorer'))!.click();
    expect(controller.getSnapshot().state!.hearts).toBe(200);
    [...document.querySelectorAll<HTMLButtonElement>('#game-dialog button')].find(b => b.textContent === 'Confirmer')!.click();
    expect(controller.getSnapshot().state!.hearts).toBe(170);
    expect(controller.getSnapshot().state!.buildings.at(-1)!.farmLevel).toBe(2);
    controller.perform({type: 'buyDecoration', catalogId: 'robot-statue'});
    ui.select({kind: 'decoration', id: controller.getSnapshot().state!.decorations[0].id});
    const sell = [...panel().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith('Vendre'))!;
    expect(sell.disabled).toBe(true); expect(panel().textContent).toContain('Objet précieux : il ne se revend pas.');
  });
  it('uses the correct prepositions for all destinations', () => {
    expect(TRAVEL.destinations.map(toPlace)).toEqual(['à Londres', 'à Vannes', 'au Caire', 'à Hammamet', 'au Lavandou', 'à Bandol', 'à Lille', 'à Paris', 'à Marrakech']);
    expect(TRAVEL.destinations.map(fromPlace)).toEqual(['de Londres', 'de Vannes', 'du Caire', 'd’Hammamet', 'du Lavandou', 'de Bandol', 'de Lille', 'de Paris', 'de Marrakech']);
  });
  it('welcomes in four bubbles once, shows the destination and timer, welcomes back and persists the hearts', () => {
    const s = agency(), clock = {now: 0}, id = s.buildings.find(b => b.kind === 'agency')!.id;
    const {ui, controller} = mount(s, clock);
    ui.select({kind: 'building', id});
    for (let step = 0; step < 4; step++) {
      expect(panel().querySelector('.agency-bubble')!.textContent).toContain(COCO_WELCOME[step]);
      expect(panel().querySelector('.agency-step')!.textContent).toBe(`Coco · ${step + 1} / 4`);
      expect(panel().querySelectorAll('.agency-host-portrait')).toHaveLength(1);
      panel().querySelector<HTMLButtonElement>('[data-focus="agency-next"]')!.click();
    }
    expect(controller.getSnapshot().state!.travel!.welcomed).toBe(true);
    ui.close(); ui.select({kind: 'building', id});
    expect(panel().querySelector('.agency-step')).toBeNull();
    panel().querySelector<HTMLButtonElement>('[data-traveller="rabbit-2"] button')!.click();
    expect(panel().querySelector('[data-trip="away"]')!.textContent).toContain('Londres');
    expect(panel().querySelector('.agency-host')!.textContent).toContain('Un souvenir t’attend au retour !');
    expect(panel().querySelector('.timer')).not.toBeNull();
    const travelling = controller.getSnapshot().state!;
    // A fresh UI/controller loaded from the save must not repeat Coco’s welcome.
    ui.dispose(); controller.dispose();
    const reloaded = mount(travelling, clock);
    reloaded.ui.select({kind: 'building', id});
    expect(panel().querySelector('.agency-step')).toBeNull();
    clock.now = travelling.travel!.trips[0]!.endsAt;
    reloaded.ui.select({kind: 'building', id});
    expect(panel().querySelector('.agency-host')!.textContent).toBe('De retour de Londres : voici Lapin Paille ! Viens l’accueillir.');
    expect(panel().querySelector('.traveller-bubble')!.textContent).toContain('Ces vacances à Londres étaient super !');
    const button = panel().querySelector<HTMLButtonElement>('.agency-return button')!;
    expect(button.textContent).toBe('Accueillir · + 1 cœur'); button.click();
    const returned = reloaded.controller.getSnapshot().state!;
    expect(returned.hearts).toBe(travelling.hearts + 1);
    expect(returned.travel).toEqual({welcomed: true, trips: []});
    expect(decodeGame(encodeGame(returned))).toEqual({ok: true, state: returned});
    expect(panel().querySelector('.agency-host-portrait')).not.toBeNull();
    expect(panel().querySelector('.agency-step')).toBeNull();
  });
  it('disables selecting a traveller in the Cuisine', () => {
    let s = agency(); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'kitchen', free(s).x, free(s).y));
    s = run(s, {type: 'startTrip', rabbitId: 'rabbit-2'});
    const {ui} = mount(s); ui.open({kind: 'cuisineRabbit'});
    expect(panel().querySelector<HTMLButtonElement>('[data-cuisine-rabbit="rabbit-2"]')!.disabled).toBe(true);
    expect(panel().textContent).toContain('Ce lapin est en voyage. Accueille-le à l’agence à son retour.');
  });
});
