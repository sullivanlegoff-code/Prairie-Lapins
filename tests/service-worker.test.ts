import {describe, expect, it, vi} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';

/** Runs scripts/service-worker.js against a stand-in of the worker's global scope, as the published site serves it. */
function worker(revision: string) {
  const listeners: Record<string, (event: unknown) => void> = {}, stores = new Map<string, Map<string, Response>>();
  const caches = {
    keys: async () => [...stores.keys()], delete: async (key: string) => stores.delete(key),
    open: async (key: string) => { if (!stores.has(key)) stores.set(key, new Map()); const store = stores.get(key)!;
      return {match: async (r: Request) => store.get(r.url)?.clone(), put: async (r: Request, response: Response) => { store.set(r.url, response); }}; },
  };
  const network = vi.fn(async (r: Request) => Object.defineProperty(new Response('picture ' + r.url), 'type', {value: 'basic'}));
  const self = {registration: {scope: 'https://example.test/Prairie-Lapins/'}, skipWaiting: vi.fn(), clients: {claim: vi.fn(async () => {})},
    addEventListener: (type: string, listener: (event: unknown) => void) => { listeners[type] = listener; }};
  new Function('self', 'caches', 'fetch', readFileSync('scripts/service-worker.js', 'utf8').replaceAll('__REVISION__', revision))(self, caches, network);
  const fetchEvent = (url: string, headers: Record<string, string> = {}) => {
    let answer: Promise<Response> | null = null;
    listeners.fetch({request: new Request(url, {headers}), respondWith: (p: Promise<Response>) => { answer = p; }});
    return answer as Promise<Response> | null;
  };
  const activate = async () => { let done: Promise<unknown> = Promise.resolve(); listeners.activate({waitUntil: (p: Promise<unknown>) => { done = p; }}); await done; };
  return {fetchEvent, activate, network, stores};
}

describe('the published game keeps its pictures (plan 5.5)', () => {
  it('downloads a picture once per publication, then serves it from the cache', async () => {
    const w = worker('abc123'), url = 'https://example.test/Prairie-Lapins/assets/buildings/farm.webp';
    expect(await (await w.fetchEvent(url))!.text()).toBe('picture ' + url);
    expect(await (await w.fetchEvent(url))!.text()).toBe('picture ' + url);
    expect(w.network).toHaveBeenCalledTimes(1);
    expect([...w.stores.keys()]).toEqual(['prairie-lapins-abc123']);
  });
  it('leaves the pages, the music, the laboratory and other sites to the network', () => {
    const w = worker('abc123');
    for (const url of ['https://example.test/Prairie-Lapins/', 'https://example.test/Prairie-Lapins/index.html', 'https://example.test/Prairie-Lapins/dev/assets/index.js',
      'https://example.test/Prairie-Lapins/assets/audio/music/noel-1.mp3', 'https://project.supabase.co/rest/v1/saves', 'https://example.test/other/assets/x.webp'])
      expect([url, w.fetchEvent(url)]).toEqual([url, null]);
    expect(w.fetchEvent('https://example.test/Prairie-Lapins/assets/x.webp', {range: 'bytes=0-9'})).toBeNull();
  });
  it('a new publication starts from an empty cache and deletes the old one', async () => {
    const old = worker('old'), url = 'https://example.test/Prairie-Lapins/assets/rabbits/neige.webp';
    await old.fetchEvent(url);
    const next = worker('new'); for (const [key, value] of old.stores) next.stores.set(key, value);
    await next.activate();
    expect([...next.stores.keys()]).toEqual([]);
    await next.fetchEvent(url); expect(next.network).toHaveBeenCalledTimes(1); expect([...next.stores.keys()]).toEqual(['prairie-lapins-new']);
  });
});
