/**
 * The ground of « Benny Rampage » drawn by the graphics card (owner, 21 Nov. 2026: « le sol fait buguer le jeu […] le but est que le
 * jeu soit parfaitement smooth »): one picture a frame for the whole meadow, out to the horizon on both sides (« une prairie à perte
 * de vue »), the road's slabs down its middle, the planks of a bridge and the dark of a hole, each pixel at its own true depth.
 * Far off it melts into a white morning fog (owner, 21 Nov.: « comme Blade of Brim »): past it, nothing is drawn.
 * Before, the canvas painted the ground row by row (a hundred and more pictures a frame), with seams and shimmer far off.
 *
 * It is a canvas of its own, under the run's canvas (which leaves the ground clear for it); the run's canvas draws everything
 * standing on the ground over it. Where WebGL is missing or lost, `createRunFloor` gives null and the run paints its ground itself.
 */

/** What the ground looks like this frame: the camera, where the road runs and what is on it (all distances ahead of Benny, m). */
export interface RunFloorView {
  /** The screen, in points, and the pixels per point. */
  width: number; height: number; ratio: number;
  /** The shake of the screen this frame (points). */
  shiftX: number; shiftY: number;
  /** The horizon's height on the screen (points), the projection's scale (points per metre at the camera's distance), the camera's
   *  height above the ground and its distance behind Benny (m), its offset across (m). */
  horizon: number; scale: number; cameraHeight: number; cameraBack: number; cameraX: number;
  /** How far aside the road winds at `bendFar` m ahead and beyond (m), growing as the square of the distance up to there. */
  bend: number; bendFar: number;
  /** The tiles: their sizes (m) and how far through a tile the road is at Benny's feet (0 to 1). */
  meadowTile: number; meadowShift: number; slabTile: number; slabShift: number; plankAcross: number; plankAlong: number; plankShift: number;
  /** The road: its lanes' width, how many lanes it has and in a wide hall, the halls (from, to), how far its edge goes past the lanes. */
  laneWidth: number; lanes: number; wideLanes: number; halls: readonly (readonly [number, number])[]; edge: number;
  /** The holes across the road and the bridge's planks (from, to). */
  holes: readonly (readonly [number, number])[]; bridge: readonly [number, number] | null;
  /** The fog's colour and the dark of a hole (0 to 1); where the fog starts and where it is all white (m ahead). */
  haze: readonly [number, number, number]; hole: readonly [number, number, number]; fogFrom: number; fogTo: number;
}

export interface RunFloor {
  readonly canvas: HTMLCanvasElement;
  /** Takes the meadow's, the slabs' and the planks' paintings (again after they were let go). */
  setPictures(pictures: {meadow: TexImageSource; slabs: TexImageSource; planks: TexImageSource}): void;
  /** Whether it has its pictures and can draw. */
  ready(): boolean;
  /** Draws the ground of this frame (false if it cannot: no pictures, the context lost). */
  draw(view: RunFloorView): boolean;
  /** Lets go of its pictures (the run closed). */
  release(): void;
  /** Lets go of everything. */
  destroy(): void;
}

const MAX_HOLES = 8, MAX_HALLS = 4;
/** The side of the pictures on the card: a power of two, repeated and with smaller copies for the distance (mipmaps). */
const PICTURE_SIDE = 512;

const VERTEX = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;
const FRAGMENT = `
precision highp float;
uniform vec2 uSize; uniform float uRatio; uniform vec2 uShift;
uniform float uHorizon, uK, uCamH, uCamBack, uCamX, uBend, uBendFar;
uniform sampler2D uMeadow, uSlab, uPlank;
uniform float uMeadowTile, uMeadowShift, uSlabTile, uSlabShift, uPlankAcross, uPlankAlong, uPlankShift;
uniform float uLane, uLanes, uWide, uEdge;
uniform vec2 uHalls[${MAX_HALLS}]; uniform vec2 uHoles[${MAX_HOLES}]; uniform vec2 uBridge;
uniform vec3 uHaze, uHole; uniform float uFogFrom, uFogTo;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio - uShift;
  float dy = p.y - uHorizon;
  if (dy <= 0.0) { gl_FragColor = vec4(uHaze, 1.0); return; }
  // The depth of this pixel on the flat ground, its scale (points per metre), where it is across.
  float s = dy / uCamH, a = uK / s - uCamBack;
  float k = clamp(max(a, 0.0) / uBendFar, 0.0, 1.0);
  float x = (p.x - uSize.x * 0.5) / s - uBend * k * k + uCamX;
  // In the white of the fog: nothing more to look up (the horizon is gone).
  if (a >= uFogTo) { gl_FragColor = vec4(uHaze, 1.0); return; }
  float ac = a;
  // The road's half-width there: wider in a hall (it opens over 6 m and closes over 6 m past its end).
  float wide = 0.0;
  for (int i = 0; i < ${MAX_HALLS}; i++) {
    vec2 h = uHalls[i];
    wide = max(wide, (a >= h.x && a < h.y) ? min(1.0, (a - h.x) / 6.0) : (a >= h.y ? max(0.0, 1.0 - (a - h.y) / 6.0) : 0.0));
  }
  float halfW = (uLanes + (uWide - uLanes) * wide) * 0.5 * uLane, edge = halfW + uEdge;
  // The three paintings, every pixel (their smaller copies picked the same way everywhere: no seam at the road's edge).
  vec3 meadow = texture2D(uMeadow, vec2(x / uMeadowTile, -(ac / uMeadowTile + uMeadowShift))).rgb;
  vec3 slab = texture2D(uSlab, vec2(x / uSlabTile, -(ac / uSlabTile + uSlabShift))).rgb;
  vec3 plank = texture2D(uPlank, vec2(x / uPlankAcross, -(ac / uPlankAlong + uPlankShift))).rgb;
  // The meadow a little darker right along the road (the slabs sit in the grass).
  meadow *= mix(0.84, 1.0, smoothstep(0.0, 0.7, abs(x) - edge));
  float hole = 0.0;
  for (int i = 0; i < ${MAX_HOLES}; i++) { vec2 h = uHoles[i]; if (a >= h.x && a < h.y) hole = 1.0; }
  float bridge = (a >= uBridge.x && a < uBridge.y) ? 1.0 : 0.0;
  vec3 road = mix(mix(slab, plank, bridge), uHole, hole);
  // The road's edge, smooth over a pixel.
  float inside = clamp((edge - abs(x)) * s * uRatio + 0.5, 0.0, 1.0);
  vec3 colour = mix(meadow, road, inside);
  // The morning fog, thicker and thicker away from Benny (the same as over the things standing on the ground).
  gl_FragColor = vec4(mix(colour, uHaze, smoothstep(uFogFrom, uFogTo, a)), 1.0);
}`;

export function createRunFloor(): RunFloor | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'benny-run-floor'; canvas.setAttribute('aria-hidden', 'true');
  let gl: WebGLRenderingContext | null = null;
  try { gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true}) as WebGLRenderingContext | null; } catch { gl = null; }
  if (!gl) return null;
  const G = gl;
  // (A graphics card emulated by the processor draws the ground far slower than the canvas: then the canvas paints it.)
  const info = G.getExtension('WEBGL_debug_renderer_info'), renderer = info ? String(G.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) { G.getExtension('WEBGL_lose_context')?.loseContext(); return null; }
  const shader = (type: number, source: string) => { const s = G.createShader(type); if (!s) return null; G.shaderSource(s, source); G.compileShader(s);
    if (G.getShaderParameter(s, G.COMPILE_STATUS)) return s;
    console.warn('Benny Rampage : sol sans carte graphique', G.getShaderInfoLog(s)); return null; };
  const vs = shader(G.VERTEX_SHADER, VERTEX), fs = shader(G.FRAGMENT_SHADER, FRAGMENT), program = G.createProgram();
  if (!vs || !fs || !program) return null;
  G.attachShader(program, vs); G.attachShader(program, fs); G.linkProgram(program);
  if (!G.getProgramParameter(program, G.LINK_STATUS)) return null;
  G.useProgram(program);
  const buffer = G.createBuffer(); G.bindBuffer(G.ARRAY_BUFFER, buffer);
  G.bufferData(G.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), G.STATIC_DRAW);
  const at = G.getAttribLocation(program, 'a'); G.enableVertexAttribArray(at); G.vertexAttribPointer(at, 2, G.FLOAT, false, 0, 0);
  const u = (name: string) => G.getUniformLocation(program, name);
  const U = Object.fromEntries(['uSize', 'uRatio', 'uShift', 'uHorizon', 'uK', 'uCamH', 'uCamBack', 'uCamX', 'uBend', 'uBendFar', 'uMeadow', 'uSlab', 'uPlank',
    'uMeadowTile', 'uMeadowShift', 'uSlabTile', 'uSlabShift', 'uPlankAcross', 'uPlankAlong', 'uPlankShift', 'uLane', 'uLanes', 'uWide', 'uEdge',
    'uHalls', 'uHoles', 'uBridge', 'uHaze', 'uHole', 'uFogFrom', 'uFogTo'].map(n => [n, u(n)])) as Record<string, WebGLUniformLocation | null>;
  G.uniform1i(U.uMeadow, 0); G.uniform1i(U.uSlab, 1); G.uniform1i(U.uPlank, 2);
  const aniso = G.getExtension('EXT_texture_filter_anisotropic') ?? G.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const anisoMax = aniso ? Math.min(8, G.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) : 0;
  let textures: WebGLTexture[] = [], lost = false;
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; textures = []; });
  const square = document.createElement('canvas'); square.width = square.height = PICTURE_SIDE;
  const squareK = square.getContext('2d');
  function texture(unit: number, source: TexImageSource): WebGLTexture | null {
    const t = G.createTexture(); if (!t || !squareK) return null;
    // (Squared to a power of two first: a texture that repeats and has smaller copies must be.)
    squareK.imageSmoothingQuality = 'high'; squareK.clearRect(0, 0, PICTURE_SIDE, PICTURE_SIDE); squareK.drawImage(source as CanvasImageSource, 0, 0, PICTURE_SIDE, PICTURE_SIDE);
    G.activeTexture(G.TEXTURE0 + unit); G.bindTexture(G.TEXTURE_2D, t);
    G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, square);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.REPEAT); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.REPEAT);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR_MIPMAP_LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
    if (aniso && anisoMax > 1) G.texParameterf(G.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, anisoMax);
    G.generateMipmap(G.TEXTURE_2D);
    return t;
  }
  const halls = new Float32Array(MAX_HALLS * 2), holes = new Float32Array(MAX_HOLES * 2);
  const floor: RunFloor = {
    canvas,
    setPictures(p) {
      if (lost) return;
      floor.release();
      const list = [texture(0, p.meadow), texture(1, p.slabs), texture(2, p.planks)];
      textures = list.every(t => t) ? list as WebGLTexture[] : [];
      squareK?.clearRect(0, 0, PICTURE_SIDE, PICTURE_SIDE);
    },
    ready: () => !lost && textures.length === 3,
    draw(v) {
      if (!floor.ready()) return false;
      const w = Math.max(1, Math.round(v.width * v.ratio)), h = Math.max(1, Math.round(v.height * v.ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      G.viewport(0, 0, w, h);
      textures.forEach((t, i) => { G.activeTexture(G.TEXTURE0 + i); G.bindTexture(G.TEXTURE_2D, t); });
      G.uniform2f(U.uSize, v.width, v.height); G.uniform1f(U.uRatio, v.ratio); G.uniform2f(U.uShift, v.shiftX, v.shiftY);
      G.uniform1f(U.uHorizon, v.horizon); G.uniform1f(U.uK, v.scale * v.cameraBack); G.uniform1f(U.uCamH, Math.max(.01, v.cameraHeight));
      G.uniform1f(U.uCamBack, v.cameraBack); G.uniform1f(U.uCamX, v.cameraX); G.uniform1f(U.uBend, v.bend); G.uniform1f(U.uBendFar, v.bendFar);
      G.uniform1f(U.uMeadowTile, v.meadowTile); G.uniform1f(U.uMeadowShift, v.meadowShift); G.uniform1f(U.uSlabTile, v.slabTile); G.uniform1f(U.uSlabShift, v.slabShift);
      G.uniform1f(U.uPlankAcross, v.plankAcross); G.uniform1f(U.uPlankAlong, v.plankAlong); G.uniform1f(U.uPlankShift, v.plankShift);
      G.uniform1f(U.uLane, v.laneWidth); G.uniform1f(U.uLanes, v.lanes); G.uniform1f(U.uWide, v.wideLanes); G.uniform1f(U.uEdge, v.edge);
      // (Unused places hold a range nothing is in.)
      halls.fill(-1e6); v.halls.slice(0, MAX_HALLS).forEach(([a, b], i) => { halls[i * 2] = a; halls[i * 2 + 1] = b; }); G.uniform2fv(U.uHalls, halls);
      holes.fill(-1e6); v.holes.slice(0, MAX_HOLES).forEach(([a, b], i) => { holes[i * 2] = a; holes[i * 2 + 1] = b; }); G.uniform2fv(U.uHoles, holes);
      G.uniform2f(U.uBridge, v.bridge?.[0] ?? -1e6, v.bridge?.[1] ?? -1e6);
      G.uniform3f(U.uHaze, v.haze[0], v.haze[1], v.haze[2]); G.uniform3f(U.uHole, v.hole[0], v.hole[1], v.hole[2]); G.uniform1f(U.uFogFrom, v.fogFrom); G.uniform1f(U.uFogTo, v.fogTo);
      G.drawArrays(G.TRIANGLE_STRIP, 0, 4);
      return true;
    },
    release() { if (!lost) for (const t of textures) G.deleteTexture(t); textures = []; },
    destroy() { floor.release(); G.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); },
  };
  return floor;
}
