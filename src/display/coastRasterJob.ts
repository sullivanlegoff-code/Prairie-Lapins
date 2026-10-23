import {fillCoastPixels, rasterScale, terrainEdges} from './coastRaster';
import type {CoastRequest, CoastResult} from './coastProtocol';

/** Pure CPU job: neither DOM nor OffscreenCanvas is used by the worker. */
export function renderCoast(request: CoastRequest): CoastResult {
  const start = performance.now(), edges = terrainEdges({acquiredParcels: request.ids});
  const model = edges.rasterModel, prepared = performance.now();
  const tiles: CoastResult['tiles'] = [];
  let pixelMs = 0, rgbaBytes = 0, scratchBytes = 0;
  for (const bounds of model.tiles) {
    const width = Math.round((bounds.right - bounds.left) * rasterScale);
    const height = Math.round((bounds.bottom - bounds.top) * rasterScale);
    const pixels = new Uint8ClampedArray(width * height * 4), before = performance.now();
    scratchBytes = Math.max(scratchBytes, fillCoastPixels(model, bounds, width, height, pixels));
    pixelMs += performance.now() - before;
    rgbaBytes += pixels.byteLength;
    tiles.push({bounds, width, height, buffer: pixels.buffer});
  }
  // Profiles and masks stay in the worker; only display geometry and RGBA ownership cross threads.
  const {rects, runs, layers, accents, strata} = edges;
  return {type: 'result', id: request.id, data: {rects, runs, layers, accents, strata}, tiles,
    stats: {preparationMs: prepared - start, pixelMs, workerMs: performance.now() - start, rgbaBytes, scratchBytes}};
}
