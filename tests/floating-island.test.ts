import type Phaser from 'phaser';
import {describe, expect, it, vi} from 'vitest';
import {PARCEL_IDS} from '../src/config/land';
import {floatingIslandArt} from '../src/display/floatingIslandArt';
import {FloatingIslandLayer} from '../src/display/floatingIslandLayer';
import {islandFrame, ownedRegions, recenterCamera} from '../src/display/recenter';
import {MeadowCamera, type WorldBounds} from '../src/ui/gestures';
import {createGame} from '../src/simulation';
import artSource from '../src/display/floatingIslandArt.ts?raw';
import layerSource from '../src/display/floatingIslandLayer.ts?raw';
import {islandCacheScale} from '../src/display/islandRaster';

// Browser capture checks exercise actual Canvas compositing; this isolates cache ownership/failure paths.
vi.mock('../src/display/islandRaster',async importOriginal=>({...(await importOriginal<typeof import('../src/display/islandRaster')>()),islandRaster:(c: {bounds: WorldBounds},_source:unknown,scale:number)=>({
  width:Math.ceil((c.bounds.right-c.bounds.left)*scale),height:Math.ceil((c.bounds.bottom-c.bounds.top)*scale),
})}));

const samples = Array.from({length: 512}, (_, bits) => PARCEL_IDS.filter((_, i) => bits & (1 << i)));
const contains = (a: WorldBounds, b: WorldBounds) => a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom;
function setup() {
  const listeners = new Map<string, {fn: () => void; context: unknown}>();
  const events = {once: (e: string, fn: () => void, context: unknown) => listeners.set(e, {fn, context}), off: (e: string) => listeners.delete(e)};
  class Graphics {
    visible = true; destroyed = false;
    setVisible(v: boolean) {this.visible = v; return this;}
    setOrigin() {return this;} setScale() {return this;}
    lineStyle() {} strokePoints() {} fillStyle() {} fillPoints() {} fillEllipse() {}
    destroy() {this.destroyed = true;}
  }
  const graphics: Graphics[] = [];
  const makeRoot = () => {const root = {depth: 0, children: [] as Graphics[], callback: () => {},
    setDepth(n: number) {this.depth = n; return this;}, once(_e: string, fn: () => void) {this.callback = fn;},
    add(g: Graphics | Graphics[]) {this.children.push(...(Array.isArray(g)?g:[g]));}, destroy: vi.fn(() => {root.children.forEach(g => g.destroy()); root.callback();})}; return root;};
  const roots: ReturnType<typeof makeRoot>[] = [];
  const textures=new Map<string,unknown>(),images: Graphics[]=[];
  const scene = {events, add: {container: () => {const root=makeRoot(); roots.push(root); return root;}, graphics: () => {const g = new Graphics(); graphics.push(g); return g;},image:()=>{const g=new Graphics();images.push(g);return g;}},
    textures:{exists:(key:string)=>textures.has(key),get:()=>({getSourceImage:()=>({})}),addCanvas:(key:string,c:unknown)=>textures.set(key,c),remove:(key:string)=>textures.delete(key)}};
  const layer = new FloatingIslandLayer(scene as unknown as Phaser.Scene);
  return {layer, root: roots[0], rimRoot: roots[1], graphics, images, textures, listeners};
}

describe('floating island painted cache', () => {
  it('gives each detached component its own foundation, collar, cache and satellites', () => {
    const ids = ['southwest', 'northeast'] as const, art = floatingIslandArt(ids);
    expect(art.components).toHaveLength(2);
    for(const component of art.components) {
      expect(component.collars.some(c=>!c.hole)).toBe(true);
      expect(component.pieces.some(p=>p.name==='foundation')).toBe(true);
      expect(component.pieces.filter(p=>p.name.startsWith('islet-'))).toHaveLength(2);
    }
    const s=setup();s.layer.request(ids);
    expect(s.images).toHaveLength(2);expect(s.textures.size).toBe(2);
    s.layer.destroy();expect(s.textures.size).toBe(0);
  });
  it('is deterministic and independent of purchase order or gameplay randomness', () => {
    expect(floatingIslandArt(PARCEL_IDS)).toEqual(floatingIslandArt([...PARCEL_IDS].reverse()));
    expect(artSource + layerSource).not.toMatch(/Math\s*\.\s*random|coast\w*|new Worker/);
  });
  it('keeps every subset and old/new cache overlap plus the shared kit below 12 MiB GPU memory', () => {
    let maxBytes = 0;
    for (const ids of samples) {
      const art=floatingIslandArt(ids);
      const scale=islandCacheScale(art.components);
      const raster=art.components.reduce((sum,c)=>{
        const w=Math.ceil((c.bounds.right-c.bounds.left)*scale),h=Math.ceil((c.bounds.bottom-c.bounds.top)*scale);
        expect(Math.max(w,h)).toBeLessThanOrEqual(2048);return sum+w*h*4;
      },0);
      maxBytes=Math.max(maxBytes,raster);
    }
    expect(maxBytes * 2 + 4000000).toBeLessThan(12 * 1024 * 1024);
    console.info('Underside GPU peak: raster=' + maxBytes + ', old+new+kit=' + (maxBytes*2+3839152));
    const {layer} = setup(); layer.request(PARCEL_IDS); expect(layer.bytes).toBeGreaterThan(0); layer.destroy();
  }, 15000);
  it('only rebuilds on ownership changes, atomically retaining the previous batch until completion', () => {
    const s = setup(); s.layer.request(['southwest']);
    const first = s.graphics[0];
    for (let i = 0; i < 20; i++) s.layer.request(['southwest', 'southwest']);
    expect(s.graphics).toHaveLength(2); expect(s.rimRoot.depth).toBe(.02); expect(s.root.depth).toBe(-.5);
    const oldFill = s.graphics[0].strokePoints;
    // Observe the former batch while the new one is still being drawn.
    const prototype = Object.getPrototypeOf(first) as typeof first;
    prototype.strokePoints = () => {expect(first.destroyed).toBe(false); expect(first.visible).toBe(true);};
    s.layer.request(['southwest', 'south']); prototype.strokePoints = oldFill;
    expect(first.destroyed).toBe(true); expect(s.graphics[2].visible).toBe(true); expect(s.layer.generations).toBe(2);
  });
  it('retains the previous drawing after a paint failure and allows a retry', () => {
    const s = setup(); s.layer.request(['southwest']);
    const prototype = Object.getPrototypeOf(s.graphics[0]) as typeof s.graphics[0], original = prototype.strokePoints;
    const originalTextures=[...s.textures.keys()];
    prototype.strokePoints = () => {throw Error('paint failed');};
    expect(() => s.layer.request(['southwest', 'south'])).toThrow('paint failed'); prototype.strokePoints = original;
    expect([...s.textures.keys()]).toEqual(originalTextures);
    expect(s.graphics[0].destroyed).toBe(false); expect(s.graphics[2].destroyed).toBe(true); expect(s.graphics[3].destroyed).toBe(true);
    s.layer.request(['southwest', 'south']); expect(s.layer.generations).toBe(2);
  });
  it.each(['shutdown', 'explicit', 'root'])('cleans up on %s, idempotently, without late reconstruction', mode => {
    const s = setup(); s.layer.request(PARCEL_IDS);
    if (mode === 'shutdown') {const l = s.listeners.get('shutdown')!; l.fn.call(l.context);}
    else if (mode === 'root') s.root.destroy(); else s.layer.destroy();
    s.layer.destroy(); s.layer.request(['center']);
    expect(s.root.destroy).toHaveBeenCalledTimes(1); expect(s.graphics.every(g => g.destroyed)).toBe(true);
    expect(s.layer.bytes).toBe(0); expect(s.listeners.size).toBe(0); expect(s.graphics).toHaveLength(2);
    expect(s.images.every(g=>g.destroyed)).toBe(true);expect(s.textures.size).toBe(0);
  });
});

describe('floating rock camera envelope', () => {
  it('contains the complete drawing for every nonempty parcel subset', () => {
    for (const ids of samples.slice(1)) {
      const state = {...createGame(0), acquiredParcels: [...ids]}, art = floatingIslandArt(ids);
      expect(contains(islandFrame(state)!.island, art.bounds), JSON.stringify({ids, frame: islandFrame(state)!.island, bounds:art.bounds})).toBe(true);
      const regions = ownedRegions(ids), union = {left: Math.min(...regions.map(r => r.left)), right: Math.max(...regions.map(r => r.right)), top: Math.min(...regions.map(r => r.top)), bottom: Math.max(...regions.map(r => r.bottom))};
      expect(contains(union, art.bounds)).toBe(true);
      const points=[...art.paint,...art.rim].flatMap(p => p.kind === 'ellipse' ? [{x: p.x, y: p.y}] : p.points);
      points.push(...art.components.flatMap(c=>c.pieces.flatMap(p=>[{x:p.x,y:p.y},{x:p.x+p.width,y:p.y+p.height}])));
      const outside = points
        .find(p => !regions.some(r => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom));
      expect(outside, JSON.stringify({ids, outside})).toBeUndefined();
    }
  }, 15000);
  it.each([[390, 844], [852, 393], [1440, 1000]])('fits the whole rock on recenter and overview at %s × %s', (width, height) => {
    for (const ids of [ ['southwest'] as const, ['southwest', 'south', 'west'] as const, PARCEL_IDS, ['southwest', 'northeast'] as const]) {
      const s = {...createGame(0), acquiredParcels: [...ids]}, view = new MeadowCamera(); view.resize(width, height); view.setVisibleRegions(ownedRegions(ids));
      const chrome = {width, height, hudBottom: 70, column: {right: 109, bottom: 278}, footerTop: null};
      recenterCamera(view, s, chrome);
      const art = floatingIslandArt(ids).bounds;
      expect(contains({left: view.world({x: 0, y: 70}).x, top: view.world({x: 0, y: 70}).y, right: view.world({x: width, y: height}).x, bottom: view.world({x: width, y: height}).y}, art), JSON.stringify({ids,zoom:view.zoom,art,screen:[view.screen({x:art.left,y:art.top}),view.screen({x:art.right,y:art.bottom})]})).toBe(true);
      view.overview(islandFrame(s)!.island);
      expect(contains({left: view.world({x: 16, y: 138}).x, top: view.world({x: 16, y: height < 450 ? 78 : width < height ? 138 : 86}).y, right: view.world({x: width - 16, y: height - 16}).x, bottom: view.world({x: width - 16, y: height - 16}).y}, art), JSON.stringify({ids,zoom:view.zoom,art,screen:[view.screen({x:art.left,y:art.top}),view.screen({x:art.right,y:art.bottom})]})).toBe(true);
      // The deepest visible tip can be reached even at maximum zoom.
      view.zoom = 1.65; view.x = (art.left + art.right) / 2; view.y = art.bottom; view.clamp();
      expect(view.screen({x: view.x, y: art.bottom}).y).toBeLessThan(height);
    }
  });
});
