import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync} from 'node:fs';
import {garlandLevel, nightColor, nightLevel, snowDensity, snowKind, SNOW_ODDS, SNOW_SLOT_MS} from '../src/display/winterClock';
import {christmasActive, christmasLabOverride, localHour, setChristmasLabOverride} from '../src/config/christmas';

describe('the Christmas day and night (owner, 4 November 2026)', () => {
  it('is day in the morning and afternoon, night in the evening, with a slow dusk and dawn', () => {
    for (const hour of [8.5, 10, 13, 17]) expect(nightLevel(hour)).toBe(0);
    for (const hour of [19, 20, 23.9, 0, 3, 6.4]) expect(nightLevel(hour)).toBe(1);
    expect(nightLevel(18.25)).toBeGreaterThan(.3); expect(nightLevel(18.25)).toBeLessThan(.7);
    expect(nightLevel(7.25)).toBeGreaterThan(.3); expect(nightLevel(7.25)).toBeLessThan(.7);
    for (let h = 0; h < 24; h += .01) expect(Math.abs(nightLevel(h + .01) - nightLevel(h))).toBeLessThan(.02);
  });
  it('lights the garlands at 20:00 and puts them out in the morning', () => {
    expect(garlandLevel(19.99)).toBe(0); expect(garlandLevel(20)).toBe(0);
    expect(garlandLevel(20.04)).toBe(1); expect(garlandLevel(2)).toBe(1); expect(garlandLevel(7.4)).toBe(1);
    expect(garlandLevel(7.75)).toBeGreaterThan(0); expect(garlandLevel(8)).toBe(0); expect(garlandLevel(14)).toBe(0);
  });
  it('shades the night in a soft blue, white by day', () => {
    expect(nightColor(0)).toBe(0xffffff); expect(nightColor(1)).toBe(0x9aa6d8);
  });
});

describe('the Christmas snow', () => {
  it('falls only some of the time: mostly none, sometimes tiny flakes, rarely a little heavier', () => {
    const counts = {none: 0, light: 0, heavier: 0}, slots = 20_000;
    for (let i = 0; i < slots; i++) counts[snowKind(i * SNOW_SLOT_MS + 1)]++;
    for (const kind of ['none', 'light', 'heavier'] as const) expect(Math.abs(counts[kind] / slots - SNOW_ODDS[kind])).toBeLessThan(.02);
  });
  it('is the same on every device at the same moment and changes slowly', () => {
    const t = 1_800_000_000_000;
    expect(snowDensity(t)).toBe(snowDensity(t));
    for (let x = t; x < t + 6 * SNOW_SLOT_MS; x += 10_000) expect(Math.abs(snowDensity(x + 10_000) - snowDensity(x))).toBeLessThan(.05);
  });
});

describe('the Christmas switch', () => {
  it('is on in this version and the laboratory override never reaches the normal game', () => {
    expect(christmasActive()).toBe(true);
    setChristmasLabOverride({off: true, hour: 20});
    expect(christmasLabOverride()).toEqual({}); expect(christmasActive()).toBe(true);
    const date = new Date(2026, 11, 1, 9, 30); expect(localHour(date)).toBe(9.5);
  });
});

describe('the lit windows of the Christmas nights', () => {
  it('finds the glow picture of a snowy picture, and none for the others', async () => {
    const {nightGlowOf, NIGHT_LIGHT_FILES, LIGHT_POOLS} = await import('../src/config/nightLights');
    expect(NIGHT_LIGHT_FILES.size).toBeGreaterThan(20);
    expect(nightGlowOf('/Prairie-Lapins/assets/noel/buildings/farm-level-1.png')).toEqual({texture: 'noel-nuit:buildings/farm-level-1.png', url: '/Prairie-Lapins/assets/noel/nuit/buildings/farm-level-1.png'});
    expect(nightGlowOf('/assets/noel/decorations/lantern-post.png')?.url).toBe('/assets/noel/nuit/decorations/lantern-post.png');
    // The normal (not snowy) picture, and an unknown one, have no glow.
    expect(nightGlowOf('/assets/buildings/farm-level-1.png')).toBeNull();
    expect(nightGlowOf('/assets/noel/buildings/unknown.png')).toBeNull();
    expect(nightGlowOf(undefined)).toBeNull();
    for (const id of Object.keys(LIGHT_POOLS)) expect(NIGHT_LIGHT_FILES.has(`decorations/${id}.png`)).toBe(true);
  });
  it('ships a glow picture for every listed picture', async () => {
    const {NIGHT_LIGHT_FILES} = await import('../src/config/nightLights');
    for (const file of NIGHT_LIGHT_FILES) expect(existsSync(`public/assets/noel/nuit/${file}`), file).toBe(true);
  });
});
