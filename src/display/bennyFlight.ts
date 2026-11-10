import type {Point} from '../ui/gestures';

/**
 * Benny's flight over the island (owner, 1 November 2026), apart from Phaser so it can be tested: a pure clock and trajectory.
 * Purely visual and session-only: nothing is saved, the simulation is never asked, and no random generator is used (each lap's
 * shape comes from a fixed hash of its number, so a test sees the same flight every time).
 *
 * - Taking off: sparkles on Benny in her enclosure, her wings are born (the profile's appearance, 1 to 8), then she rises in a gentle
 *   spiral with powerful beats until she joins her orbit.
 * - Sky mode (the saved `bennyInSky`): slow circles over the island, never twice the same circuit (owner, 10 November 2026): every
 *   lap has its own size, centre, figure of eight and sometimes little loops, blended into the next lap, with gentle swells of altitude. Her
 *   wings beat all the time (about 11 pictures a second), now and then she glides with her wings held flat; her two bodies alternate
 *   with the beat (the paws stretch on the down stroke). No stardust: she is only up in the air.
 * - Her power: a grand tour with a trail of stardust and falling feathers, then a pass above the nursery where the dust rains on the
 *   roof; then back to her orbit (sky mode) or down to her enclosure.
 * - Landing: a spiral down to her place in the enclosure, then her wings vanish (the profile's disappearance, 1 to 8).
 * - The picture follows her heading on the ground (screen y counted twice, the island being seen from above at a slant): profile
 *   going sideways (left = mirror), three-quarter front coming diagonally towards the player, face coming straight, back going
 *   straight. Going nearly straight away, the back too (the owner's concept B, seen a little from above), the whole drawing leaned by
 *   BACK_LEAN towards her way (right: clockwise, left: anticlockwise); further from straight away she is seen in profile, so the
 *   back shows less often (owner, 10 November 2026: « un peu moins souvent de dos »). A change of view cross-fades in TURN_MS, the lean turns
 *   smoothly (LEAN_MS), and a small margin keeps the view from flickering on a sector's edge.
 * - Reduced motion: no flight. In sky mode she stays in her enclosure; her power is a fade of sparkles on her, then on the nursery.
 * - A reload in sky mode puts her straight back on her orbit, without taking off again.
 */
export type FlightView = 'profil' | '34devant' | 'face' | 'dos';
export type FlightPhase = 'ground' | 'wake' | 'rise' | 'orbit' | 'toNursery' | 'nursery' | 'rejoin' | 'descend' | 'settle';
export const AIRBORNE: readonly FlightPhase[] = ['rise', 'orbit', 'toNursery', 'nursery', 'rejoin', 'descend'];

/** Where she flies, in scene units: her place in the enclosure (and the way A1 looks there), the island's orbit, the nursery. */
export interface FlightGeometry {home: Point; facing: 1 | -1; centre: Point; rx: number; ry: number; nursery: Point | null; /** Height to hover above the nursery's roof. */ nurseryAltitude?: number}
export interface FlightStep {dt: number; /** The saved sky mode. */ sky: boolean; reduced: boolean; geometry: FlightGeometry}
export type WingSeries = 'beat' | 'appear' | 'disappear';
export interface FlightFrame {
  phase: FlightPhase;
  /** The flying rig is drawn (wings and flight body); `ground` is the opacity left to A1 in the enclosure. */
  shown: boolean; ground: number;
  /** Ground track (the shadow) and height above it, in scene units. */
  x: number; y: number; altitude: number;
  view: FlightView; mirror: boolean;
  /** The view she is turning from, fading out (1 → 0 over TURN_MS), drawn above the new one. */
  previous: {view: FlightView; mirror: boolean; k: number} | null;
  wing: {series: WingSeries; frame: number; /** Opacity of the far wing(s): it fades in after the appearance and out before the disappearance. */ back: number};
  body: 1 | 2;
  /** A stardust trail (her power only), a rain of dust above the nursery (0 → 1), falling feathers, a burst of sparkles around her (0 → 1). */
  dust: boolean; rain: number; feathers: boolean; sparkle: number;
  /** Reduced motion's power: a still glow on her, then on the nursery. */
  glow: {at: 'benny' | 'nursery'; alpha: number} | null;
  /** Size against A1 (perspective and flight), nose-up tilt (radians, the lean included) and the little lift of each down stroke (scene units). */
  scale: number; tilt: number; bob: number;
  /** The back's lean going diagonally away (radians, clockwise positive), already in `tilt`; it turns smoothly between views. */
  lean: number;
}

// ---------- timing (ms) ----------
export const WAKE_MS = 1300, WAKE_SPARKLE_MS = 450, WAKE_FADE = [300, 600] as const;
/** Her power's tour lasts TOUR_MS from the sky, GROUND_TOUR_MS after a take-off (the rise already shows part of the island). */
export const GROUND_TOUR_MS = 2400;
export const RISE_MS = 2200, TOUR_MS = 3600, TO_NURSERY_MS = 1100, NURSERY_MS = 1800, REJOIN_MS = 1600, DESCEND_MS = 2200;
export const SETTLE_MS = 1100, SETTLE_WINGS_MS = 900, SETTLE_FADE = [800, 1100] as const;
export const REDUCED_POWER_MS = 2600;
export const TURN_MS = 180;
/** Time constant of the lean's turn (ms): about 90 % of the way within one cross-fade. */
export const LEAN_MS = 80;
/** One turn of the island in sky mode, and during her power. */
export const ORBIT_PERIOD = 24000, POWER_PERIOD = 9000;
/** Wing pictures a second: cruising, powerful (rising), and during her power. */
export const WING_FPS = 11, RISE_FPS = 14, POWER_FPS = 12;
export const BEATS = 8;
/** A glide (wings held flat, picture 3) every GLIDE_EVERY in sky mode, for GLIDE_MS. */
export const GLIDE_EVERY = 7000, GLIDE_MS = 1000, GLIDE_FRAME = 3;
// ---------- space (scene units) ----------
export const ALTITUDE = 66, NURSERY_ALTITUDE = 40, SWELL = 6, SPIRAL = 26, NURSERY_CIRCLE = 14, WAKE_LIFT = 4;
/** Screen y counts this much more than x in a heading: the ground is seen at a slant. */
export const DEPTH_SQUASH = 2;
/** Size in the air against A1, and the perspective (smaller at the back of the island, larger at the front). */
export const FLIGHT_SIZE = .9, PERSPECTIVE = .12;
/** The back's lean going diagonally away (radians): about 20°. */
export const BACK_LEAN = 20 * Math.PI / 180;
/** Margin of a view's sector before it changes (radians). */
export const VIEW_MARGIN = 8 * Math.PI / 180;

const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const ease = (u: number) => { u = clamp(u); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export interface FlightSector {view: FlightView; mirror: boolean; /** Lean of the whole drawing (radians, clockwise positive). */ lean: number;
  /** The headings it serves: its centre and half its width (radians, clockwise from "going right", screen y down). */ centre: number; half: number}
const DEG = Math.PI / 180;
/** The headings, clockwise from "going right" (screen y down = towards the player). Coming towards the player: four sectors of 45°.
 * Going away, the back serves only 70° around straight away (it served 135° before 10 November 2026), never mirrored: one same
 * drawing, so a turn between its three parts is only its lean turning; the profile serves the rest. */
const SECTORS: readonly FlightSector[] = [
  {view: 'profil', mirror: false, lean: 0, centre: -16.25 * DEG, half: 38.75 * DEG}, {view: '34devant', mirror: false, lean: 0, centre: 45 * DEG, half: 22.5 * DEG},
  {view: 'face', mirror: false, lean: 0, centre: 90 * DEG, half: 22.5 * DEG}, {view: '34devant', mirror: true, lean: 0, centre: 135 * DEG, half: 22.5 * DEG},
  {view: 'profil', mirror: true, lean: 0, centre: 196.25 * DEG, half: 38.75 * DEG}, {view: 'dos', mirror: false, lean: -BACK_LEAN, centre: -112.5 * DEG, half: 12.5 * DEG},
  {view: 'dos', mirror: false, lean: 0, centre: -90 * DEG, half: 10 * DEG}, {view: 'dos', mirror: false, lean: BACK_LEAN, centre: -67.5 * DEG, half: 12.5 * DEG},
];
const headingAngle = (dx: number, dy: number) => Math.atan2(dy * DEPTH_SQUASH, dx);
/** How far a heading is from a sector's centre (radians, 0 to π). */
const offCentre = (angle: number, sector: FlightSector) => Math.abs(Math.atan2(Math.sin(angle - sector.centre), Math.cos(angle - sector.centre)));
const sectorOf = (angle: number) => Math.max(0, SECTORS.findIndex(s => offCentre(angle, s) <= s.half + 1e-9));
/** The picture for a heading on screen (dx right, dy towards the player): every painting looks right, the left side is mirrored;
 * going diagonally away, the back leaned towards her way. */
export function flightView(dx: number, dy: number): Pick<FlightSector, 'view' | 'mirror' | 'lean'> { const {view, mirror, lean} = SECTORS[sectorOf(headingAngle(dx, dy))]; return {view, mirror, lean}; }

/** The wing picture (1 to 8) after `ms` of beating at `fps`. */
export const wingFrame = (ms: number, fps: number): number => Math.floor(ms / 1000 * fps) % BEATS + 1;
/** The back's bodies with its wing pictures 1 to 8, as painted on its board (its two bodies only differ by the hind paws). */
export const BACK_BODIES: readonly (1 | 2)[] = [1, 2, 2, 1, 1, 2, 2, 1];
/** The body goes with the wing: paws stretched (2) on the down stroke (pictures 3 to 6), gathered (1) on the way up; the back keeps
 * its own order. */
export const flightBody = (frame: number, view: FlightView = 'profil'): 1 | 2 => view === 'dos' ? BACK_BODIES[frame - 1] : frame >= 3 && frame <= 6 ? 2 : 1;

/** A fixed number from 0 to 1 for lap `lap` and draw `n` (a hash, no random generator: the same lap always has the same shape). */
export function lapNoise(lap: number, n: number): number {
  let h = Math.imul(lap | 0, 0x27d4eb2d) ^ Math.imul(n + 1, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** One lap's circuit, in shares of the island's ellipse: its size, its centre's shift, its figure of eight, its little loops. */
export interface LapShape {sx: number; sy: number; ox: number; oy: number; eight: number; loops: number; loopSize: number}
export function lapShape(lap: number): LapShape {
  const r = (n: number) => lapNoise(lap, n), sx = .78 + .22 * r(0), sy = .72 + .28 * r(1);
  return {sx, sy, ox: (r(2) * 2 - 1) * (1 - sx), oy: (r(3) * 2 - 1) * (1 - sy), eight: (r(4) * 2 - 1) * .3,
    // Half the laps make little circles along the way (2 to 4), the others none.
    loops: 2 + Math.floor(r(5) * 3), loopSize: r(6) < .5 ? 0 : .1 + .08 * r(7)};
}
/** The orbit's point and height at angle `theta` (it grows without end, a lap every 2π): each lap its own circuit, blended into the
 * next one; the little loops fade in and out within their lap, so nothing jumps where two laps meet. The height swells three times a lap. */
export function orbitPoint(g: Pick<FlightGeometry, 'centre' | 'rx' | 'ry'>, theta: number): {x: number; y: number; altitude: number} {
  const turns = theta / (2 * Math.PI), lap = Math.floor(turns), u = turns - lap, k = ease(u);
  const a = lapShape(lap), b = lapShape(lap + 1), mix = (key: keyof LapShape) => lerp(a[key], b[key], k);
  const loop = a.loopSize * Math.sin(Math.PI * u) ** 2, spin = a.loops * theta, r = Math.min(g.rx, g.ry * 2);
  return {
    x: g.centre.x + g.rx * (mix('ox') + mix('sx') * Math.cos(theta)) + r * loop * Math.cos(spin),
    y: g.centre.y + g.ry * (mix('oy') + mix('sy') * (Math.sin(theta) + mix('eight') * Math.sin(2 * theta))) + r * loop * .5 * Math.sin(spin),
    altitude: ALTITUDE + SWELL * Math.sin(3 * theta),
  };
}
/** The orbit's angle nearest to a point (where she joins it from her enclosure). */
export const orbitAngle = (g: Pick<FlightGeometry, 'centre' | 'rx' | 'ry'>, p: Point): number => Math.atan2((p.y - g.centre.y) / Math.max(1, g.ry), (p.x - g.centre.x) / Math.max(1, g.rx));

const DURATION: Partial<Record<FlightPhase, number>> = {wake: WAKE_MS, rise: RISE_MS, toNursery: TO_NURSERY_MS, nursery: NURSERY_MS, rejoin: REJOIN_MS, descend: DESCEND_MS, settle: SETTLE_MS};

export class BennyFlightClock {
  phase: FlightPhase = 'ground';
  /** Time in the phase. */
  t = 0;
  /** Her power's show is running (she keeps flying until the nursery is done). */
  power = false;
  theta = 0;
  private omega = 2 * Math.PI / ORBIT_PERIOD;
  private tourLeft = 0;
  /** Time in the air since the wings appeared (the far wing fades in), and the beat clock. */
  private airborne = 0;
  private wingMs = 0;
  private glideIn = GLIDE_EVERY;
  private glideLeft = 0;
  private sinceStart = 0;
  private anchor = {x: 0, y: 0, altitude: 0};
  private position = {x: 0, y: 0, altitude: 0};
  private placed = false;
  private heading = {x: 1, y: 0};
  private view = SECTORS[0];
  private previous: {view: FlightView; mirror: boolean; k: number} | null = null;
  private tilt = 0;
  private lean = 0;
  private reducedShow = -1;

  /** "Faire voler Benny": she takes off (or turns back up if she was coming down). */
  takeOff(): void {
    if (this.phase === 'ground' || this.phase === 'settle') this.enter('wake');
    else if (this.phase === 'descend') this.enter('rejoin');
  }
  /** "Ramener Benny dans l'enclos": down she comes (after her power's show if it is running). */
  land(): void {
    if (this.power) return;
    if (this.phase === 'orbit' || this.phase === 'rejoin' || this.phase === 'rise' || this.phase === 'wake') this.enter('descend');
  }
  /** Her power: takes off if needed, a grand tour, the nursery, then back to her sky mode or her enclosure. Reduced motion: a glow. */
  usePower(reduced: boolean): void {
    if (reduced) { this.reducedShow = 0; return; }
    if (this.power) return;
    this.power = true; this.tourLeft = TOUR_MS;
    if (this.phase === 'ground' || this.phase === 'settle') { this.tourLeft = GROUND_TOUR_MS; this.enter('wake'); }
    else if (this.phase === 'descend') this.enter('rejoin');
  }
  /** Benny is away (a trip, the nest) or gone: everything stops, nothing left in the air. */
  reset(): void { this.phase = 'ground'; this.t = 0; this.power = false; this.reducedShow = -1; this.placed = false; this.previous = null; this.airborne = 0; }

  private enter(phase: FlightPhase): void {
    this.anchor = {...this.position}; this.phase = phase; this.t = 0;
    if (phase === 'wake') { this.airborne = 0; this.wingMs = 0; }
  }
  /** Straight onto her orbit, already flying (a reload, or back from reduced motion). */
  private resume(g: FlightGeometry): void {
    this.theta = orbitAngle(g, g.home); this.phase = 'orbit'; this.t = 0; this.airborne = 1e6; this.power = false;
    this.position = orbitPoint(g, this.theta); this.placed = true;
    const ahead = orbitPoint(g, this.theta + .01); this.heading = this.unit(ahead.x - this.position.x, ahead.y - this.position.y);
    this.view = SECTORS[sectorOf(headingAngle(this.heading.x, this.heading.y))]; this.previous = null; this.lean = this.view.lean;
  }
  private unit(x: number, y: number) { const n = Math.hypot(x, y) || 1; return {x: x / n, y: y / n}; }

  step({dt, sky, reduced, geometry: g}: FlightStep): FlightFrame {
    dt = clamp(dt, 0, 100); this.sinceStart += dt;
    if (!this.placed) { this.position = {x: g.home.x, y: g.home.y, altitude: 0}; this.placed = true; }
    if (this.reducedShow >= 0) { this.reducedShow += dt; if (this.reducedShow > REDUCED_POWER_MS) this.reducedShow = -1; }
    // The saved state wins when no command explains a difference.
    if (reduced) { if (this.phase !== 'ground') this.reset(); }
    else if (sky && this.phase === 'ground') this.resume(g);
    else if (!sky && !this.power && (this.phase === 'orbit' || this.phase === 'rejoin')) this.enter('descend');

    // The orbit's angle always moves on while she flies, so the orbit she joins keeps gliding ahead of her.
    const wantOmega = 2 * Math.PI / (this.power ? POWER_PERIOD : ORBIT_PERIOD);
    this.omega += (wantOmega - this.omega) * (1 - Math.exp(-dt / 700));
    if (this.phase !== 'ground') this.theta += this.omega * dt;
    this.t += dt;
    this.advance(dt, sky, g);
    const before = {...this.position};
    this.position = this.place(g);
    return this.frame(dt, before, g);
  }

  /** Ends of phases. */
  private advance(dt: number, sky: boolean, g: FlightGeometry): void {
    const length = DURATION[this.phase];
    if (this.phase === 'orbit' && this.power) {
      this.tourLeft -= dt;
      if (this.tourLeft <= 0) { if (g.nursery) this.enter('toNursery'); else { this.power = false; if (!sky) this.enter('descend'); } }
      return;
    }
    if (length === undefined || this.t < length) return;
    const after: Partial<Record<FlightPhase, () => FlightPhase>> = {
      wake: () => 'rise', rise: () => (sky || this.power ? 'orbit' : 'descend'), toNursery: () => 'nursery',
      nursery: () => { this.power = false; return sky ? 'rejoin' : 'descend'; }, rejoin: () => 'orbit', descend: () => 'settle', settle: () => 'ground',
    };
    const next = after[this.phase]!();
    if (next === 'ground') { this.phase = 'ground'; this.t = 0; return; }
    this.enter(next);
  }

  private nurseryHover(g: FlightGeometry) {
    const n = g.nursery ?? g.centre, a = this.sinceStart / 1000 * 2.4;
    return {x: n.x + NURSERY_CIRCLE * Math.cos(a), y: n.y + NURSERY_CIRCLE * .5 * Math.sin(a), altitude: g.nurseryAltitude ?? NURSERY_ALTITUDE};
  }
  /** Where she is now: each leg blends from where the last one left her, so nothing ever jumps. */
  private place(g: FlightGeometry): {x: number; y: number; altitude: number} {
    const u = clamp(this.t / (DURATION[this.phase] ?? 1)), a = this.anchor, s = ease(u);
    const blend = (to: {x: number; y: number; altitude: number}, k: number, h = k) => ({x: lerp(a.x, to.x, k), y: lerp(a.y, to.y, k), altitude: lerp(a.altitude, to.altitude, h)});
    // A spiral around the straight way, none at either end.
    const spiral = (p: {x: number; y: number; altitude: number}, k: number, turn: number) => {
      const r = SPIRAL * Math.sin(Math.PI * k), phi = turn * 2 * Math.PI * k - Math.PI / 2;
      return {...p, x: p.x + r * Math.cos(phi), y: p.y + r * .5 * Math.sin(phi)};
    };
    switch (this.phase) {
      case 'ground': return {x: g.home.x, y: g.home.y, altitude: 0};
      case 'wake': return {x: g.home.x, y: g.home.y, altitude: WAKE_LIFT * ease((this.t - WAKE_SPARKLE_MS) / (WAKE_MS - WAKE_SPARKLE_MS))};
      case 'rise': return spiral(blend(orbitPoint(g, this.theta), s, ease(u * 1.15)), s, g.facing === 1 ? 1.1 : -1.1);
      case 'orbit': return orbitPoint(g, this.theta);
      case 'toNursery': return blend(this.nurseryHover(g), s);
      case 'nursery': return this.nurseryHover(g);
      case 'rejoin': return blend(orbitPoint(g, this.theta), s);
      case 'descend': return spiral(blend({x: g.home.x, y: g.home.y, altitude: WAKE_LIFT}, s, ease(u * .9 + .1 * u * u)), s, this.heading.x >= 0 ? -1 : 1);
      case 'settle': return {x: g.home.x, y: g.home.y, altitude: WAKE_LIFT * (1 - ease(this.t / SETTLE_WINGS_MS))};
    }
  }

  private frame(dt: number, before: {x: number; y: number; altitude: number}, g: FlightGeometry): FlightFrame {
    const {phase, t} = this, p = this.position;
    const shown = phase !== 'ground' && (phase !== 'wake' || t >= WAKE_FADE[0]) && (phase !== 'settle' || t < SETTLE_FADE[1]);
    const ground = phase === 'wake' ? 1 - clamp((t - WAKE_FADE[0]) / (WAKE_FADE[1] - WAKE_FADE[0])) : phase === 'settle' ? clamp((t - SETTLE_FADE[0]) / (SETTLE_FADE[1] - SETTLE_FADE[0])) : phase === 'ground' ? 1 : 0;
    // Heading: the ground track's own movement, smoothed; on the ground and near the landing she is seen in profile.
    const vx = p.x - before.x, vy = p.y - before.y;
    if (dt > 0 && Math.hypot(vx, vy) > 1e-3) {
      const k = 1 - Math.exp(-dt / 120), was = Math.atan2(this.heading.y, this.heading.x);
      this.heading = this.unit(lerp(this.heading.x, vx / Math.hypot(vx, vy), k), lerp(this.heading.y, vy / Math.hypot(vx, vy), k));
      const turn = Math.atan2(Math.sin(Math.atan2(this.heading.y, this.heading.x) - was), Math.cos(Math.atan2(this.heading.y, this.heading.x) - was));
      this.tilt = lerp(this.tilt, clamp(turn / dt * 1000 * .05, -.1, .1), 1 - Math.exp(-dt / 250));
    }
    const profileOnly = phase === 'wake' || phase === 'settle' || phase === 'ground' || (phase === 'descend' && t > DESCEND_MS * .78);
    let want = this.view;
    if (profileOnly) want = SECTORS[(phase === 'wake' || phase === 'ground' ? g.facing === -1 : this.heading.x < 0) ? 4 : 0];
    else {
      const angle = headingAngle(this.heading.x, this.heading.y);
      if (!SECTORS.includes(this.view) || offCentre(angle, this.view) > this.view.half + VIEW_MARGIN) want = SECTORS[sectorOf(angle)];
    }
    if (want.view !== this.view.view || want.mirror !== this.view.mirror) {
      // A turn cross-fades, unless the rig is not drawn yet (or no more).
      this.previous = shown && phase !== 'wake' ? {view: this.view.view, mirror: this.view.mirror, k: 1} : null;
    } else if (this.previous) { this.previous.k -= dt / TURN_MS; if (this.previous.k <= 0) this.previous = null; }
    this.view = want;
    // The lean turns smoothly, both drawings of a cross-fade together (from the back straight to the back leaned: only the lean).
    this.lean = shown ? lerp(this.lean, want.lean, 1 - Math.exp(-dt / LEAN_MS)) : want.lean;
    if (Math.abs(this.lean - want.lean) < 1e-3) this.lean = want.lean;

    // Wings.
    let series: WingSeries = 'beat', frame = 1, back = 1;
    if (phase === 'wake') { series = 'appear'; frame = clamp(Math.floor((t - WAKE_SPARKLE_MS) / ((WAKE_MS - WAKE_SPARKLE_MS) / BEATS)) + 1, 1, BEATS); back = 0; }
    else if (phase === 'settle') { series = 'disappear'; frame = clamp(Math.floor(t / (SETTLE_WINGS_MS / BEATS)) + 1, 1, BEATS); back = 0; }
    else if (phase !== 'ground') {
      this.airborne += dt;
      const fps = phase === 'rise' ? RISE_FPS : this.power ? POWER_FPS : WING_FPS;
      const gliding = phase === 'orbit' && !this.power;
      if (this.glideLeft > 0) { this.glideLeft -= dt; if (!gliding) this.glideLeft = 0; }
      else {
        this.wingMs += dt;
        if (gliding) { this.glideIn -= dt; if (this.glideIn <= 0 && wingFrame(this.wingMs, fps) === GLIDE_FRAME) { this.glideLeft = GLIDE_MS; this.glideIn = GLIDE_EVERY; } }
      }
      frame = this.glideLeft > 0 ? GLIDE_FRAME : wingFrame(this.wingMs, fps);
      back = Math.min(clamp(this.airborne / 300), phase === 'descend' ? 1 - clamp((t - DESCEND_MS * .8) / (DESCEND_MS * .2)) : 1);
    }
    const body: 1 | 2 = series === 'beat' ? flightBody(frame, this.view.view) : 1;
    const up = clamp(p.altitude / ALTITUDE), depth = clamp((p.y - g.centre.y) / Math.max(1, g.ry), -1, 1);
    const scale = lerp(1, FLIGHT_SIZE * (1 + PERSPECTIVE * depth), up);
    // Nose up while climbing, down while coming down (profile and three-quarters), plus the bank of a turn.
    const climb = dt > 0 ? (p.altitude - before.altitude) / dt * 1000 : 0, side = this.view.mirror ? -1 : 1;
    const tilt = (this.view.view === 'face' || this.view.view === 'dos' ? 0 : -side * clamp(climb * .006, -.12, .12)) + this.tilt + this.lean;
    const bob = series === 'beat' && this.glideLeft <= 0 ? Math.sin(this.wingMs / 1000 * (phase === 'rise' ? RISE_FPS : WING_FPS) / BEATS * 2 * Math.PI) * 2.5 * up : 0;
    const powerFlight = this.power && AIRBORNE.includes(phase);
    const rain = phase === 'nursery' ? Math.sin(Math.PI * clamp(t / NURSERY_MS)) ** .5 : 0;
    const sparkle = phase === 'wake' ? 1 - clamp((t - WAKE_SPARKLE_MS * 1.6) / (WAKE_MS - WAKE_SPARKLE_MS * 1.6)) : phase === 'settle' ? clamp(1 - t / SETTLE_MS) : 0;
    const r = this.reducedShow;
    const glow = r < 0 ? null : r < REDUCED_POWER_MS / 2 ? {at: 'benny' as const, alpha: Math.sin(Math.PI * r / (REDUCED_POWER_MS / 2))} : {at: 'nursery' as const, alpha: Math.sin(Math.PI * (r - REDUCED_POWER_MS / 2) / (REDUCED_POWER_MS / 2))};
    return {phase, shown, ground, x: p.x, y: p.y, altitude: p.altitude, view: this.view.view, mirror: this.view.mirror, previous: this.previous ? {...this.previous} : null,
      wing: {series, frame, back}, body, dust: powerFlight, rain, feathers: powerFlight, sparkle, glow, scale, tilt, bob, lean: this.lean};
  }
}
