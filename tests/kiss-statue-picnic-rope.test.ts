// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {KISS_PECKS, KISS_RUB_END, kissPose} from '../src/display/rabbitMotion';
import {STATUE_2_ART, STATUE_ART, statueArtFor} from '../src/config/statueArt';
import {PICNIC_ART} from '../src/config/salonArt';
import {JUMP_ROPE_PIECES} from '../src/config/jumpRopeArt';

/** Width and height of a served PNG, read from its header. */
const size = (url: string) => { const file = readFileSync(`public/${url.replace(/^\//, '')}`); return {width: file.readUInt32BE(16), height: file.readUInt32BE(20)}; };

describe('the kiss (owner, 4 November 2026)', () => {
  it('rubs noses first, then gives three little kisses tilting the head, upright at both ends', () => {
    expect(kissPose(0)).toEqual({lift: 0, squashX: 1, squashY: 1, rotation: 0, nuzzle: 0});
    expect(kissPose(1)).toEqual({lift: 0, squashX: 1, squashY: 1, rotation: 0, nuzzle: 0});
    // During the rub the head stays almost straight; at each peck it tilts much more.
    const rubTilt = Math.max(...Array.from({length: 30}, (_, i) => kissPose(.13 + i * (KISS_RUB_END - .14) / 30).rotation));
    for (const at of KISS_PECKS) expect(kissPose(at).rotation).toBeGreaterThan(rubTilt * 2);
    // Between two pecks the head comes back up.
    expect(kissPose((KISS_PECKS[0] + KISS_PECKS[1]) / 2).rotation).toBeLessThan(kissPose(KISS_PECKS[0]).rotation / 2);
    for (let u = .01; u < 1; u += .01) { const pose = kissPose(u); expect(pose.nuzzle).toBeLessThanOrEqual(3); expect(pose.lift).toBeLessThanOrEqual(.5); }
  });
});

describe('the second Statue de l’Affection', () => {
  it('has its own drawing for the second statue built, and for the one about to be placed after the first', () => {
    const one = [{id: 'building-5', kind: 'statue' as const}], two = [...one, {id: 'building-9', kind: 'statue' as const}];
    expect(statueArtFor([])).toBe(STATUE_ART);
    expect(statueArtFor(one)).toBe(STATUE_2_ART);
    expect(statueArtFor(one, 'building-5')).toBe(STATUE_ART);
    expect(statueArtFor(two, 'building-9')).toBe(STATUE_2_ART);
    expect(size(STATUE_2_ART.url)).toEqual({width: STATUE_2_ART.width, height: STATUE_2_ART.height});
  });
});

describe('the picnic cloth and the painted rope', () => {
  it('serve pictures of the declared sizes', () => {
    expect(size(PICNIC_ART.url)).toEqual({width: PICNIC_ART.width, height: PICNIC_ART.height});
    expect(size(JUMP_ROPE_PIECES.tile.url)).toEqual({width: JUMP_ROPE_PIECES.tile.width, height: JUMP_ROPE_PIECES.tile.height});
    expect(size(JUMP_ROPE_PIECES.handle.url)).toEqual({width: JUMP_ROPE_PIECES.handle.width, height: JUMP_ROPE_PIECES.handle.height});
  });
});
