import {describe, expect, it} from 'vitest';
import {HABITAT_TYPES, type HabitatLevel, type HabitatType} from '../src/config/habitats';
import {HABITAT_SIZE_PROPOSAL, habitatProposalGround, habitatProposalWorldSize} from '../src/config/habitatSizes';
import {drawHabitat} from '../src/display/habitatArt';

/** A stand-in for Phaser's Graphics that records every drawing call, so the exact drawing can be compared. */
function recordDrawing(draw: (g: never) => void): string[] {
  const calls: string[] = [];
  const g = new Proxy({}, {get: (_target, name) => (...args: unknown[]) => { calls.push(`${String(name)}(${args.map(a => typeof a === 'number' ? Math.round(a * 1e6) / 1e6 : String(a)).join(',')})`); return g; }});
  draw(g as never); return calls;
}
async function digest(calls: string[]): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(calls.join('\n')));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
/** Digests of the drawing as it was before the size proposal existed (captured from the production code of 6f351ef). */
const PRODUCTION_DIGESTS: Record<string, string> = {"universal-1":"0584235c57cbb14f","universal-2":"d5185344c43e95ac","universal-3":"29d8f98b6e421f18","paille-1":"6a7d773c6fea3f38","paille-2":"38897c5b53289a18","paille-3":"99bb2bed5b39c3d7","neige-1":"c949cef8131fe75d","neige-2":"79f05aee3cfcddac","neige-3":"6ca04f50edac5fed","terre-1":"dc5a6e7c396d8009","terre-2":"c0d9841c86ff67ce","terre-3":"a969474c101b94ab","feu-1":"b4e1ba75a43d2c98","feu-2":"6596c5aa0f90d381","feu-3":"2e7c63ef49a6fb5d","metal-1":"0d78c8dfb4548747","metal-2":"a4e8a171200eaac3","metal-3":"aa266483cbea76c0","vol-1":"db901a98b6b20b5f","vol-2":"bec84a8a60e0ca15","vol-3":"155906ebc1abec86"};
const levels: HabitatLevel[] = [1, 2, 3];

describe('enclosure drawing', () => {
  it('draws exactly the production artwork when no growth is given, for every type and level', async () => {
    for (const type of HABITAT_TYPES) for (const level of levels) {
      expect(await digest(recordDrawing(g => drawHabitat(g, 128, 128, type as HabitatType, level))), `${type}-${level}`).toBe(PRODUCTION_DIGESTS[`${type}-${level}`]);
    }
  });

  it('draws level 1 of the proposal exactly like the production artwork', async () => {
    for (const type of HABITAT_TYPES) expect(await digest(recordDrawing(g => drawHabitat(g, 128, 128, type, 1, HABITAT_SIZE_PROPOSAL[1].growth)))).toBe(PRODUCTION_DIGESTS[`${type}-1`]);
  });

  it.each([2, 3] as const)('level %i grows the ground by the proposed size, for every type, with distinct drawings', async level => {
    const ground = habitatProposalGround(level), seen = new Set<string>();
    for (const type of HABITAT_TYPES) {
      const calls = recordDrawing(g => drawHabitat(g, 0, 0, type, level, HABITAT_SIZE_PROPOSAL[level].growth));
      // The ground is the 4th rectangle drawn (shadow, fence bed, ground): its width and depth are the proposal's.
      const rect = calls.filter(call => call.startsWith('fillRoundedRect('))[1].slice('fillRoundedRect('.length, -1).split(',').map(Number);
      expect([rect[2], rect[3]]).toEqual([ground.width, ground.depth]);
      expect(rect[0]).toBe(-ground.width / 2);
      seen.add(await digest(calls));
      expect(await digest(calls)).not.toBe(PRODUCTION_DIGESTS[`${type}-${level}`]);
    }
    expect(seen.size).toBe(HABITAT_TYPES.length);
  });

  it('proposes footprints that grow with the level and hold their drawing, with the logical 4 × 4 kept at level 1', () => {
    expect(habitatProposalWorldSize(1)).toEqual({width: 176, depth: 148}); expect(HABITAT_SIZE_PROPOSAL[1].footprint).toEqual({width: 4, depth: 4});
    expect(HABITAT_SIZE_PROPOSAL[1].growth).toEqual({x: 0, top: 0, bottom: 0});
    let previous = habitatProposalWorldSize(1);
    for (const level of [2, 3] as const) {
      const size = habitatProposalWorldSize(level), ground = habitatProposalGround(level), growth = HABITAT_SIZE_PROPOSAL[level].growth;
      expect(size.width).toBeGreaterThan(previous.width); expect(size.depth).toBeGreaterThan(previous.depth);
      // The fence bed (164 wide at level 1) and the tallest corner pieces (68 above and below the centre) stay inside the footprint.
      expect(164 + 2 * growth.x).toBeLessThanOrEqual(size.width); expect(136 + growth.top + growth.bottom).toBeLessThanOrEqual(size.depth); void ground;
      previous = size;
    }
    // The visibly distinct sizes: level 3 is clearly larger than level 2, which is clearly larger than the current one.
    expect(habitatProposalGround(2).width / habitatProposalGround(1).width).toBeGreaterThanOrEqual(1.5);
    expect(habitatProposalGround(3).width / habitatProposalGround(2).width).toBeGreaterThanOrEqual(1.3);
  });
});
