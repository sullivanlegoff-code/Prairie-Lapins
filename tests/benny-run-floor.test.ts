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

  it('mounts the run without WebGL, with no floor canvas left in the page', () => {
    const host = document.createElement('div'); document.body.append(host);
    const run = mountBennyRunActivity(host, {clock: () => 0, frame: () => 1});
    expect(host.querySelector('.benny-run-floor')).toBeNull();
    expect(host.querySelector('.benny-run-canvas')).not.toBeNull();
    run.dispose();
  });
});
