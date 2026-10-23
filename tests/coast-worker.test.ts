import {afterEach, describe, expect, it, vi} from 'vitest';
import type {CoastRequest, CoastResponse} from '../src/display/coastProtocol';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('coast worker protocol', () => {
  it('signals readiness and transfers every RGBA buffer, detaching sender ownership', async () => {
    const received: CoastResponse[] = [], detached: boolean[] = [];
    vi.stubGlobal('onmessage', null);
    vi.stubGlobal('postMessage', (message: CoastResponse, transfer: ArrayBuffer[] = []) => {
      received.push(structuredClone(message, {transfer}));
      if (message.type === 'result') detached.push(transfer.length === message.tiles.length && transfer.every(b => b.byteLength === 0));
    });
    await import('../src/display/coastWorker');
    const scope = globalThis as unknown as {onmessage(event: {data: CoastRequest}): void};
    expect(received).toEqual([{type: 'ready'}]);
    scope.onmessage({data: {type: 'generate', id: 8, ids: ['southwest']}});
    expect(detached).toEqual([true]);
    const result = received[1]; expect(result.type).toBe('result');
    if (result.type !== 'result') throw Error('Missing transferred result');
    expect(result.id).toBe(8); expect(result.tiles).toHaveLength(4);
    expect(result.tiles.reduce((n, t) => n + t.buffer.byteLength, 0)).toBe(1548288);
  });
  it('returns an identified job failure rather than throwing out of its message handler', async () => {
    const received: CoastResponse[] = []; vi.stubGlobal('onmessage', null);
    vi.stubGlobal('postMessage', (message: CoastResponse) => received.push(message));
    await import('../src/display/coastWorker');
    const scope = globalThis as unknown as {onmessage(event: {data: unknown}): void};
    expect(() => scope.onmessage({data: {type: 'generate', id: 9, ids: null}})).not.toThrow();
    expect(received[1]).toMatchObject({type: 'failure', id: 9});
  });
});
