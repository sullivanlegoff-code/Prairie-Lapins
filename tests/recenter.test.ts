import {describe,it,expect} from 'vitest';
import {createGame} from '../src/simulation';
import {MeadowCamera,buildingCenter,type WorldBounds} from '../src/ui/gestures';
import {toScreen} from '../src/ui/projection';
import {NEST_ART} from '../src/config/nestArt';
import {NURSERY_ART} from '../src/config/nurseryArt';
import {buildingFrame,recenterCamera,recenterInsets,startFrame,type ScreenChrome} from '../src/display/recenter';
import {VISUAL} from '../src/config/visual';

// Chrome measured on the compiled game (Chromium, CSS px): HUD bottom and left action column.
const chrome: Record<string, ScreenChrome> = {
  landscape: {width: 844, height: 390, hudBottom: 67, column: {right: 109, bottom: 278}, footerTop: null},
  portrait: {width: 390, height: 844, hudBottom: 64, column: {right: 109, bottom: 275}, footerTop: null},
  laboratory: {width: 844, height: 390, hudBottom: 67, column: {right: 109, bottom: 278}, footerTop: 332},
};
const inside = (c: MeadowCamera, rect: WorldBounds, area: {left: number; right: number; top: number; bottom: number}) => {
  const a = c.screen({x: rect.left, y: rect.top}), b = c.screen({x: rect.right, y: rect.bottom});
  return a.x >= area.left - 1e-6 && a.y >= area.top - 1e-6 && b.x <= area.right + 1e-6 && b.y <= area.bottom + 1e-6;
};

describe('Recentrer frames the three starting buildings', () => {
  it('covers nest, nursery and the Paille habitat with their artwork and labels', () => {
    const s = createGame(0), frame = startFrame(s)!;
    for (const b of s.buildings) {const f = buildingFrame(b); expect(f.left >= frame.left && f.right <= frame.right && f.top >= frame.top && f.bottom <= frame.bottom).toBe(true);}
    // Nest art on the left, Nursery art on the right, the higher of their art tops (rows rise to the right, so the
    // Nursery can top the Nest), Paille habitat label at the bottom, each at its projected anchor and art constants.
    const [habitat, nest, nursery] = s.buildings.map(b => toScreen(buildingCenter(b)));
    const nestHeight = NEST_ART.worldWidth * NEST_ART.height / NEST_ART.width, nurseryHeight = NURSERY_ART.worldWidth * NURSERY_ART.height / NURSERY_ART.width;
    const expected = {left: nest.x - NEST_ART.worldWidth / 2, right: nursery.x + NURSERY_ART.worldWidth / 2,
      top: Math.min(nest.y - nestHeight * NEST_ART.originY, nursery.y - nurseryHeight * NURSERY_ART.originY), bottom: habitat.y + 80};
    for (const side of ['left', 'right', 'top', 'bottom'] as const) expect(frame[side]).toBeCloseTo(expected[side], 9);
  });
  it.each(Object.entries(chrome))('%s: all three fully visible beside or below the action column, at most at 1.05', (_name, c) => {
    const s = createGame(0), view = new MeadowCamera(); view.resize(c.width, c.height);
    recenterCamera(view, s, c);
    expect(view.zoom).toBeLessThanOrEqual(VISUAL.camera.initialZoom); expect(view.zoom).toBeGreaterThanOrEqual(view.minimumZoom);
    const bottom = c.footerTop ?? c.height, frame = startFrame(s)!;
    const beside = {left: c.column!.right, right: c.width, top: c.hudBottom, bottom}, below = {left: 0, right: c.width, top: c.column!.bottom, bottom};
    expect(inside(view, frame, beside) || inside(view, frame, below)).toBe(true);
  });
  it('chooses the side in landscape and the space below the column in portrait', () => {
    expect(recenterInsets(chrome.landscape)[0]).toEqual({left: 125, right: 16, top: 83, bottom: 16});
    const s = createGame(0);
    for (const [name, expected] of [['landscape', 125], ['portrait', 16]] as const) {
      const view = new MeadowCamera(), c = chrome[name]; view.resize(c.width, c.height); recenterCamera(view, s, c);
      const frame = startFrame(s)!, left = view.screen({x: frame.left, y: frame.top}).x;
      expect(left).toBeGreaterThanOrEqual(expected);
    }
  });
  it('keeps the pinch anchor and the land clamp after recentring', () => {
    const s = createGame(0), view = new MeadowCamera(), c = chrome.landscape; view.resize(c.width, c.height); recenterCamera(view, s, c);
    const before = view.world({x: 500, y: 200}); view.scale(1.3, {x: 500, y: 200}); const after = view.world({x: 500, y: 200});
    expect(after.x).toBeCloseTo(before.x, 9); expect(after.y).toBeCloseTo(before.y, 9);
    const settled = {x: view.x, y: view.y}; view.clamp(); expect({x: view.x, y: view.y}).toEqual(settled);
    for (let n = 0; n < 20; n++) view.pan(5000, 5000);
    const corner = view.world({x: c.width, y: c.height}); expect(corner.x).toBeGreaterThan(VISUAL.grid.originX); expect(corner.y).toBeGreaterThan(VISUAL.grid.originY);
  });
  it('falls back to the former fixed focus without a game or a measured screen', () => {
    const a = new MeadowCamera(), b = new MeadowCamera(); a.resize(844, 390); b.resize(844, 390);
    recenterCamera(a, null, chrome.landscape); b.recenter(); expect({x: a.x, y: a.y, zoom: a.zoom}).toEqual({x: b.x, y: b.y, zoom: b.zoom});
    recenterCamera(a, createGame(0), null); expect({x: a.x, y: a.y, zoom: a.zoom}).toEqual({x: b.x, y: b.y, zoom: b.zoom});
  });
});
