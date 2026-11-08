import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {EPIC_ISLET} from '../src/config/balance';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {breedingOdds} from '../src/simulation/breeding';
import {epicIsletNest, epicIsletReason} from '../src/simulation/epicIslet';
import {buildingPlacementReason} from '../src/simulation/placement';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';

/** The islet of the Epics (owner, 5 November 2026; 200 Hearts since 8 November 2026, 400 before) from level 18, a second breeding, ×1.1 on Epics, Legendaries and Benny. */
function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
function game(level = 18, hearts = 500) {
  const s = atLevel(createGame(0), level); s.hearts = hearts;
  const free = (kind?: 'enclosure') => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y}; throw Error('No space'); };
  for (const kind of ['nest', 'nursery'] as const) if (!s.buildings.some(b => b.kind === kind)) { const c = free(); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, kind, c.x, c.y)); }
  const c = free('enclosure'), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3};
  s.buildings.push(home);
  for (const species of ['paille', 'paille', 'neige', 'neige'] as const) { s.rabbits.push({id: `rabbit-${s.nextId++}`, species, affection: 5, enclosureId: home.id}); if (!s.discovered.includes(species)) s.discovered.push(species); }
  s.rabbits.forEach(r => { r.affection = Math.max(r.affection, 5); });
  return s;
}

describe('the islet of the Epics', () => {
  it('costs 200 Hearts from player level 18, once', () => {
    expect(EPIC_ISLET).toMatchObject({unlockLevel: 18, hearts: 200, bonus: 1.1});
    expect(epicIsletReason(game(17))).toBe('LEVEL_REQUIRED');
    expect(epicIsletReason(game(18, 199))).toBe('NOT_ENOUGH_HEARTS');
    const s = game(), bought = run(s, {type: 'buyEpicIslet'});
    expect(bought.hearts).toBe(s.hearts - 200);
    expect(epicIsletNest(bought)).toMatchObject({kind: 'nest', islet: true, x: EPIC_ISLET.cell.x, y: EPIC_ISLET.cell.y, breeding: null});
    expect(epicIsletReason(bought)).toBe('BUILDING_LIMIT');
    expect(act(bought, {type: 'moveBuilding', id: epicIsletNest(bought)!.id, x: 10, y: 10}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('runs a second breeding at the same time as the island’s nest', () => {
    let s = run(game(), {type: 'buyEpicIslet'});
    const islet = epicIsletNest(s)!.id, ids = s.rabbits.slice(-4).map(r => r.id);
    s = run(s, {type: 'breed', parents: [ids[0], ids[2]]});
    expect(act(s, {type: 'breed', parents: [ids[1], ids[3]]}, 0)).toMatchObject({ok: false, reason: 'BUSY'});
    s = run(s, {type: 'breed', parents: [ids[1], ids[3]], nestId: islet});
    expect(s.buildings.filter(b => b.kind === 'nest' && b.breeding)).toHaveLength(2);
    expect(epicIsletNest(s)!.breeding!.parents).toEqual([ids[1], ids[3]]);
    // A parent already at a nest cannot go to the other one.
    expect(act(s, {type: 'breed', parents: [ids[0], s.rabbits[0].id], nestId: islet}, 0)).toMatchObject({ok: false});
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok && decoded.state).toEqual(s);
  });
  it('multiplies the chances of the Legendaries and the Epics by 1.1 only', () => {
    expect(breedingOdds('calinou', 'orange', 10, 10, true).arkoko).toBeCloseTo(breedingOdds('calinou', 'orange', 10, 10).arkoko! * 1.1, 10);
    const plain = breedingOdds('paille', 'neige', 6, 6), boosted = breedingOdds('paille', 'neige', 6, 6, true);
    expect(boosted.yetiti! / boosted.frisket!).toBeCloseTo(plain.yetiti! / plain.frisket! * 1.1, 10);
    expect(boosted.icy! / boosted.frisket!).toBeCloseTo(plain.icy! / plain.frisket!, 10);
  });
  it('refuses a save with a second islet or an islet nest elsewhere', () => {
    const s = run(game(), {type: 'buyEpicIslet'}), raw = JSON.parse(encodeGame(s));
    raw.buildings.find((b: {islet?: true}) => b.islet).x = 3;
    expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
  });
});
