import {describe, expect, it} from 'vitest';
import {DANCE, DANCE_MOVES, danceMove, dancePose} from '../src/display/rabbitDance';

// Owner (8 November 2026): when Dadi's music starts, the other rabbits of the meadow dance.
describe('rabbit dance to Dadi\'s song', () => {
  it('follows the measured beat of Dadi\'s song (128 a minute)', () => {
    expect(DANCE.beatMs).toBeCloseTo(468.75);
    for (const move of DANCE_MOVES) {
      // Feet on the ground on the beat, up between two beats.
      expect(dancePose(move, DANCE.firstBeatMs + 3 * DANCE.beatMs).lift).toBeCloseTo(0);
      expect(dancePose(move, DANCE.firstBeatMs + 3.5 * DANCE.beatMs).lift).toBeGreaterThan(0);
    }
  });

  it('keeps every move small enough to stay in place', () => {
    for (const move of DANCE_MOVES) for (let ms = 0; ms < 8000; ms += 37) {
      const pose = dancePose(move, ms);
      expect(pose.lift).toBeGreaterThanOrEqual(0); expect(pose.lift).toBeLessThanOrEqual(DANCE.hop);
      expect(Math.abs(pose.rotation)).toBeLessThanOrEqual(DANCE.lean);
      expect(Math.abs(pose.squashX - 1)).toBeLessThanOrEqual(DANCE.squash); expect(Math.abs(pose.squashY - 1)).toBeLessThanOrEqual(DANCE.squash);
    }
  });

  it('turns the hopping and twisting dancers from one side to the other', () => {
    const facings = (move: 'hop' | 'twist') => new Set(Array.from({length: 8}, (_, k) => dancePose(move, DANCE.firstBeatMs + (k + .5) * DANCE.beatMs).facing));
    expect(facings('hop')).toEqual(new Set([1, -1]));
    expect(facings('twist')).toEqual(new Set([1, -1]));
    expect(dancePose('sway', 1000).facing).toBeNull();
  });

  it('gives each rabbit a fixed move, and different rabbits different moves', () => {
    expect(danceMove('rabbit-12')).toBe(danceMove('rabbit-12'));
    expect(new Set(Array.from({length: 30}, (_, k) => danceMove(`rabbit-${k}`)))).toEqual(new Set(DANCE_MOVES));
  });

  it('only sways gently with reduced motion', () => {
    for (const move of DANCE_MOVES) for (let ms = 0; ms < 4000; ms += 53) {
      const pose = dancePose(move, ms, true);
      expect(pose).toMatchObject({lift: 0, squashX: 1, squashY: 1, facing: null});
      expect(Math.abs(pose.rotation)).toBeLessThan(DANCE.lean * .5);
    }
  });
});
