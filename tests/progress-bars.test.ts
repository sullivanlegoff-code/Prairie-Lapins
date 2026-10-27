import {describe, expect, it, vi} from 'vitest';
import type Phaser from 'phaser';
import {createGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {progressBars, progressFraction} from '../src/display/progressBars';
import {ProgressBarViews} from '../src/display/progressBarViews';
import {BASE_PIXEL, baseToWorld, slotPlacement} from '../src/display/nurseryOverlayModel';
import {NURSERY_OVERLAY_ART, NURSERY_ROW_SCALE, NURSERY_SLOT_ANCHORS} from '../src/config/nurseryArt';
import {NEST_ART} from '../src/config/nestArt';
import {FARM_ART} from '../src/config/farmArt';
import {buildingCenter} from '../src/ui/gestures';
import {toScreen} from '../src/ui/projection';
import type {NurseryBaby, NurserySlot} from '../src/state/types';

const birth = {id: 'birth-test', species: 'paille', guaranteed: false, reservedDiscovery: false} as const;
const baby = (slot: NurserySlot, readyAt = 200): NurseryBaby => ({slot, birth: {...birth, id: `birth-${slot}`}, startedAt: 100, readyAt});
const state = () => ({...createGame(100), lastSimulatedAt: 150, buildings: [] as ReturnType<typeof createGame>['buildings']});

describe('progress fraction', () => {
  it.each([[100, 0], [150, .5], [200, 1], [0, 0], [300, 1]])('at %i clamps to %f', (now, expected) => {
    expect(progressFraction(now, 100, 200)).toBe(expected);
  });
  it('handles zero and negative durations without NaN', () => {
    expect(progressFraction(99, 100, 100)).toBe(0);
    expect(progressFraction(100, 100, 100)).toBe(1);
    expect(progressFraction(150, 200, 100)).toBe(1);
  });
});

describe('bars from canonical jobs', () => {
  it('nest: one bar during breeding, none at the exact end even if transfer is pending', () => {
    const s = state(), b = emptyBuilding('nest-test', 'nest', 0, 0);
    b.breeding = {parents: ['a', 'b'], startedAt: 100, endsAt: 200, birth}; s.buildings = [b];
    const c = toScreen(buildingCenter(b));
    expect(progressBars(s)).toEqual([{key: 'nest-test:breeding', buildingId: b.id,
      ...NEST_ART.progress, x: c.x, y: c.y + NEST_ART.progress.y, fraction: .5}]);
    expect(progressBars(s, {}, 100)[0].fraction).toBe(0);
    expect(progressBars(s, {}, 200)).toEqual([]);
    b.breeding = null; expect(progressBars(s)).toEqual([]);
  });
  it('farm: uses the real saved start/end, including accelerated jobs, and hides when ripe', () => {
    const s = state(), b = emptyBuilding('farm-test', 'farm', 0, 0);
    b.order = {recipe: 'foin', startedAt: 100, endsAt: 200}; s.buildings = [b];
    expect(progressBars(s)).toHaveLength(1);
    expect(progressBars(s)[0]).toMatchObject({fraction: .5, width: FARM_ART.progress.width});
    expect(progressBars(s, {}, 200)).toEqual([]);
    b.order = null; expect(progressBars(s)).toEqual([]);
  });
  it('nursery: two growing babies follow their own persistent cushions, including the back row', () => {
    const s = state(), b = emptyBuilding('nursery-test', 'nursery', 0, 0);
    b.nursery = {capacity: 4, babies: [baby(3), baby(0)]}; s.buildings = [b];
    const bars = progressBars(s), c = toScreen(buildingCenter(b));
    expect(bars).toHaveLength(2);
    for (const [i, slot] of ([0, 3] as const).entries()) {
      const anchor = NURSERY_SLOT_ANCHORS[slot], row = NURSERY_ROW_SCALE[anchor.row], art = NURSERY_OVERLAY_ART.progress;
      const p = baseToWorld(anchor.x, anchor.y + art.dy * row);
      expect(bars[i]).toMatchObject({key: `${b.id}:cushion-${slot}`, fraction: .5});
      expect(bars[i].x).toBeCloseTo(c.x + slotPlacement(slot).baby.x);
      expect(bars[i].y).toBeCloseTo(c.y + p.y);
      expect(bars[i].y - bars[i].height / 2).toBeGreaterThan(c.y + slotPlacement(slot).baby.y);
      expect(bars[i].width).toBeCloseTo(art.width * row * BASE_PIXEL);
    }
    b.nursery.babies[0].readyAt = 150;
    expect(progressBars(s).map(bar => bar.key)).toEqual([`${b.id}:cushion-0`]);
    expect(progressBars(s, {}, 200)).toEqual([]);
  });
  it('hides for photos and the moved building; new placement previews never acquire bars', () => {
    const s = state(), a = emptyBuilding('a', 'farm', 0, 0), b = emptyBuilding('b', 'nest', 4, 0);
    a.order = {recipe: 'foin', startedAt: 100, endsAt: 200};
    b.breeding = {parents: ['a', 'b'], startedAt: 100, endsAt: 200, birth}; s.buildings = [a, b];
    expect(progressBars(s, {photo: true})).toEqual([]);
    expect(progressBars(s, {movingId: 'a'}).map(bar => bar.buildingId)).toEqual(['b']);
    expect(progressBars(s, {movingId: 'b'}).map(bar => bar.buildingId)).toEqual(['a']);
    expect(progressBars(s)).toHaveLength(2);
    expect(progressBars(null)).toEqual([]);
  });
  it('agency: gives each traveller a stable row, follows saved deadlines and hands over at arrival', () => {
    const s = state(), agency = emptyBuilding('agency-test', 'agency', 0, 0);
    s.buildings=[agency];
    s.travel={welcomed:true,trips:[
      {rabbitId:'a',destination:'Paris',startedAt:100,endsAt:200,hearts:1},
      {rabbitId:'b',destination:'Vannes',startedAt:125,endsAt:225,hearts:2},
      {rabbitId:'c',destination:'Lille',startedAt:0,endsAt:300,hearts:3},
    ]};
    const bars=progressBars(s);
    expect(bars.map(bar=>bar.key)).toEqual(['agency-test:trip-a','agency-test:trip-b','agency-test:trip-c']);
    expect(bars.map(bar=>bar.fraction)).toEqual([.5,.25,.5]);
    expect(bars[1].y-bars[0].y).toBeGreaterThan(bars[0].height);
    expect(progressBars(s,{},200).map(bar=>bar.key)).toEqual(['agency-test:trip-b','agency-test:trip-c']);
    expect(progressBars(s,{photo:true})).toEqual([]);
    expect(progressBars(s,{movingId:agency.id})).toEqual([]);
    expect(progressBars(s,{},300)).toEqual([]);
    s.travel.trips=[];expect(progressBars(s)).toEqual([]);
  });
});

it('reuses passive Graphics across frames, hiding and restoring, then destroys removed buildings', () => {
  const graphics = {name: '', setDepth: vi.fn(), setName: vi.fn(), setVisible: vi.fn(), setPosition: vi.fn(),
    clear: vi.fn(), fillStyle: vi.fn(), fillRoundedRect: vi.fn(), destroy: vi.fn()};
  for (const method of Object.values(graphics)) if (typeof method === 'function') method.mockReturnValue(graphics);
  graphics.setName.mockImplementation((name: string) => { graphics.name = name; return graphics; });
  const scene = {add: {graphics: vi.fn(() => graphics)}}, views = new ProgressBarViews(scene as unknown as Phaser.Scene);
  const bar = {key: 'farm:crop', buildingId: 'farm', x: 0, y: 0, width: 46, height: 5, fraction: 0};
  views.sync([bar], ['farm']); views.sync([{...bar, fraction: .5}], ['farm']);
  expect(scene.add.graphics).toHaveBeenCalledTimes(1);
  expect(graphics.clear).toHaveBeenCalledTimes(2);
  views.sync([], ['farm']); expect(graphics.setVisible).toHaveBeenLastCalledWith(false);
  views.sync([{...bar, fraction: .5}], ['farm']); expect(graphics.setVisible).toHaveBeenLastCalledWith(true);
  expect(graphics.clear).toHaveBeenCalledTimes(2);
  views.sync([], []); expect(graphics.destroy).toHaveBeenCalledTimes(1);
  views.destroy(); expect(graphics.destroy).toHaveBeenCalledTimes(1);
});
