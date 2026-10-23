import type Phaser from 'phaser';
import type {ParcelId} from '../config/land';
import {plateauRect} from './terrainEdges';
import type {EdgePolygon} from './coastRaster';
import {CoastGeneration} from './coastGeneration';
import type {CoastResponse, CoastResult} from './coastProtocol';

let layerSequence = 0;
export interface CoastTexture {key: string; width: number; height: number; bytes: number}

/** Scene-owned display cache. Old textures remain visible until a complete replacement is registered. */
export class CoastLayer {
  readonly root: Phaser.GameObjects.Container;
  readonly generation: CoastGeneration;
  textures: CoastTexture[] = [];
  private visible: Phaser.GameObjects.Container | null = null;
  private readonly namespace = `meadow-coast:${++layerSequence}`;

  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0);
    const base = scene.add.graphics(); this.root.add(base);
    let worker: Worker | null = null;
    this.generation = new CoastGeneration({
      ownership: ids => {
        // Mask retained shoreline as soon as purchased land becomes playable, before the worker finishes.
        base.clear(); base.fillStyle(0xcbd785);
        for (const id of ids) {const r = plateauRect(id); base.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);}
      },
      send: request => { if (!worker) throw Error('Coast worker unavailable'); worker.postMessage(request); },
      commit: result => this.commit(result),
      stop: () => {
        if (worker) {worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); worker = null;}
      },
    });
    this.root.once('destroy', () => { this.generation.destroy(); this.textures = []; });
    try {
      worker = new Worker(new URL('./coastWorker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = (event: MessageEvent<CoastResponse>) => this.generation.receive(event.data);
      worker.onerror = event => { event.preventDefault(); this.generation.fail(event.message || 'Coast worker failed'); worker?.terminate(); };
      worker.onmessageerror = () => { this.generation.fail('Coast worker response could not be decoded'); worker?.terminate(); };
    } catch (error) { this.generation.fail(String(error)); }
  }

  request(ids: readonly ParcelId[]): void { this.generation.request(ids); }
  destroy(): void { this.root.destroy(); }

  private commit(result: CoastResult): {mainMs: number; registrationMs: number} {
    const start = performance.now(), {scene} = this;
    const next = scene.add.container(0, 0).setVisible(false), keys: string[] = [], textures: CoastTexture[] = [];
    let registrationMs = 0;
    next.once('destroy', () => { for (const key of keys) if (scene.textures.exists(key)) scene.textures.remove(key); });
    try {
      for (const [index, tile] of result.tiles.entries()) {
        const canvas = document.createElement('canvas'); canvas.width = tile.width; canvas.height = tile.height;
        const context = canvas.getContext('2d'); if (!context) throw Error('Coast canvas unavailable');
        context.putImageData(new ImageData(new Uint8ClampedArray(tile.buffer), tile.width, tile.height), 0, 0);
        const key = `${this.namespace}:${result.id}:${index}`, before = performance.now(); keys.push(key);
        // Immutable image textures avoid Phaser CanvasTexture's retained duplicate ImageData.
        // Phaser accepts canvas TextureSources at runtime; its addImage declaration only lists HTMLImageElement.
        scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
        next.add(scene.add.image(tile.bounds.left, tile.bounds.top, key).setOrigin(0).setScale(1 / 1.5));
        registrationMs += performance.now() - before;
        textures.push({key, width: tile.width, height: tile.height, bytes: tile.buffer.byteLength});
      }
      const colors = {earth: 0x94704a, soilHighlight: 0xb28b5d, soilBand: 0xc19a67, lip: 0x91b55c, grass: 0xd3df88};
      const fill = (poly: EdgePolygon, color: number) => next.add(scene.add.polygon(0, 0, poly, color).setOrigin(0));
      for (const name of ['earth', 'soilHighlight', 'soilBand', 'lip', 'grass'] as const)
        for (const poly of result.data.layers[name]) fill(poly, colors[name]);
      for (const paint of result.data.strata) fill(paint.poly, paint.color);
      for (const accent of result.data.accents) for (const paint of accent.paint) fill(paint.poly, paint.color);
    } catch (error) { next.destroy(); throw error; }

    // One JS task: no rendered frame can observe partial textures or both generations.
    const old = this.visible; this.root.addAt(next, 0); next.setVisible(true);
    this.visible = next; this.textures = textures;
    if (old) this.root.remove(old, true);
    return {mainMs: performance.now() - start, registrationMs};
  }
}
