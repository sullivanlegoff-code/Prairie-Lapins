import {describe, expect, it} from 'vitest';
import {MeadowCamera} from '../src/ui/gestures';
import {ownedRegions} from '../src/display/recenter';
import {christmasMarketFrame} from '../src/config/christmasMarketArt';
import {jumpIslandFrame} from '../src/config/jumpIslandArt';

// iPhone, 7 November 2026: after « Les cadeaux du ciel », on the market islet, a drag towards the island stopped at the
// corner because the way through sits a little lower; the camera now slides along the edge to the next island.
describe('the camera between the islets', () => {
  const regions = [...ownedRegions(['southwest']), jumpIslandFrame(), christmasMarketFrame(true)];
  const market = christmasMarketFrame(true), island = ownedRegions(['southwest'])[0];
  const camera = (zoom: number, x: number, y: number) => { const c = new MeadowCamera(); c.resize(844, 390); c.setVisibleRegions(regions); c.zoom = zoom; c.x = x; c.y = y; c.clamp(); return c; };
  for (const zoom of [.8, 1.2, 1.6]) {
    it(`goes from the market islet to the island with a straight drag at zoom ${zoom}, and back`, () => {
      const c = camera(zoom, (market.left + market.right) / 2, (market.top + market.bottom) / 2);
      for (let k = 0; k < 400; k++) c.pan(-10, 0);
      expect(c.x).toBeGreaterThan(island.left + 300);
      for (let k = 0; k < 600; k++) c.pan(10, 0);
      expect(c.x).toBeLessThan(market.right);
    });
  }
  it('still stops at the outer edge of a single island, without drifting', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.zoom = 1.2; c.clamp();
    for (let k = 0; k < 200; k++) c.pan(-50, 0);
    const edge = {x: c.x, y: c.y}; for (let k = 0; k < 50; k++) c.pan(-50, 0);
    expect({x: c.x, y: c.y}).toEqual(edge);
  });
});
