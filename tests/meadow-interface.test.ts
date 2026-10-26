// @vitest-environment happy-dom
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
vi.mock('../src/display/currencyPhaser', () => ({coinBubble: vi.fn(() => ({width: 60, height: 30})), foodBubble: vi.fn()}));
import {MeadowScene} from '../src/display/MeadowScene';
import {shouldShowIncomeBubble} from '../src/display/incomeBubble';
import {coinBubble} from '../src/display/currencyPhaser';
import {createGame} from '../src/state/initial';
import {HOUR, type BuildingKind} from '../src/config/balance';

describe('habitat income reminders', () => {
  it.each([[199, 500, false], [200, 500, true], [99, 100, false], [100, 100, true], [0, 100, false]])('stock %s, cap %s: visible=%s', (amount, cap, visible) => {
    expect(shouldShowIncomeBubble(amount, cap)).toBe(visible);
  });
  it.each([199, 200])('uses the threshold in the rendered scene at %s pattes', amount => {
    const scene = new MeadowScene({} as never, () => {}, () => false) as any;
    scene.current = createGame(0); scene.current.buildings[0].incomeUnits = amount * HOUR;
    scene.bubbles = {removeAll: vi.fn(), add: vi.fn()};
    vi.mocked(coinBubble).mockClear();
    scene.drawBubbles();
    expect(coinBubble).toHaveBeenCalledTimes(amount === 200 ? 1 : 0);
    expect(scene.bubbleHits).toHaveLength(amount === 200 ? 1 : 0);
  });
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
