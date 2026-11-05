// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {SPECIES_IDS, type SpeciesId} from '../src/config/species';
import {RABBIT_STORIES} from '../src/config/rabbitStories';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame} from '../src/state/initial';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(f => f()); vi.unstubAllGlobals(); });

function mount(species: SpeciesId) {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('loading-screen')!.hidden = true; document.getElementById('app')!.inert = false;
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  const s = createGame(0);
  if (!s.rabbits.some(r => r.species === species)) s.rabbits[0].species = species as never;
  if (!s.discovered.includes(species as never)) s.discovered.push(species as never);
  const data = new Map([[SAVE_KEY, encodeGame(s)]]);
  const c = new GameController({getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }}, () => 0);
  const prefs = new PreferenceStore(`test-stories-${species}`); prefs.set({tutorial: false});
  const scene = {setRabbitPurchase: vi.fn(), setPlacement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), setArrangement: vi.fn(), setExpansion: vi.fn(),
    setDecorationGhost: vi.fn(), setDecorationPlacement: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const ui = new GameUI(c, scene, () => 0, prefs); cleanup.push(() => { ui.dispose(); c.dispose(); });
  return {ui, rabbit: c.getSnapshot().state!.rabbits.find(r => r.species === species)!};
}

describe('the rabbits’ descriptions (owner, 5 November 2026)', () => {
  it('belong to real species, address the player with « tu » and are not empty', () => {
    for (const [id, story] of Object.entries(RABBIT_STORIES)) {
      expect(SPECIES_IDS).toContain(id);
      expect(story!.trim().length).toBeGreaterThan(10);
      expect(story).not.toMatch(/\b(vous|votre|vos)\b/i);
    }
    // The ones the owner will write himself are left out for now.
    expect(RABBIT_STORIES.bouee).toBeUndefined();
  });

  it('keeps Tunini’s description in Arabic, without any translation', () => {
    expect(RABBIT_STORIES.tunini).toMatch(/^[؀-ۿ\s.]+$/);
  });

  it('shows the description on the rabbit’s sheet, and never in the collection', () => {
    const {ui, rabbit} = mount('paille');
    ui.open({kind: 'rabbit', id: rabbit.id});
    const story = document.querySelector<HTMLElement>('[data-rabbit-story="paille"]');
    expect(story?.textContent).toBe(RABBIT_STORIES.paille);
    ui.open({kind: 'collection'});
    expect(document.getElementById('panel-content')!.textContent).not.toContain(RABBIT_STORIES.paille!);
  });

  it('lets the browser lay out each description in its own direction (Tunini’s Arabic right to left)', () => {
    const {ui, rabbit} = mount('paille');
    ui.open({kind: 'rabbit', id: rabbit.id});
    expect(document.querySelector<HTMLElement>('[data-rabbit-story="paille"]')!.dir).toBe('auto');
  });
});
