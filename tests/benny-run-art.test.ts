import {describe, expect, it} from 'vitest';
import {readFileSync, existsSync} from 'node:fs';
import RUN_ART from '../src/config/bennyRunArt.json';

/** « Cours cours Benny ! »: every painting the run's renderer asks for is in its atlas, and each atlas file is there. */
const source = readFileSync('src/ui/BennyRunActivity.ts', 'utf8');
const atlases = RUN_ART as Record<string, {image: string; size: number; frames: Record<string, number[]>}>;

describe('the run’s painted atlases', () => {
  it('has a file for every atlas, and every frame in it', () => {
    for (const [name, atlas] of Object.entries(atlases)) {
      expect(existsSync(`public/${atlas.image}`), name).toBe(true);
      expect(Object.keys(atlas.frames).length, name).toBeGreaterThan(0);
    }
  });
  it('holds every frame the renderer draws by name', () => {
    const asked = [...source.matchAll(/(?:paint|fitted)\(c, '([\w-]+)', '([\w-]+)'/g)].map(m => [m[1], m[2]]);
    expect(asked.length).toBeGreaterThan(10);
    for (const [name, frame] of asked) expect(atlases[name]?.frames[frame], `${name} ${frame}`).toBeDefined();
  });
  it('gives the chest its three states, all drawn at the shut chest’s size', () => {
    expect(Object.keys(atlases.chests.frames)).toEqual(['intact', 'knocked', 'broken']);
    const sizes = Object.values(atlases.chests.frames).map(f => f.slice(2).join());
    expect(new Set(sizes).size).toBe(1);
  });
});
