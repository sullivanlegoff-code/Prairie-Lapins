import {VISUAL} from '../config/visual';
import type {Point} from '../ui/gestures';

/**
 * Purely visual wandering of the residents of one enclosure. Coordinates are local to the enclosure centre (the same
 * space as `rabbitOffset`). Nothing here is persisted, and nothing uses the breeding random generator: every
 * individual draws from its own small generator seeded by its identifier.
 */
export type MotionMode = 'rest' | 'walk' | 'hop' | 'salto' | 'fed' | 'sleep' | 'zoom' | 'meet' | 'kiss';
export interface RabbitMotion {
  mode: MotionMode;
  /** Milliseconds spent in the current mode (rest counts down in `wait`). */
  elapsed: number; wait: number; duration: number;
  from: Point; to: Point; local: Point; home: Point; count: number;
  facing: 1 | -1; steps: number; tempo: number; rng: number;
  /** Milliseconds since the body last turned, and until it may next turn by itself while resting. */
  sinceTurn: number; turnWait: number;
  /** Feeding happened mid-somersault: the reaction starts once the body has landed. */
  fedQueued: boolean;
  /** Zone of a larger enclosure (the laboratory's size preview); absent means the current enclosure. */
  layout?: MotionLayout;
}
/** What the body does above the ground point: height, slight compression and mirror. */
export interface RabbitPose {lift: number; squashX: number; squashY: number; facing: 1 | -1; /** Radians about the body centre, in the facing direction; 0 when upright. */ rotation: number}

const CONFIG = () => VISUAL.rabbit.roam;
/** Four half-periods of |sin(14 t)|: the hop after feeding ends exactly on the ground. */
export const FED_MS = 4 * Math.PI / 14 * 1000;
export const KISS_MS = 4000;

function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** mulberry32: small, deterministic, independent of the game's random generator. */
function random(m: RabbitMotion): number {
  m.rng = (m.rng + 0x6D2B79F5) >>> 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (m: RabbitMotion, low: number, high: number) => low + (high - low) * random(m);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Smaller groups roam freely; crowded ones stay close to their slot. */
const roamScale = (count: number) => count <= 3 ? 1 : count <= 5 ? .7 : .6;
/** Slots of crowded groups are 34 apart at the closest: two neighbours may each give up to a few units. */
export const minSeparation = (count: number) => count <= 3 ? 26 : count <= 5 ? 20 : 16;
export interface Box {minX: number; maxX: number; minY: number; maxY: number}
/** Hard limits of the wandering and how far each individual strays from its slot, when the enclosure is not the current size. */
export interface MotionLayout {zone: Box; roamScale: number}
/** Safe zone of one individual: around its slot, inside the fence zone of the enclosure. */
export function allowedBox(home: Point, count: number, layout?: MotionLayout): Box {
  const {radius} = CONFIG(), hard = layout?.zone ?? CONFIG().hard, scale = layout?.roamScale ?? roamScale(count);
  return {minX: Math.max(hard.minX, home.x - radius.x * scale), maxX: Math.min(hard.maxX, home.x + radius.x * scale),
    minY: Math.max(hard.minY, home.y - radius.y * scale), maxY: Math.min(hard.maxY, home.y + radius.y * scale)};
}

export function createRabbitMotion(id: string, home: Point, count: number, layout?: MotionLayout): RabbitMotion {
  const m: RabbitMotion = {mode: 'rest', elapsed: 0, wait: 0, duration: 0, from: {...home}, to: {...home}, local: {...home}, home: {...home}, count, layout,
    facing: 1, steps: 1, tempo: 1, rng: seedOf(id), fedQueued: false, sinceTurn: 1e9, turnWait: 0};
  m.tempo = between(m, .8, 1.3);
  // Staggered first move, so a freshly drawn group does not start in unison.
  m.wait = between(m, .2, 1) * CONFIG().restMax * 1000 * m.tempo;
  m.facing = random(m) < .5 ? 1 : -1;
  m.turnWait = between(m, .2, 1) * CONFIG().turn.restGapMax * 1000 * m.tempo;
  return m;
}

/** The slot of an existing individual changed (group size or enclosure layout): keep its place and walk back if needed. */
export function retargetRabbitMotion(m: RabbitMotion, home: Point, count: number, layout?: MotionLayout): void {
  m.home = {...home}; m.count = count; m.layout = layout;
  // A somersault or a feeding reaction finishes first; the end of the somersault walks it back if needed.
  if (m.mode === 'fed' || m.mode === 'salto') return;
  if (['sleep', 'zoom', 'meet', 'kiss'].includes(m.mode)) {
    const zone = motionZone(m);
    for (const point of [m.local, m.from, m.to]) { point.x = clamp(point.x, zone.minX, zone.maxX); point.y = clamp(point.y, zone.minY, zone.maxY); }
    return;
  }
  const box = allowedBox(home, count, layout), inside = m.local.x >= box.minX && m.local.x <= box.maxX && m.local.y >= box.minY && m.local.y <= box.maxY;
  if (!inside) startWalk(m, {x: clamp(m.local.x, box.minX, box.maxX), y: clamp(m.local.y, box.minY, box.maxY)});
}

export function triggerFedReaction(m: RabbitMotion): void {
  // Never flatten a body in mid-air: wait for the landing.
  if (m.mode === 'salto') { m.fedQueued = true; return; }
  m.mode = 'fed'; m.elapsed = 0; m.from = {...m.local}; m.to = {...m.local};
}

/** Dadi's arrival is an intentional in-place somersault, using the usual body pose and landing. */
export function triggerWelcomeSalto(m: RabbitMotion, reducedMotion: boolean): void {
  if (reducedMotion) return;
  m.mode = 'salto'; m.elapsed = 0; m.duration = CONFIG().salto.duration * 1000;
  m.from = {...m.local}; m.to = {...m.local};
}

export function startWalk(m: RabbitMotion, target: Point): void {
  const {speed} = CONFIG(), dx = target.x - m.local.x, dy = target.y - m.local.y, distance = Math.hypot(dx, dy);
  m.mode = 'walk'; m.elapsed = 0; m.from = {...m.local}; m.to = {...target};
  m.duration = Math.max(250, distance / (speed / m.tempo) * 1000);
  m.steps = Math.max(1, Math.round(distance / CONFIG().stepLength));
  // The body turns only when a walk starts, and only for a real horizontal move: no flicker.
  if (Math.abs(dx) > CONFIG().turnThreshold) turnTo(m, dx > 0 ? 1 : -1);
}
/** Presentation activities may use the whole fenced area, without changing an individual's home slot. */
export function motionZone(m: RabbitMotion): Box { return m.layout?.zone ?? CONFIG().hard; }
export function startRabbitActivity(m: RabbitMotion, mode: 'sleep' | 'zoom' | 'meet' | 'kiss', target?: Point): void {
  m.mode = mode; m.elapsed = 0; m.from = {...m.local}; m.to = target ? {...target} : {...m.local};
  m.duration = Math.max(250, Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) / (mode === 'zoom' ? 78 : 14) * 1000);
  m.steps = Math.max(1, Math.round(Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) / CONFIG().stepLength));
  if (Math.abs(m.to.x - m.from.x) > 2) turnTo(m, m.to.x > m.from.x ? 1 : -1);
}
/** End an activity in place, then gently return to the usual roaming zone if necessary. */
export function endRabbitActivity(m: RabbitMotion): void {
  const box = allowedBox(m.home, m.count, m.layout);
  if (m.local.x < box.minX || m.local.x > box.maxX || m.local.y < box.minY || m.local.y > box.maxY)
    startWalk(m, {x: clamp(m.local.x, box.minX, box.maxX), y: clamp(m.local.y, box.minY, box.maxY)});
  else startRest(m);
}
/** Every change of direction restarts both the minimum delay and the schedule of the next spontaneous turn. */
function turnTo(m: RabbitMotion, facing: 1 | -1): void {
  if (m.facing === facing) return;
  const {turn} = CONFIG();
  m.facing = facing; m.sinceTurn = 0; m.turnWait = between(m, turn.restGapMin, turn.restGapMax) * 1000 * m.tempo;
}
/** Time passes for the turning schedule in every mode; only a rest on the ground acts on it. */
function tick(m: RabbitMotion, ms: number): void { m.sinceTurn += ms; m.turnWait = Math.max(0, m.turnWait - ms); }
function startRest(m: RabbitMotion, scale = 1): void {
  const {restMin, restMax} = CONFIG();
  m.mode = 'rest'; m.elapsed = 0; m.wait = between(m, restMin, restMax) * 1000 * m.tempo * scale;
  // Landing, stopping or eating: a short settle before any spontaneous turn.
  m.turnWait = Math.max(m.turnWait, CONFIG().turn.settle * 1000);
}

/** Room for a somersault: away from the zone edge and from every neighbour. */
export function canSalto(m: RabbitMotion, others: readonly Point[]): boolean {
  const {salto} = CONFIG(), hard = m.layout?.zone ?? CONFIG().hard;
  return m.local.x - hard.minX >= salto.margin.x && hard.maxX - m.local.x >= salto.margin.x && m.local.y - hard.minY >= salto.margin.y && hard.maxY - m.local.y >= salto.margin.y &&
    others.every(other => Math.hypot(m.local.x - other.x, m.local.y - other.y) >= salto.clearance);
}

/** A nearby destination inside the safe zone, away from the others' places (and their destinations). */
function pickTarget(m: RabbitMotion, others: readonly Point[]): Point | null {
  const box = allowedBox(m.home, m.count, m.layout), {radius, minTravel} = CONFIG(), scale = m.layout?.roamScale ?? roamScale(m.count), separation = minSeparation(m.count);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = {x: clamp(m.home.x + (random(m) * 2 - 1) * radius.x * scale, box.minX, box.maxX),
      y: clamp(m.home.y + (random(m) * 2 - 1) * radius.y * scale, box.minY, box.maxY)};
    if (Math.hypot(candidate.x - m.local.x, candidate.y - m.local.y) < minTravel) continue;
    // Just turned: do not walk back the other way yet.
    const dx = candidate.x - m.local.x;
    if (m.sinceTurn < CONFIG().turn.minDelay * 1000 && Math.abs(dx) > CONFIG().turnThreshold && (dx > 0 ? 1 : -1) !== m.facing) continue;
    if (others.some(other => Math.hypot(candidate.x - other.x, candidate.y - other.y) < separation)) continue;
    return candidate;
  }
  return null;
}

/**
 * Advances one individual by `dtMs` of scene time. Consumed in slices so a long frame (an inactive tab coming
 * back) moves it by at most `maxStep`: it never jumps. Results depend on elapsed time, not on the frame rate.
 */
export function stepRabbitMotion(m: RabbitMotion, dtMs: number, others: readonly Point[] = []): void {
  let remaining = clamp(dtMs, 0, CONFIG().maxStep * 1000);
  for (let guard = 0; remaining > 0 && guard < 8; guard++) {
    if (m.mode === 'sleep' || m.mode === 'kiss') {
      m.elapsed += remaining; tick(m, remaining); remaining = 0;
    } else if (m.mode === 'zoom' || m.mode === 'meet') {
      const step = Math.min(remaining, Math.max(0, m.duration - m.elapsed)); m.elapsed += step; remaining -= step; tick(m, step);
      const u = clamp(m.elapsed / m.duration, 0, 1), eased = m.mode === 'zoom' ? u : u * u * (3 - 2 * u);
      m.local = {x: m.from.x + (m.to.x - m.from.x) * eased, y: m.from.y + (m.to.y - m.from.y) * eased};
      if (m.elapsed >= m.duration) {
        if (m.mode === 'meet') { remaining = 0; }
        else {
          const zone = motionZone(m), target = {x: between(m, zone.minX + 3, zone.maxX - 3), y: between(m, zone.minY + 2, zone.maxY - 2)};
          startRabbitActivity(m, 'zoom', target);
        }
      }
    } else if (m.mode === 'fed') {
      const step = Math.min(remaining, FED_MS - m.elapsed); m.elapsed += step; remaining -= step; tick(m, step);
      if (m.elapsed >= FED_MS) startRest(m, .25);
    } else if (m.mode === 'rest') {
      const step = Math.min(remaining, m.wait, m.turnWait > 0 ? m.turnWait : Infinity); tick(m, step); m.wait -= step; remaining -= step;
      // Resting on the ground: the moment to turn round by itself.
      if (m.turnWait <= 0) { turnTo(m, m.facing === 1 ? -1 : 1); m.wait = Math.max(m.wait, CONFIG().turn.settle * 1000); continue; }
      if (m.wait > 0) continue;
      const roll = random(m), saltoChance = CONFIG().salto.chance;
      if (roll < saltoChance) {
        // Deferred, not forced, when there is no room: rest a little and decide again.
        if (canSalto(m, others)) { m.mode = 'salto'; m.elapsed = 0; m.duration = CONFIG().salto.duration * 1000; } else startRest(m, .4);
      } else if ((roll - saltoChance) / (1 - saltoChance) < CONFIG().hopChance) { m.mode = 'hop'; m.elapsed = 0; m.duration = CONFIG().hopDuration * 1000; }
      else { const target = pickTarget(m, others); if (target) startWalk(m, target); else startRest(m, .5); }
    } else if (m.mode === 'walk') {
      const step = Math.min(remaining, m.duration - m.elapsed); m.elapsed += step; remaining -= step; tick(m, step);
      const u = m.duration > 0 ? clamp(m.elapsed / m.duration, 0, 1) : 1, eased = u * u * (3 - 2 * u);
      m.local = {x: m.from.x + (m.to.x - m.from.x) * eased, y: m.from.y + (m.to.y - m.from.y) * eased};
      if (m.elapsed >= m.duration) { m.local = {...m.to}; startRest(m); }
    } else if (m.mode === 'salto') {
      const step = Math.min(remaining, m.duration - m.elapsed); m.elapsed += step; remaining -= step; tick(m, step);
      if (m.elapsed >= m.duration) {
        // Landed upright, in place: feeding that came meanwhile reacts now; a slot that changed meanwhile is walked back to.
        const box = allowedBox(m.home, m.count, m.layout);
        if (m.fedQueued) { m.fedQueued = false; m.mode = 'rest'; triggerFedReaction(m); }
        else if (m.local.x < box.minX || m.local.x > box.maxX || m.local.y < box.minY || m.local.y > box.maxY) startWalk(m, {x: clamp(m.local.x, box.minX, box.maxX), y: clamp(m.local.y, box.minY, box.maxY)});
        else startRest(m);
      }
    } else {
      const step = Math.min(remaining, m.duration - m.elapsed); m.elapsed += step; remaining -= step; tick(m, step);
      if (m.elapsed >= m.duration) startRest(m);
    }
  }
}

export function rabbitPose(m: RabbitMotion): RabbitPose {
  const {hopHeight, hopDuration, walkBob, squash} = CONFIG(), motion = VISUAL.rabbit.motion;
  let lift = 0, crouch = 0, rotation = 0;
  if (m.mode === 'hop') {
    const u = clamp(m.elapsed / (hopDuration * 1000), 0, 1);
    lift = hopHeight * 4 * u * (1 - u); crouch = Math.max(0, 1 - u / .2, (u - .8) / .2);
  } else if (m.mode === 'salto') {
    const {salto} = CONFIG(), u = clamp(m.elapsed / m.duration, 0, 1), turn = clamp((u - .15) / .7, 0, 1);
    lift = salto.height * 4 * u * (1 - u); crouch = Math.max(0, 1 - u / .15, (u - .85) / .15);
    // One smooth turn while airborne; exactly upright (0) at take-off and at landing.
    rotation = u >= 1 ? 0 : m.facing * Math.PI * 2 * turn * turn * (3 - 2 * turn);
    if (turn >= 1) rotation = 0;
  } else if (m.mode === 'walk' || m.mode === 'zoom' || m.mode === 'meet') {
    const u = clamp(m.elapsed / m.duration, 0, 1);
    lift = (m.mode === 'zoom' ? 2.5 : walkBob) * Math.abs(Math.sin(Math.PI * m.steps * u));
  } else if (m.mode === 'kiss') {
    lift = Math.abs(Math.sin(m.elapsed / KISS_MS * Math.PI * 8)) * 4;
  } else if (m.mode === 'fed') {
    lift = Math.abs(Math.sin(m.elapsed / 1000 * 14)) * motion.hop;
  }
  return {lift, squashX: 1 + squash * .6 * crouch, squashY: 1 - squash * crouch, facing: m.facing, rotation};
}
