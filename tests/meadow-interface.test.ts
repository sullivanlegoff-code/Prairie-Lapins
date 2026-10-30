// @vitest-environment happy-dom
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
vi.mock('../src/display/currencyPhaser', () => ({coinBubble: vi.fn(() => ({width: 60, height: 30})), foodBubble: vi.fn()}));
import {MeadowScene} from '../src/display/MeadowScene';
import {shouldShowIncomeBubble} from '../src/display/incomeBubble';
import {coinBubble} from '../src/display/currencyPhaser';
import {createGame, emptyBuilding} from '../src/state/initial';
import {HOUR, type BuildingKind} from '../src/config/balance';

describe('habitat income reminders', () => {
  it.each([[199, 500, false], [200, 500, true], [99, 100, false], [100, 100, true], [0, 100, false]])('stock %s, cap %s: visible=%s', (amount, cap, visible) => {
    expect(shouldShowIncomeBubble(amount, cap)).toBe(visible);
  });
  it.each([199, 200])('uses the threshold in the rendered scene at %s pattes', amount => {
    const scene = new MeadowScene({} as never, () => {}, () => false) as any;
    scene.time = {now: 0};
    scene.current = createGame(0); scene.current.buildings[0].incomeUnits = amount * HOUR;
    // Level 2 has room above 200: this case exercises the reminder threshold, not a full level-1 stock.
    scene.current.buildings[0].habitat!.level = 2;
    scene.bubbles = {removeAll: vi.fn(), add: vi.fn()};
    vi.mocked(coinBubble).mockClear();
    scene.drawBubbles();
    expect(coinBubble).toHaveBeenCalledTimes(amount === 200 ? 1 : 0);
    expect(scene.bubbleHits).toHaveLength(amount === 200 ? 1 : 0);
  });
});

it('interpolates progress from simulation time and keeps the ready bubble on subsequent redraws', () => {
  const scene = new MeadowScene({} as never, () => {}, () => false) as any;
  scene.time = {now: 0}; scene.current = createGame(100);
  const nest = emptyBuilding('nest-clock', 'nest', 0, 0);
  nest.breeding = {parents: ['a', 'b'], startedAt: 100, endsAt: 200,
    birth: {id: 'birth-clock', species: 'paille', guaranteed: false, reservedDiscovery: false}};
  scene.current.buildings = [nest]; scene.progressNow = 100;
  scene.progressViews = {sync: vi.fn()};
  scene.bubbles = {removeAll: vi.fn(), add: vi.fn()};
  scene.heartBubble = vi.fn(() => ({width: 30, height: 30}));
  scene.time.now = 50; scene.syncProgressBars();
  expect(scene.progressViews.sync.mock.lastCall[0][0].fraction).toBe(.5);
  expect(scene.heartBubble).not.toHaveBeenCalled();
  scene.time.now = 100; scene.syncProgressBars();
  expect(scene.progressViews.sync.mock.lastCall[0]).toEqual([]);
  expect(scene.heartBubble).toHaveBeenCalledTimes(1);
  scene.drawBubbles();
  expect(scene.heartBubble).toHaveBeenCalledTimes(2);
  expect(scene.bubbleHits).toHaveLength(1);
});

it('draws habitats and every building kind without drawing their names on the island', () => {
  const scene = new MeadowScene({} as never, () => {}, () => false) as any;
  scene.current = createGame(0);
  scene.current.buildings = (['enclosure', 'farm', 'kitchen', 'statue', 'agency', 'nest', 'nursery'] satisfies BuildingKind[])
    .map((kind, i) => ({...scene.current.buildings[0], id: `building-${i}`, kind}));
  const image = {setTexture: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis()};
  scene.add = {image: vi.fn(() => image), text: vi.fn(), graphics: vi.fn(), container: vi.fn()};
  scene.buildingsLayer = {add: vi.fn(), sort: vi.fn()};
  scene.buildingTexture = () => 'building'; scene.positionBuildingArt = vi.fn();
  scene.drawBuildings();
  expect(scene.add.image).toHaveBeenCalledTimes(7);
  expect(scene.add.text).not.toHaveBeenCalled();
  expect(scene.add.graphics).not.toHaveBeenCalled();
  expect(scene.add.container).not.toHaveBeenCalled();
});
