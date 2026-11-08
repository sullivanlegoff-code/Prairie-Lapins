import {describe, expect, it} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {execFileSync} from 'node:child_process';
import twins from '../src/config/webpTwins.json';
import {installWebpTwins, preferWebp} from '../src/display/webpTwins';

// Audit before the Christmas update (8 November 2026): the meadow loads light WebP twins of its PNG pictures.
describe('WebP twins of the PNG pictures', () => {
  it('every twin is made from the PNG that is there now', () => {
    expect(twins.length).toBeGreaterThan(500);
    expect(() => execFileSync('node', ['scripts/verify-webp-twins.mjs'], {encoding: 'utf8'})).not.toThrow();
  });

  it('asks for the twin of a listed picture and leaves any other URL as it is', () => {
    expect(preferWebp('/Prairie-Lapins/assets/noel/marche.png', '/Prairie-Lapins/')).toBe('/Prairie-Lapins/assets/noel/marche.webp');
    expect(preferWebp('/assets/noel/marche.png', '/')).toBe('/assets/noel/marche.webp');
    expect(preferWebp('/assets/rabbits/piment/piment-nose-twitch.png', '/')).toBe('/assets/rabbits/piment/piment-nose-twitch.png');
    expect(preferWebp('/assets/loading/noel-jour.webp', '/')).toBe('/assets/loading/noel-jour.webp');
    expect(preferWebp('data:image/png;base64,AAAA.png', '/')).toBe('data:image/png;base64,AAAA.png');
    expect(preferWebp('assets/rabbits/ardent/ardent-frame-1.png', '/Prairie-Lapins/')).toBe('assets/rabbits/ardent/ardent-frame-1.webp');
    expect(preferWebp('/elsewhere/assets/noel/marche.png', '/Prairie-Lapins/')).toBe('/elsewhere/assets/noel/marche.png');
    expect(preferWebp('https://example.com/assets/noel/marche.png', '/')).toBe('https://example.com/assets/noel/marche.png');
  });

  it('makes every image file queued by the loader ask for its twin', () => {
    const added: unknown[] = [];
    const loader = {addFile(file: unknown) { added.push(file); }};
    installWebpTwins(loader);
    const image = {type: 'image', url: '/assets/noel/marche.png'}, json = {type: 'json', url: '/assets/a.png'};
    loader.addFile([image, json]); loader.addFile({type: 'image', url: '/assets/rabbits/piment/piment-nose-twitch.png'});
    expect(added).toEqual([[{type: 'image', url: '/assets/noel/marche.webp'}, {type: 'json', url: '/assets/a.png'}], {type: 'image', url: '/assets/rabbits/piment/piment-nose-twitch.png'}]);
  });
});
