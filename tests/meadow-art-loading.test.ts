// @vitest-environment happy-dom
import {expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
import {MeadowScene} from '../src/display/MeadowScene';
import {mountArtStatus} from '../src/display/artStatus';
import {createGame, emptyBuilding} from '../src/state/initial';
import {KITCHEN_ART} from '../src/config/kitchenArt';
import {FARM_ART, FARM_LEVEL_1_ART} from '../src/config/farmArt';
import {NURSERY_ART, NURSERY_OVERLAY_ART} from '../src/config/nurseryArt';
import {decorationTexture} from '../src/display/decorationArt';

function scene() { return new MeadowScene({} as never, () => {}, () => false) as any; }

it('requests owned buildings, farm/nursery dependencies and active previews only', () => {
  const s = scene(), state = createGame(0);
  state.buildings = [emptyBuilding('farm', 'farm', 0, 0)]; state.rabbits = [];
  state.decorations = [{id: 'stored', catalogId: 'tree', location: {kind: 'inventory'}},
    {id: 'placed', catalogId: 'bush', location: {kind: 'outside', x: 0, y: 0, rotation: 1}}];
  let keys = s.requiredArt(state).map((a: any) => a.texture);
  expect(keys).toContain(FARM_LEVEL_1_ART.texture); expect(keys).not.toContain(FARM_ART.texture);
  expect(keys).not.toContain(KITCHEN_ART.texture); expect(keys).not.toContain(decorationTexture('tree'));
  expect(keys).toContain(decorationTexture('bush', 1));
  s.placement = {kind: 'nursery', cell: null}; s.ghost = {id: 'stored', location: {kind: 'outside', x: 1, y: 1, rotation: 0}};
  keys = s.requiredArt(state).map((a: any) => a.texture);
  expect(keys).toContain(NURSERY_ART.texture); expect(keys).toContain(NURSERY_OVERLAY_ART.baby.texture);
  expect(keys).toContain(decorationTexture('tree')); expect(keys).not.toContain(KITCHEN_ART.texture);
});

it('keeps state after partial failure, waits for explicit retry and requests only missing pictures', () => {
  const s = scene(), state = createGame(0), loaded = new Set<string>();
  s.current = state; s.sceneReady = true; s.lifeGeneration = 1;
  s.requiredArt = () => [{texture: 'a', url: 'a.png'}, {texture: 'b', url: 'b.png'}];
  s.textures = {exists: (key: string) => loaded.has(key)};
  let complete = () => {};
  s.load = {image: vi.fn(), once: (_: string, next: () => void) => { complete = next; }, start: vi.fn()};
  s.loading = {runtime: vi.fn()};
  s.renderState = vi.fn(() => s.ensureArt());
  expect(s.ensureArt()).toBe(false); loaded.add('a'); complete();
  expect(s.loading.runtime.mock.lastCall[0]).toBe('failed');
  for (let i = 0; i < 10; i++) s.ensureArt();
  expect(s.load.start).toHaveBeenCalledTimes(1); expect(s.current).toBe(state);
  const retry = s.loading.runtime.mock.lastCall[1]; s.load.image.mockClear(); retry();
  expect(s.load.image.mock.calls).toEqual([['b', 'b.png']]);
  loaded.add('b'); complete();
  expect(s.loading.runtime.mock.lastCall[0]).toBe('ready'); expect(s.current).toBe(state);
});

it('does not attach a failed old batch to a replacement game or render after shutdown', () => {
  const s = scene(); s.sceneReady = true; s.lifeGeneration = 1;
  s.requiredArt = () => [{texture: 'a', url: 'a.png'}]; s.textures = {exists: () => false};
  let complete = () => {};
  s.load = {image: vi.fn(), once: (_: string, next: () => void) => { complete = next; }, start: vi.fn()};
  s.renderState = vi.fn(); s.ensureArt(); s.lifeGeneration = 2; complete();
  expect(s.failedArt.size).toBe(0); expect(s.renderState).toHaveBeenCalledTimes(1);
  s.ensureArt(); s.sceneReady = false; complete(); expect(s.renderState).toHaveBeenCalledTimes(1);
});

it('shows a polite in-game explanation and a targeted retry button, then clears it', () => {
  const status = mountArtStatus(document.body), retry = vi.fn();
  status.update('loading', retry);
  const root = document.getElementById('meadow-art-status')!;
  expect(root.hidden).toBe(false); expect(root.querySelector('button')!.hidden).toBe(true);
  status.update('failed', retry); root.querySelector('button')!.click(); expect(retry).toHaveBeenCalledOnce();
  expect(root.querySelector('[role=status]')!.textContent).toContain('Ta partie est conservée');
  status.update('ready', retry); expect(root.hidden).toBe(true); status.dispose(); expect(root.isConnected).toBe(false);
});
