import {describe, expect, it} from 'vitest';
import source from '../src/ui/BennyRunActivity.ts?raw';
import RUN_ART from '../src/config/bennyRunArt.json';

/** « Cours cours Benny ! »: every painting the run's renderer asks for is in its atlas, and each atlas file is there. */
const files = Object.keys(import.meta.glob('../public/assets/benny-run/*.webp')).map(path => path.replace('../public/', ''));
const atlases = RUN_ART as Record<string, {image: string; size: number; frames: Record<string, number[]>}>;

describe('the run’s painted atlases', () => {
  it('has a file for every atlas, and every frame in it', () => {
    for (const [name, atlas] of Object.entries(atlases)) {
      expect(files, name).toContain(atlas.image);
      expect(Object.keys(atlas.frames).length, name).toBeGreaterThan(0);
    }
  });
  it('holds every frame the renderer draws by name', () => {
    const asked = [...source.matchAll(/(?:paint|fitted)\(c, '([\w-]+)', '([\w-]+)'/g)].map(m => [m[1], m[2]]);
    expect(asked.length).toBeGreaterThan(8);
    for (const [name, frame] of asked) expect(atlases[name]?.frames[frame], `${name} ${frame}`).toBeDefined();
  });
  it('gives the chest its states (and its damaged look after a first blow), all drawn at the shut chest’s size', () => {
    expect(Object.keys(atlases.chests.frames)).toEqual(['intact', 'knocked', 'broken', 'damaged']);
    const sizes = Object.values(atlases.chests.frames).map(f => f.slice(2).join());
    expect(new Set(sizes).size).toBe(1);
  });
  it('gives each creature a picture for the moment it is struck', () => {
    for (const frame of ['dragonnet-hit', 'ember-smoke', 'flyer-hit', 'dragonnet-awake']) expect(atlases.creatures.frames[frame], frame).toBeDefined();
    expect(source).toContain("vanishing !== null ? 'flyer-hit'");
  });
  it('paints the track with its five textures and the sky in WebP, all light', () => {
    for (const name of ['decor-planches', 'decor-herbe', 'decor-mur-terre', 'decor-mur-pierre', 'decor-mur-racines', 'decor-falaise', 'decor-lianes', 'decor-touffes', 'decor-dalles', 'decor-dalles-lave', 'decor-dalles-neige', 'decor-bord', 'fond-ciel']) {
      expect(files, name).toContain(`assets/benny-run/${name}.webp`);
      expect(source).toContain(name.startsWith('decor') ? `'${name}'` : `${name}.webp`);
    }
  });
});
