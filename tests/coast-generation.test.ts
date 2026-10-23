import {describe, expect, it, vi} from 'vitest';
import {CoastGeneration} from '../src/display/coastGeneration';
import type {CoastRequest, CoastResult} from '../src/display/coastProtocol';

const result = (id: number): CoastResult => ({type: 'result', id, tiles: [],
  data: {rects: [], runs: [], layers: {earth: [], grass: [], lip: [], sand: [], foam: [], water: [], shallows: [], soilBand: [], soilHighlight: []}, accents: [], strata: []},
  stats: {preparationMs: 1, pixelMs: 2, workerMs: 3, rgbaBytes: 0, scratchBytes: 0}});
function setup() {
  const sent: CoastRequest[] = [], commit = vi.fn(() => ({mainMs: 1, registrationMs: .2})), ownership = vi.fn(), stop = vi.fn();
  const generation = new CoastGeneration({send: r => sent.push(r), commit, ownership, stop});
  return {generation, sent, commit, ownership, stop};
}

describe('coast worker ownership lifecycle', () => {
  it('keeps the initial scene valid and coalesces ownership requests while the worker starts', () => {
    const {generation: g, sent, ownership} = setup();
    g.request(['southwest']); g.request(['southwest', 'west']);
    expect(ownership).toHaveBeenCalledTimes(2); expect(g.visible).toBe(0); expect(sent).toEqual([]);
    g.receive({type: 'ready'});
    expect(sent).toEqual([{type: 'generate', id: 2, ids: ['southwest', 'west']}]);
  });
  it('canonicalizes ownership, never rebuilding on order changes or repeated redraws', () => {
    const {generation: g, sent} = setup(); g.receive({type: 'ready'});
    g.request(['west', 'southwest']); g.receive(result(1));
    for (let i = 0; i < 50; i++) g.request(['southwest', 'west']);
    g.request(['west', 'southwest', 'west']);
    expect(sent).toHaveLength(1); expect(g.latest).toBe(1); expect(g.visible).toBe(1);
  });
  it('leaves the previous coast visible and rejects stale results; only the latest queued ownership wins', () => {
    const {generation: g, sent, commit} = setup(); g.receive({type: 'ready'});
    g.request(['southwest']); g.receive(result(1));
    g.request(['southwest', 'west']); g.request(['southwest', 'west', 'south']); g.request(['southwest', 'west', 'south', 'center']);
    expect(g.visible).toBe(1); expect(sent).toHaveLength(2);
    g.receive(result(2));
    expect(g.visible).toBe(1); expect(commit).toHaveBeenCalledTimes(1);
    expect(g.jobs.find(j => j.id === 2)?.discarded).toBe(true);
    expect(sent.map(r => r.id)).toEqual([1, 2, 4]);
    g.receive(result(4)); expect(g.visible).toBe(4); expect(commit).toHaveBeenCalledTimes(2);
  });
  it('does not rebuild for non-ownership changes in scene snapshots', () => {
    const {generation: g, sent} = setup(); g.receive({type: 'ready'});
    const snapshot = {ids: ['southwest'] as const, pan: 0, zoom: 1, placement: 0, building: 0, rabbit: 0, enclosure: 0};
    g.request(snapshot.ids); g.receive(result(1));
    for (const field of ['pan', 'zoom', 'placement', 'building', 'rabbit', 'enclosure'] as const) {
      snapshot[field]++; g.request(snapshot.ids);
    }
    expect(sent).toHaveLength(1);
    g.request(['southwest', 'south']); expect(sent).toHaveLength(2);
  });
  it('ignores duplicate or unexpected messages without losing the active job', () => {
    const {generation: g, sent, commit} = setup(); g.receive({type: 'ready'}); g.request(['southwest']);
    g.receive(result(99)); expect(g.busy).toBe(true); expect(commit).not.toHaveBeenCalled();
    g.receive(result(1)); g.receive(result(1)); expect(commit).toHaveBeenCalledTimes(1); expect(sent).toHaveLength(1);
  });
  it('handles worker job failure without changing the valid coast and processes the newer request', () => {
    const {generation: g, commit, sent} = setup(); g.receive({type: 'ready'}); g.request(['southwest']); g.receive(result(1));
    g.request(['southwest', 'west']); g.request(['southwest', 'west', 'south']);
    g.receive({type: 'failure', id: 2, message: 'allocation failed'});
    expect(g.visible).toBe(1); expect(commit).toHaveBeenCalledTimes(1); expect(sent.at(-1)?.id).toBe(3);
    g.receive(result(3)); expect(g.visible).toBe(3); expect(g.error).toBeNull();
  });
  it('keeps the previous generation if registering a complete replacement fails', () => {
    const {generation: g, commit} = setup(); g.receive({type: 'ready'}); g.request(['southwest']); g.receive(result(1));
    commit.mockImplementationOnce(() => { throw Error('texture registration failed'); });
    g.request(['southwest', 'west']); g.receive(result(2));
    expect(g.visible).toBe(1); expect(g.error).toContain('texture registration failed'); expect(g.busy).toBe(false);
  });
  it('handles fatal worker/startup/transport failure without blanking the current coast', () => {
    const {generation: g} = setup(); g.receive({type: 'ready'}); g.request(['southwest']); g.receive(result(1));
    g.request(['southwest', 'west']); g.request(['southwest', 'south']); g.fail('worker unavailable');
    expect(g.visible).toBe(1); expect(g.busy).toBe(false); expect(g.error).toBe('worker unavailable');
    g.receive(result(2)); expect(g.visible).toBe(1);
    const boot = setup(); boot.generation.fail('startup denied'); boot.generation.request(['southwest']);
    expect(boot.sent).toEqual([]); expect(boot.generation.visible).toBe(0);
  });
  it('catches postMessage failures and terminates exactly once on scene disposal', () => {
    const stop = vi.fn(), g = new CoastGeneration({ownership() {}, commit: () => ({mainMs: 0, registrationMs: 0}),
      send: () => { throw Error('worker closed'); }, stop});
    g.receive({type: 'ready'}); expect(() => g.request(['southwest'])).not.toThrow();
    expect(g.error).toContain('worker closed'); g.destroy(); g.destroy();
    g.request(['center']); g.receive(result(1)); expect(stop).toHaveBeenCalledTimes(1); expect(g.visible).toBe(0);
  });
});
