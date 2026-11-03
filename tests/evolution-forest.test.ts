import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync, existsSync} from 'node:fs';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, FOREST, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {EVOLUTION_AFFECTION, EVOLVED_ART, EVOLVED_SCALE, hasEvolvedArt, showsEvolvedArt} from '../src/config/evolvedArt';
import {artForRabbit, evolvedRabbitArt, rabbitArt} from '../src/config/rabbitArt';
import {CUISINE_ANCHORS, EVOLVED_CUISINE_ANCHORS, cuisineAnchors} from '../src/config/cuisineAnchors';
import {crownAnchor} from '../src/config/ultimateArt';
import {FOREST_ART} from '../src/config/forestArt';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {classicLookReason, forestRabbits} from '../src/simulation/forest';
import {emptyBuilding} from '../src/state/initial';
// @ts-expect-error -- a plain Node script without type declarations.
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import type {Command, GameState} from '../src/state/types';

const EVOLVED: SpeciesId[] = ['paille', 'neige', 'feu', 'belier-gris', 'volant', 'dinono', 'dinenette'];
function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function refused(s: GameState, c: Command, reason: string) {
  expect(act(s, c, s.lastSimulatedAt, () => 0)).toEqual({ok: false, state: s, reason});
}
function freeCell(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('No space');
}
const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
/** Level 22, two statues, a level 3 universal enclosure holding the given rabbits, with or without the forest. */
function setup(rabbits: [SpeciesId, number][], forest = true) {
  let s = atLevel(createGame(0), 22); s.pattes = 100_000;
  for (let i = 0; i < 2; i++) { const c = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', c.x, c.y)); }
  const c = freeCell(s), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3};
  s.buildings.push(home);
  if (forest) s = run(s, {type: 'buyBuilding', kind: 'forest', ...freeCell(s)});
  const ids = rabbits.map(([species, affection]) => {
    const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species, affection, enclosureId: home.id});
    if (!s.discovered.includes(species)) s.discovered.push(species); return id;
  });
  return {s, ids};
}
const rabbit = (s: GameState, id: string) => s.rabbits.find(r => r.id === id)!;

describe('Evolved drawings at affection 30', () => {
  it('the five commons, Dinono and Dinenette have an evolved drawing, the other species keep their v1', () => {
    expect(EVOLUTION_AFFECTION).toBe(30);
    expect(EVOLVED_ART.map(art => art.id)).toEqual(EVOLVED);
    for (const species of SPECIES_IDS) expect(hasEvolvedArt(species)).toBe(EVOLVED.includes(species));
    expect(artForRabbit({species: 'frisket', affection: 50})).toBe(rabbitArt('frisket'));
    expect(artForRabbit({species: 'dragon', affection: 30})).toBe(rabbitArt('dragon'));
  });
  it('29 shows the old drawing, 30 and more the evolved one', () => {
    for (const species of EVOLVED) {
      expect(artForRabbit({species, affection: 29})).toBe(rabbitArt(species));
      for (const affection of [30, 31, 50]) {
        const art = artForRabbit({species, affection})!;
        expect(art).toBe(evolvedRabbitArt(species)); expect(art.evolved).toBe(true);
        expect(art.url).toContain(`assets/rabbits/${species}/${species}-v2.png`);
      }
      expect(showsEvolvedArt({species, affection: 29})).toBe(false);
      expect(showsEvolvedArt({species, affection: 30})).toBe(true);
      expect(showsEvolvedArt({species, affection: 30, classicLook: true})).toBe(false);
      expect(artForRabbit({species, affection: 40, classicLook: true})).toBe(rabbitArt(species));
    }
  });
  it('an evolved rabbit is drawn 15 % bigger, in code, keeping its picture and facing', () => {
    expect(EVOLVED_SCALE).toBe(1.15);
    for (const entry of EVOLVED_ART) {
      const art = evolvedRabbitArt(entry.id)!, v1 = rabbitArt(entry.id)!;
      expect(art.worldWidth).toBeCloseTo(entry.worldWidth * 1.15, 10);
      expect(art.width).toBe(entry.width); expect(art.height).toBe(entry.height);
      expect(art.facing).toBe(v1.facing); expect(art.groundY).toBe(v1.groundY);
      expect(art.texture).not.toBe(v1.texture);
      // The manifest world width keeps the v1's drawn area within 5 %: only EVOLVED_SCALE makes the evolution bigger.
      const area = (a: {worldWidth: number; width: number; height: number}) => a.worldWidth * a.worldWidth * a.height / a.width;
      expect(Math.abs(area(entry) / area(v1) - 1)).toBeLessThan(.05);
      expect(area(art) / area(v1)).toBeGreaterThan(1.15 * 1.15 * .95);
    }
  });
  it('the manifest lists every evolved picture, its master and the 15 % scale; the files exist and match', () => {
    const manifest = JSON.parse(readFileSync('scripts/rabbit-art-manifest.json', 'utf8'));
    for (const entry of EVOLVED_ART) {
      const m = manifest[`${entry.id}-evolution`];
      expect(m).toMatchObject({species: entry.id, registry: 'src/config/evolvedArt.ts', displayScale: EVOLVED_SCALE, file: entry.file,
        worldWidth: entry.worldWidth, width: entry.width, height: entry.height, master: `assets-source/rabbits/${entry.id}/${entry.id}-evolution-sprite.png`});
      expect(existsSync(`assets-source/rabbits/${entry.id}/${entry.id}-evolution-source.png`)).toBe(true);
      const png = decodePng(readFileSync(`public/${entry.file}`));
      expect([png.width, png.height]).toEqual([entry.width, entry.height]);
      const master = decodePng(readFileSync(m.master));
      expect([master.width, master.height]).toEqual([m.sourceWidth, m.sourceHeight]);
      // Cut out: transparent corners.
      expect(png.pixels[3]).toBe(0); expect(png.pixels[png.pixels.length - 1]).toBe(0);
    }
  });
  it('the toque and the crown use the anchors of the evolved drawing', () => {
    for (const species of EVOLVED) {
      expect(EVOLVED_CUISINE_ANCHORS[species]).toBeDefined();
      expect(cuisineAnchors(species, 1, true)).toBe(EVOLVED_CUISINE_ANCHORS[species]);
      expect(cuisineAnchors(species, 1, false)).toBe(CUISINE_ANCHORS[species]);
      expect(crownAnchor(species, 1, true).y).toBe(EVOLVED_CUISINE_ANCHORS[species]!.hat.y);
    }
    // A left-facing evolution (Paille) keeps its head on the left of its picture.
    expect(EVOLVED_CUISINE_ANCHORS.paille!.hat.x).toBeLessThan(.5);
    // Dinono and Dinenette look right, like their v1: their head stays on the right of their picture.
    for (const species of ['dinono', 'dinenette'] as const) {
      expect(evolvedRabbitArt(species)!.facing).toBe(1);
      for (const anchor of Object.values(EVOLVED_CUISINE_ANCHORS[species]!)) expect(anchor.x).toBeGreaterThan(.5);
    }
  });
});

describe('Forêt de Brocéliande', () => {
  it('costs 10 000 pattes from player level 20, one at most', () => {
    expect(BALANCE.buildings.forest).toEqual({price: 10000, maximum: 1}); expect(FOREST.unlockLevel).toBe(20);
    const low = atLevel(createGame(0), 19); low.pattes = 20_000;
    refused(low, {type: 'buyBuilding', kind: 'forest', ...freeCell(low)}, 'LEVEL_REQUIRED');
    const poor = atLevel(createGame(0), 20); poor.pattes = 9_999;
    refused(poor, {type: 'buyBuilding', kind: 'forest', ...freeCell(poor)}, 'NOT_ENOUGH_PATTES');
    const ok = atLevel(createGame(0), 20); ok.pattes = 25_000;
    const bought = run(ok, {type: 'buyBuilding', kind: 'forest', ...freeCell(ok)});
    expect(bought.pattes).toBe(15_000); expect(bought.buildings.filter(b => b.kind === 'forest')).toHaveLength(1);
    expect(bought.progression).toEqual(ok.progression); // No XP: purely cosmetic.
    refused(bought, {type: 'buyBuilding', kind: 'forest', ...freeCell(bought)}, 'BUILDING_LIMIT');
    expect(FOREST_ART.url).toContain('assets/buildings/foret-broceliande.png');
    const png = decodePng(readFileSync('public/assets/buildings/foret-broceliande.png'));
    expect([png.width, png.height]).toEqual([FOREST_ART.width, FOREST_ART.height]);
  });
  it('switches a rabbit of affection 30 between both drawings, for free, both ways and as often as wanted', () => {
    const {s, ids: [a, b]} = setup([['paille', 30], ['neige', 45]]);
    const before = {pattes: s.pattes, hearts: s.hearts, grass: s.grass, xp: s.progression.totalXp};
    const old = run(s, {type: 'toggleClassicLook', rabbitId: a});
    expect(rabbit(old, a).classicLook).toBe(true); expect(showsEvolvedArt(rabbit(old, a))).toBe(false);
    expect(rabbit(old, b).classicLook).toBeUndefined(); expect(showsEvolvedArt(rabbit(old, b))).toBe(true);
    expect(rabbit(s, a).classicLook).toBeUndefined(); // The command never mutates the state it was given.
    const back = run(old, {type: 'toggleClassicLook', rabbitId: a});
    expect('classicLook' in rabbit(back, a)).toBe(false); expect(showsEvolvedArt(rabbit(back, a))).toBe(true);
    const again = run(run(back, {type: 'toggleClassicLook', rabbitId: a}), {type: 'toggleClassicLook', rabbitId: a});
    expect(rabbit(again, a)).toEqual(rabbit(s, a));
    expect({pattes: again.pattes, hearts: again.hearts, grass: again.grass, xp: again.progression.totalXp}).toEqual(before);
    expect(rabbit(again, a).affection).toBe(30);
  });
  it('refuses below affection 30, on a species without an evolved drawing, and without the forest', () => {
    const {s, ids: [low, rare]} = setup([['feu', 29], ['frisket', 40]]);
    refused(s, {type: 'toggleClassicLook', rabbitId: low}, 'EVOLUTION_AFFECTION');
    refused(s, {type: 'toggleClassicLook', rabbitId: rare}, 'NO_EVOLVED_ART');
    refused(s, {type: 'toggleClassicLook', rabbitId: 'rabbit-404'}, 'NOT_FOUND');
    const none = setup([['feu', 35]], false);
    refused(none.s, {type: 'toggleClassicLook', rabbitId: none.ids[0]}, 'MISSING_BUILDING');
    // Without the forest a rabbit of affection 30 always shows its evolved drawing.
    expect(showsEvolvedArt(rabbit(none.s, none.ids[0]))).toBe(true);
    expect(classicLookReason(s, {species: 'feu', affection: 30})).toBeNull();
    expect(forestRabbits(s).map(r => r.id)).toEqual([]);
    const listed = setup([['feu', 31], ['frisket', 40], ['volant', 45], ['paille', 29]]);
    expect(forestRabbits(listed.s).map(r => r.species)).toEqual(['volant', 'feu']);
  });
});

describe('Save format: the old drawing put back', () => {
  it('saves and reloads the choice of each rabbit', () => {
    const {s, ids: [a, b]} = setup([['belier-gris', 30], ['volant', 30]]);
    const old = run(s, {type: 'toggleClassicLook', rabbitId: a});
    const decoded = decodeGame(encodeGame(old)); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.version).toBe(24);
    expect(rabbit(decoded.state, a).classicLook).toBe(true); expect(rabbit(decoded.state, b).classicLook).toBeUndefined();
    expect(decoded.state).toEqual(old);
  });
  it('loads a v23 save written before the forest, without any change', () => {
    const {s, ids: [evolved]} = setup([['paille', 35], ['frisket', 12]], false);
    const raw = JSON.parse(encodeGame(s));
    for (const r of raw.rabbits) expect('classicLook' in r).toBe(false);
    const decoded = decodeGame(JSON.stringify(raw)); if (!decoded.ok) throw Error(decoded.reason);
    // Only the usual load normalization (the Rare's individual income draw); no drawing choice appears.
    const plain = (rabbits: GameState['rabbits']) => rabbits.map(({incomeRoll: _roll, ...r}) => r);
    expect(plain(decoded.state.rabbits)).toEqual(plain(s.rabbits)); expect(decoded.state.rabbits.some(r => 'classicLook' in r)).toBe(false);
    expect(showsEvolvedArt(rabbit(decoded.state, evolved))).toBe(true);
  });
  it('loads a v22 save (no forest kind, no choice) unchanged', () => {
    const {s} = setup([['neige', 20]], false);
    const raw = JSON.parse(encodeGame(s)); raw.version = 22;
    const decoded = decodeGame(JSON.stringify(raw)); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.version).toBe(24); expect(decoded.state.rabbits).toEqual(s.rabbits);
  });
  it('drops a choice that means nothing instead of refusing the save', () => {
    const {s, ids: [a, low, rare]} = setup([['feu', 30], ['feu', 29], ['frisket', 40]]);
    const raw = JSON.parse(encodeGame(s));
    for (const r of raw.rabbits) if ([a, low, rare].includes(r.id)) r.classicLook = true;
    let decoded = decodeGame(JSON.stringify(raw)); if (!decoded.ok) throw Error(decoded.reason);
    expect(rabbit(decoded.state, a).classicLook).toBe(true);
    expect(rabbit(decoded.state, low).classicLook).toBeUndefined(); expect(rabbit(decoded.state, rare).classicLook).toBeUndefined();
    raw.buildings = raw.buildings.filter((b: {kind: string}) => b.kind !== 'forest');
    decoded = decodeGame(JSON.stringify(raw)); if (!decoded.ok) throw Error(decoded.reason);
    expect(rabbit(decoded.state, a).classicLook).toBeUndefined();
    raw.rabbits[0].classicLook = false;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
