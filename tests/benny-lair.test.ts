import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, BENNY_LAIR} from '../src/config/balance';
import {BENNY_RUN, BENNY_RUN_MAX_METRES} from '../src/simulation/bennyRun';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {SAVE_VERSION} from '../src/persistence/json';
import type {Command, GameState} from '../src/state/types';

/** The Antre du dragon and the record of « Cours cours Benny ! » (owner, 11 November 2026): level 25, Benny on the island, 100 000 pattes. */
function game(level: number = BENNY_LAIR.unlockLevel, benny = true): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 100_000;
  if (benny) { s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'benny', affection: 5, enclosureId: s.buildings.find(b => b.kind === 'enclosure')!.id}); s.discovered.push('benny'); }
  return s;
}
/** Tries every cell; returns the first success, or the refusals met. */
function placeLair(s: GameState) {
  const reasons = new Set<string>();
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const r = act(s, {type: 'buyBuilding', kind: 'lair', x, y}, s.lastSimulatedAt); if (r.ok) return {state: r.state, reasons}; reasons.add(r.reason); }
  return {state: null, reasons};
}
function run(s: GameState, command: Command) {
  const r = act(s, command, s.lastSimulatedAt); if (!r.ok) throw Error(r.reason); return r.state;
}

describe('the Antre du dragon', () => {
  it('costs 100 000 pattes, one at most, from level 25 with Benny on the island', () => {
    expect(BALANCE.buildings.lair).toEqual({price: 100_000, maximum: 1});
    expect(placeLair(game(BENNY_LAIR.unlockLevel - 1)).reasons).toContain('LEVEL_REQUIRED');
    expect(placeLair(game(BENNY_LAIR.unlockLevel - 1)).state).toBeNull();
    expect(placeLair(game(BENNY_LAIR.unlockLevel, false)).reasons).toContain('BENNY_REQUIRED');
    expect(placeLair(game(BENNY_LAIR.unlockLevel, false)).state).toBeNull();
    const built = placeLair(game()).state!;
    expect(built.buildings.filter(b => b.kind === 'lair')).toHaveLength(1); expect(built.pattes).toBe(0);
    built.pattes = 100_000; expect(placeLair(built).state).toBeNull();
  });
  it('keeps the best score and the longest run, with no reward, and saves them', () => {
    let s = placeLair(game()).state!; const before = {pattes: s.pattes, hearts: s.hearts, xp: s.progression.totalXp};
    s = run(s, {type: 'finishBennyRun', score: 1200, metres: 800});
    s = run(s, {type: 'finishBennyRun', score: 900, metres: 1500});
    expect(s.bennyRun).toEqual({best: 1200, metres: 1500});
    expect({pattes: s.pattes, hearts: s.hearts, xp: s.progression.totalXp}).toEqual(before);
    const raw = JSON.parse(encodeGame(s)); expect(raw.version).toBe(SAVE_VERSION);
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok && decoded.state.bennyRun).toEqual({best: 1200, metres: 1500});
  });
  it('refuses a run without the lair, without Benny, or with impossible numbers', () => {
    expect(act(game(), {type: 'finishBennyRun', score: 10, metres: 10}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
    const s = placeLair(game()).state!;
    for (const [score, metres] of [[-1, 0], [1.5, 0], [BENNY_RUN.maxScore + 1, 0], [0, BENNY_RUN_MAX_METRES + 1]])
      expect(act(s, {type: 'finishBennyRun', score, metres}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    const without = {...s, rabbits: s.rabbits.filter(r => r.species !== 'benny')};
    expect(act(without, {type: 'finishBennyRun', score: 10, metres: 10}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'BENNY_REQUIRED'});
  });
  it('moves a v28 save to v29 unchanged, and refuses a saved record out of bounds', () => {
    const s = game(), raw = JSON.parse(encodeGame(s)); raw.version = 28;
    const migrated = decodeGame(JSON.stringify(raw)); expect(migrated).toEqual(decodeGame(encodeGame(s))); expect(migrated.ok && migrated.state.version).toBe(29);
    const bad = JSON.parse(encodeGame(s)); bad.bennyRun = {best: BENNY_RUN.maxScore + 1, metres: 0};
    expect(decodeGame(JSON.stringify(bad)).ok).toBe(false);
  });
});
