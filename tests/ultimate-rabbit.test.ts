import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {BALANCE, SPECIES_IDS} from '../src/config/balance';
import {CUISINE_ANCHORS} from '../src/config/cuisineAnchors';
import {CROWN_ART, ULTIMATE_FRAME, crownAnchor, crownPlacement} from '../src/config/ultimateArt';
import {rabbitArt} from '../src/config/rabbitArt';
import {isUltimate, wearsCrown} from '../src/simulation/affection';
import {act} from '../src/simulation/actions';
import {createGame} from '../src/state/initial';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {labAction} from '../src/dev/labActions';
import type {GameState} from '../src/state/types';

const game = (affection: number): GameState => {
  const s = createGame(0); s.rabbits.push({id: 'rabbit-3', species: 'paille', affection, enclosureId: 'building-1'}); return s;
};
const rabbit = (s: GameState) => s.rabbits.find(r => r.id === 'rabbit-3')!;

describe('lapin ultime', () => {
  it('is a rabbit at the highest affection, 50, and nothing below', () => {
    expect(BALANCE.maxAffection).toBe(50);
    expect(isUltimate({affection: 49})).toBe(false);
    expect(isUltimate({affection: 50})).toBe(true);
  });
  it('wears its crown by default, and never below 50', () => {
    expect(wearsCrown({affection: 50})).toBe(true);
    expect(wearsCrown({affection: 50, crownHidden: true})).toBe(false);
    expect(wearsCrown({affection: 49})).toBe(false);
    expect(wearsCrown({affection: 49, crownHidden: true})).toBe(false);
  });
  it('takes its crown off and puts it back for free', () => {
    const s = game(50), before = {pattes: s.pattes, grass: s.grass, hearts: s.hearts, xp: s.progression.totalXp};
    const off = act(s, {type: 'toggleCrown', rabbitId: 'rabbit-3'}, 0); expect(off.ok).toBe(true);
    expect(rabbit(off.state).crownHidden).toBe(true); expect(wearsCrown(rabbit(off.state))).toBe(false);
    const on = act(off.state, {type: 'toggleCrown', rabbitId: 'rabbit-3'}, 0); expect(on.ok).toBe(true);
    expect('crownHidden' in rabbit(on.state)).toBe(false); expect(wearsCrown(rabbit(on.state))).toBe(true);
    expect({pattes: on.state.pattes, grass: on.state.grass, hearts: on.state.hearts, xp: on.state.progression.totalXp}).toEqual(before);
    expect(rabbit(s).crownHidden).toBeUndefined(); // The command never mutates the state it was given.
  });
  it('refuses the crown to a rabbit that is not ultimate, or absent', () => {
    const s = game(49);
    expect(act(s, {type: 'toggleCrown', rabbitId: 'rabbit-3'}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    expect(act(s, {type: 'toggleCrown', rabbitId: 'rabbit-404'}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
    expect(rabbit(s).crownHidden).toBeUndefined();
  });
  it('keeps a taken-off crown through a save, and drops it from a rabbit that is not ultimate', () => {
    const off = act(game(50), {type: 'toggleCrown', rabbitId: 'rabbit-3'}, 0).state;
    const loaded = decodeGame(encodeGame(off)); expect(loaded.ok).toBe(true);
    if (loaded.ok) { expect(rabbit(loaded.state).crownHidden).toBe(true); expect(loaded.state).toEqual(off); }
    const below = game(49); rabbit(below).crownHidden = true;
    const dropped = decodeGame(encodeGame(below)); expect(dropped.ok).toBe(true);
    if (dropped.ok) expect('crownHidden' in rabbit(dropped.state)).toBe(false);
    // Only `true` is a taken-off crown: any other value is an invalid save.
    const raw = JSON.parse(encodeGame(game(50))); raw.rabbits.find((r: {id: string}) => r.id === 'rabbit-3').crownHidden = false;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
  it('lets the laboratory set a rabbit to 50, and gives the crown back when it goes below', () => {
    const s = game(10), up = labAction(s, {type: 'affection', rabbitId: 'rabbit-3', value: 50});
    expect(isUltimate(rabbit(up))).toBe(true);
    const off = act(up, {type: 'toggleCrown', rabbitId: 'rabbit-3'}, up.lastSimulatedAt).state;
    const down = labAction(off, {type: 'affection', rabbitId: 'rabbit-3', value: 49});
    expect('crownHidden' in rabbit(down)).toBe(false);
  });
});

describe('crown art and anchors', () => {
  it('has a head anchor for every species, Benny included, on the skull and inside the picture', () => {
    expect(SPECIES_IDS).toContain('benny');
    for (const species of SPECIES_IDS) {
      expect(CUISINE_ANCHORS[species], species).toBeDefined();
      const anchor = crownAnchor(species);
      for (const value of [anchor.x, anchor.y, anchor.w]) { expect(value, species).toBeGreaterThan(0); expect(value, species).toBeLessThan(1); }
      expect(anchor.y, species).toBeLessThan(CUISINE_ANCHORS[species]!.eyes.y); // Above the eyes.
      expect(anchor.w, species).toBeLessThan(CUISINE_ANCHORS[species]!.hat.w); // A little narrower than the toque.
      expect(Math.abs(anchor.r), species).toBeLessThanOrEqual(12);
    }
  });
  it('places the crown on the head of the meadow sprite, at its scale', () => {
    for (const species of SPECIES_IDS) {
      const art = rabbitArt(species); if (!art) continue;
      const anchor = crownAnchor(species, art.facing), place = crownPlacement(art, anchor), scale = art.worldWidth / art.width;
      // Inside the sprite's own box (origin bottom centre at groundY), in its upper half.
      expect(Math.abs(place.x), species).toBeLessThan(art.worldWidth / 2);
      expect(place.y, species).toBeLessThan(art.groundY - art.height * scale * .3);
      expect(place.y, species).toBeGreaterThan(art.groundY - art.height * scale);
      expect(place.scale * CROWN_ART.width, species).toBeCloseTo(anchor.w * art.worldWidth);
    }
  });
  it('serves the prepared pictures at the declared sizes', () => {
    const png = readFileSync('public/assets/effects/couronne.png');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([CROWN_ART.width, CROWN_ART.height]);
    expect(png[25]).toBe(6); // RGBA: a real transparent background, no painted checkerboard.
    for (const file of ['cadre', 'couronne-cadre']) expect(readFileSync(`public/assets/ui/ultimate/${file}.webp`).subarray(8, 12).toString()).toBe('WEBP');
    const {slice, bar, piece, width, height} = ULTIMATE_FRAME;
    expect(slice.left + slice.right).toBeLessThan(width); expect(slice.top + slice.bottom).toBeLessThan(height);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) expect(bar[side]).toBeLessThan(slice[side]);
    expect(piece.width).toBeLessThan(width - slice.left - slice.right); // The crown piece fits between the corners.
  });
  it('keeps the card stylesheet on the frame numbers', () => {
    const css = readFileSync('src/display/ultimate-card.css', 'utf8'), {slice, bar, piece} = ULTIMATE_FRAME;
    expect(css).toContain(`var(--ultimate-frame) ${slice.top} ${slice.right} ${slice.bottom} ${slice.left} /`);
    for (const [side, value] of Object.entries(bar)) expect(css).toContain(`${side}: calc(-12px - ${value}px * var(--uk))`);
    expect(css).toContain(`width: calc(${piece.width}px * var(--uk))`);
  });
});
