import {describe, expect, it} from 'vitest';
import {RABBIT_ART} from '../src/config/rabbitArt';
import {PATCH_KINDS, RABBIT_BLINK_ART, rabbitBlinkArt, rabbitPatchPlacement} from '../src/config/rabbitBlinkArt';
import {SPECIES_ENTRIES} from '../src/config/species';
import {rabbitFaceEvent, rabbitFaceSeed, rabbitFaceState} from '../src/display/rabbitBlink';

describe('deterministic rabbit expressions', () => {
  it('bounds every blink/burst duration, interval and count across rabbits and cycles', () => {
    let doubles = 0, singles = 0;
    const noseCounts = new Set<number>();
    for (let id = 0; id < 100; id++) {
      const seed = rabbitFaceSeed(`rabbit-${id}`);
      for (const nose of [false, true]) for (let cycle = 0; cycle < 40; cycle++) {
        const event = rabbitFaceEvent(seed, cycle, nose);
        const interval = rabbitFaceEvent(seed, cycle + 1, nose).start - event.start;
        expect(event.duration).toBeGreaterThanOrEqual(nose ? 80 : 110);
        expect(event.duration).toBeLessThanOrEqual(nose ? 110 : 160);
        expect(event.gap).toBeGreaterThanOrEqual(80);
        expect(event.gap).toBeLessThanOrEqual(110);
        expect(interval).toBeGreaterThanOrEqual(nose ? 4000 : 2500);
        expect(interval).toBeLessThanOrEqual(nose ? 10000 : 6000);
        if (nose) noseCounts.add(event.count);
        else { expect([1, 2]).toContain(event.count); if (event.count === 2) doubles++; else singles++; }
      }
    }
    expect([...noseCounts].sort()).toEqual([2, 3]);
    expect(doubles / (singles + doubles)).toBeGreaterThan(.15);
    expect(doubles / (singles + doubles)).toBeLessThan(.25);
  });

  it('shows exactly each pulse and the normal gaps, including events crossing a slot boundary', () => {
    for (let id = 0; id < 30; id++) for (const nose of [false, true]) {
      const seed = rabbitFaceSeed(`rabbit-${id}`), bit = nose ? 2 : 1;
      for (let cycle = 0; cycle < 20; cycle++) {
        const event = rabbitFaceEvent(seed, cycle, nose);
        expect(rabbitFaceState(seed, event.start - .01) & bit).toBe(0);
        for (let pulse = 0; pulse < event.count; pulse++) {
          const start = event.start + pulse * (event.duration + event.gap);
          expect(rabbitFaceState(seed, start + .01) & bit).toBe(bit);
          expect(rabbitFaceState(seed, start + event.duration - .01) & bit).toBe(bit);
          expect(rabbitFaceState(seed, start + event.duration + .01) & bit).toBe(0);
        }
      }
    }
  });

  it('is reproducible regardless of frame order, desynchronised by ID, and reserves the nose for rest', () => {
    const a = rabbitFaceSeed('rabbit-2'), b = rabbitFaceSeed('rabbit-3');
    expect(a).toBe(rabbitFaceSeed('rabbit-2'));
    expect(a).not.toBe(b);
    const times = Array.from({length: 4000}, (_, i) => i * 17);
    const states = times.map(t => rabbitFaceState(a, t));
    expect(times.slice().reverse().map(t => rabbitFaceState(a, t)).reverse()).toEqual(states);
    expect(times.map(t => rabbitFaceState(b, t))).not.toEqual(states);
    const noseMoments = Array.from({length: 500}, (_, cycle) => rabbitFaceEvent(a, cycle, true))
      .map(event => event.start + event.duration / 2);
    expect(noseMoments.some(t => rabbitFaceState(a, t) === 3)).toBe(true);
    times.forEach((t, i) => expect(rabbitFaceState(a, t, false)).toBe(states[i] & 1));
  });
});

describe('rabbit patch adapter and body coordinates', () => {
  it('covers precisely all 18 eligible species with both patches', () => {
    expect(RABBIT_BLINK_ART).toHaveLength(18);
    // The sprites approved on 25 October 2026 do not blink yet, by the owner's choice.
    const pending: readonly string[] = ['boudinet', 'dinono', 'egiiipte', 'piment', 'tunini', 'bretonette', 'dadi', 'maxou', 'orange', 'magicien', 'dragon', 'requin'];
    for (const species of SPECIES_ENTRIES) {
      const art = rabbitBlinkArt(species.id);
      if (species.art.kind === 'static-sprite' && species.id !== 'ardent' && !pending.includes(species.id)) {
        expect(art?.patches.map(patch => patch.kind)).toEqual(PATCH_KINDS);
        for (const patch of art!.patches) {
          expect(patch.url).toContain(`assets/rabbits/${species.id}/${species.id}-${patch.kind}.png`);
          expect(patch.texture).toBe(`${species.art.texture}-${patch.kind}`);
        }
      } else expect(art).toBeUndefined();
    }
  });

  it('positions the upper-left patch origin relative to sprite origin (.5, 1) and groundY', () => {
    expect(rabbitPatchPlacement({width: 400, height: 500, worldWidth: 100, groundY: 13}, {x: 120, y: 240}))
      .toEqual({x: -20, y: -52, scale: .25});
    for (const art of RABBIT_ART) for (const patch of rabbitBlinkArt(art.species)?.patches ?? []) {
      const placement = rabbitPatchPlacement(art, patch), scale = art.worldWidth / art.width;
      // Both points must remain identical after the parent's mirror, squash, lift and somersault.
      for (const facing of [-1, 1]) for (const rotation of [0, Math.PI * .7, Math.PI]) {
        const transform = (x: number, y: number) => ({
          x: Math.cos(rotation) * x * facing * .86 - Math.sin(rotation) * y * 1.12,
          y: Math.sin(rotation) * x * facing * .86 + Math.cos(rotation) * y * 1.12 - 20,
        });
        for (const [dx, dy] of [[0, 0], [patch.width, patch.height]]) {
          const actual = transform(placement.x + dx * placement.scale, placement.y + dy * placement.scale);
          const expected = transform((patch.x + dx - art.width / 2) * scale, art.groundY + (patch.y + dy - art.height) * scale);
          expect(actual.x).toBeCloseTo(expected.x, 10);
          expect(actual.y).toBeCloseTo(expected.y, 10);
        }
      }
    }
  });
});
