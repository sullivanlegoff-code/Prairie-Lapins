// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createRunFloor} from '../src/ui/bennyRunFloor';
import {mountBennyRunActivity} from '../src/ui/BennyRunActivity';

// The ground drawn by the graphics card (21 Nov. 2026): without WebGL, or with a graphics card emulated by the processor, there is
// no floor and the run paints its ground on its canvas, as before.
describe('Benny Rampage: the ground drawn by the graphics card', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

  it('gives no floor where WebGL is missing', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(createRunFloor()).toBeNull();
  });

  it('gives no floor on a graphics card emulated by the processor', () => {
    const lose = vi.fn();
    const gl = {getExtension: (name: string) => name === 'WEBGL_debug_renderer_info' ? {UNMASKED_RENDERER_WEBGL: 1} : name === 'WEBGL_lose_context' ? {loseContext: lose} : null,
      getParameter: () => 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => kind === 'webgl' ? gl : null) as never);
    expect(createRunFloor()).toBeNull();
    expect(lose).toHaveBeenCalled();
  });

  /** A graphics card that answers everything (no drawing), whose context can be lost and given back. */
  function fakeCard() {
    let canvas: HTMLCanvasElement | null = null; const calls = {lose: 0, restore: 0, textures: 0};
    const lose = {loseContext: () => { calls.lose++; canvas!.dispatchEvent(new Event('webglcontextlost')); },
      restoreContext: () => { calls.restore++; canvas!.dispatchEvent(new Event('webglcontextrestored')); }};
    const gl = new Proxy({} as Record<string, unknown>, {get: (_, name: string) => name === 'getExtension' ? (n: string) => n === 'WEBGL_lose_context' ? lose : null
      : name === 'getParameter' ? () => 'Real card' : name === 'createTexture' ? () => { calls.textures++; return {}; } : name.startsWith('get') && name.endsWith('Parameter') ? () => true
      : /^[A-Z_0-9]+$/.test(name) ? 1 : () => ({})});
    const k2d = new Proxy({}, {get: () => () => undefined});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, kind: string) { if (kind === 'webgl') { canvas = this; return gl; } return k2d; } as never);
    return calls;
  }
  const pictures = () => { const p = document.createElement('canvas'); return {meadow: p, slabs: p, planks: p, field: p, blades: p}; };

  it('sets itself up again and takes its pictures back when its lost context is given back (lot 2.3)', () => {
    const calls = fakeCard(), floor = createRunFloor()!;
    floor.setPictures(pictures()); expect(floor.ready()).toBe(true);
    // The page went to the background: the context is lost, then given back.
    floor.canvas.dispatchEvent(new Event('webglcontextlost')); expect(floor.ready()).toBe(false);
    const before = calls.textures; floor.canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(floor.ready()).toBe(true); expect(calls.textures).toBe(before + 5);
  });

  it('lets go of its memory when the run closes (a 1-pixel canvas, its context lost) and comes back when it opens again (lot 2.4)', () => {
    const calls = fakeCard(), floor = createRunFloor()!;
    floor.setPictures(pictures()); floor.canvas.width = 780; floor.canvas.height = 1688;
    floor.release();
    expect(floor.ready()).toBe(false); expect(calls.lose).toBe(1); expect(floor.canvas.width * floor.canvas.height).toBe(1);
    floor.setPictures(pictures());
    expect(calls.restore).toBe(1); expect(floor.ready()).toBe(true);
  });

  it('mounts the run without WebGL, with no floor canvas left in the page', () => {
    const host = document.createElement('div'); document.body.append(host);
    const run = mountBennyRunActivity(host, {clock: () => 0, frame: () => 1});
    expect(host.querySelector('.benny-run-floor')).toBeNull();
    expect(host.querySelector('.benny-run-canvas')).not.toBeNull();
    run.dispose();
  });
});
