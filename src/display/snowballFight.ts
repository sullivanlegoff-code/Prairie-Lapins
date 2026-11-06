import type {Point} from '../ui/gestures';
import {endRabbitActivity, motionZone, startRabbitActivity, type Box, type RabbitMotion} from './rabbitMotion';

/**
 * The Christmas snowball fights (owner, 4 November 2026: « je veux que les lapins fassent de mini batailles de boules de neige »;
 * 5 November 2026: « les lapins sont trop proches […] Il doit aussi y avoir des batailles générales de temps en temps dans les enclos »).
 * Presentation only, like the chases. Two kinds:
 * - a duel: now and then two free rabbits of an enclosure run to the two ends of the fenced area and throw in turn;
 * - a general battle, more rarely: every free rabbit of the enclosure (three or more) splits into two camps, one on each side
 *   of the enclosure, and they all throw at the other camp for a while.
 * Each throw has a wind-up; a snowball may hit (the target is knocked back, with a puff), miss (it lands in the snow, with a
 * puff on the ground) or be dodged (the target hops over it). At the end, the camp that hit most hops for joy.
 * Never in reduced motion, never saved.
 */
export const SNOWBALL_EVENT = 'prairie-snowball-test';
export const SNOWBALL_BATTLE_EVENT = 'prairie-snowball-battle-test';
export const SNOWBALL_GAP: readonly [number, number] = [45_000, 100_000];
/** Time between two general battles of one enclosure (ms), and how many free rabbits one needs. */
export const SNOWBALL_BATTLE_GAP: readonly [number, number] = [150_000, 300_000];
export const SNOWBALL_BATTLE_MIN = 3;
/** Distance kept from the fence (enclosure units) and the widest gap between two duelling rabbits. */
export const SNOWBALL_MARGIN = 10, SNOWBALL_SPACING_MAX = 96, SNOWBALL_SPACING_MIN = 60;
/** Running speed towards the throwing places (units per second) and the longest wait before throwing anyway. */
export const SNOWBALL_RUN_SPEED = 42, SNOWBALL_SETUP_MAX = 3500;
/** Throws per duel; length of a general battle (ms). */
export const SNOWBALL_THROWS: readonly [number, number] = [4, 7];
export const SNOWBALL_BATTLE_LENGTH: readonly [number, number] = [14_000, 22_000];
/** Wind-up before the release, recoil of a hit, dodge hop, the cheer at the end (ms). */
export const SNOWBALL_WINDUP = 280, SNOWBALL_RECOIL = 360, SNOWBALL_DODGE = 380, SNOWBALL_CHEER = 1000;
/** Pause between two throws of one rabbit (ms): duel and battle. */
export const SNOWBALL_PAUSE: readonly [number, number] = [450, 900];
export const SNOWBALL_BATTLE_PAUSE: readonly [number, number] = [900, 2300];
/** Chances that a snowball misses or is dodged. */
export const SNOWBALL_MISS = .25, SNOWBALL_DODGE_CHANCE = .15;
/** Height of the snowball's arc above the straight line (enclosure units), for the shortest throw. */
export const SNOWBALL_ARC = 12;
const hash = (id: string) => { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface SnowballThrower {id: string; group: string; motion: RabbitMotion; available: boolean}
/**
 * A snowball in the air, `u` from 0 to 1 over `flight` ms. `start` and `end` are ground points of the enclosure;
 * `miss`: it ends in the snow (`end` is beside the target), otherwise it ends on the target's body.
 */
export interface Snowball {id: number; group: string; from: string; to: string; u: number; flight: number; start: Point; end: Point; arc: number; miss: boolean; dodge: boolean}
type Act = {kind: 'windup' | 'recoil' | 'dodge' | 'cheer'; t: number; length: number; target?: string};
interface Member {id: string; team: 0 | 1; place: Point; cooldown: number; act: Act | null; hits: number}
interface Fight {group: string; kind: 'duel' | 'battle'; members: Member[]; elapsed: number; length: number; throws: number; thrown: number; balls: Snowball[]; cheer: number; seed: number}
/** Extra pose of a thrower, added to its motion pose. */
export interface SnowballPose {lift: number; squashX: number; squashY: number; rotation: number}
const free = (r: SnowballThrower) => r.available && (r.motion.mode === 'rest' || r.motion.mode === 'walk');

/** The two places of a duel: near the two ends of the fenced area, at about the same height (kept inside it). */
export function fightPlaces(a: Point, b: Point, zone: Box, margin = SNOWBALL_MARGIN): [Point, Point] {
  const width = zone.maxX - zone.minX, spacing = clamp(width - 2 * margin, Math.min(SNOWBALL_SPACING_MIN, width), SNOWBALL_SPACING_MAX);
  const cx = clamp((a.x + b.x) / 2, zone.minX + spacing / 2, zone.maxX - spacing / 2);
  const cy = clamp((a.y + b.y) / 2, zone.minY, zone.maxY), left = a.x <= b.x;
  const l = {x: cx - spacing / 2, y: cy}, r = {x: cx + spacing / 2, y: cy};
  return left ? [l, r] : [r, l];
}
/** The places of a general battle: camp 0 along the left fence, camp 1 along the right one, spread from top to bottom. */
export function battlePlaces(count0: number, count1: number, zone: Box, margin = SNOWBALL_MARGIN): [Point[], Point[]] {
  const column = (count: number, x: number, shift: number) => {
    const top = zone.minY + 3, bottom = zone.maxY - 3;
    return Array.from({length: count}, (_, i) => ({x: x + (i % 2 ? shift : 0), y: count === 1 ? (top + bottom) / 2 : top + (bottom - top) * i / (count - 1)}));
  };
  return [column(count0, zone.minX + margin, 14), column(count1, zone.maxX - margin, -14)];
}
/** Position of a snowball along its arc, in enclosure units; `lift` is how high it is above the ground line. */
export function snowballPoint(from: Point, to: Point, u: number, arc = SNOWBALL_ARC): {x: number; y: number; lift: number} {
  const t = clamp(u, 0, 1);
  return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, lift: arc * 4 * t * (1 - t)};
}
/** The extra pose of one act (`t` in ms since it began). Leaning back means against the facing direction. */
export function snowballActPose(act: Act, facing: 1 | -1): SnowballPose {
  const u = clamp(act.t / act.length, 0, 1), bump = Math.max(0, Math.sin(Math.PI * u));
  if (act.kind === 'windup') {
    // Crouch while leaning back, then spring forward at the release.
    const crouch = u < .7 ? u / .7 : 1 - (u - .7) / .3;
    return {lift: u > .7 ? Math.max(0, 2.5 * Math.sin(Math.PI * (u - .7) / .3)) : 0, squashX: 1 + .08 * crouch, squashY: 1 - .12 * crouch, rotation: -facing * .14 * crouch + (u > .7 ? facing * .1 * Math.sin(Math.PI * (u - .7) / .3) : 0)};
  }
  if (act.kind === 'recoil') return {lift: 3 * bump, squashX: 1 - .05 * bump, squashY: 1 + .04 * bump, rotation: -facing * .22 * bump};
  if (act.kind === 'dodge') return {lift: 10 * bump, squashX: 1, squashY: 1, rotation: 0};
  return {lift: 6 * Math.abs(Math.sin(Math.PI * 2 * u)), squashX: 1, squashY: 1, rotation: 0};
}

export class SnowballFights {
  private clocks = new Map<string, {seed: number; remaining: number; battle: number}>();
  readonly active = new Map<string, Fight>();
  /** Snowballs that landed during the last step: the display shows a puff on the target, or on the snow for a miss. */
  readonly hits: Snowball[] = [];
  private nextBall = 1;
  private random(clock: {seed: number}): number { clock.seed = (clock.seed + 0x6D2B79F5) >>> 0; let t = clock.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private between(clock: {seed: number}, [a, b]: readonly [number, number]): number { return a + (b - a) * this.random(clock); }
  private clock(group: string) {
    let clock = this.clocks.get(group);
    if (!clock) {
      clock = {seed: hash(group) ^ 0x51ab, remaining: 0, battle: 0};
      clock.remaining = this.between(clock, SNOWBALL_GAP); clock.battle = this.between(clock, SNOWBALL_BATTLE_GAP); this.clocks.set(group, clock);
    }
    return clock;
  }

  /** `enabled`: the Christmas event is on. `force` starts a duel, `forceBattle` a general battle, wherever one may start. */
  step(dt: number, throwers: readonly SnowballThrower[], lifeActive: boolean, reduced: boolean, enabled: boolean, force = false, forceBattle = false): void {
    this.hits.length = 0;
    const ms = lifeActive && Number.isFinite(dt) && dt >= 0 && dt <= 1000 ? dt : 0, byId = new Map(throwers.map(r => [r.id, r]));
    for (const fight of [...this.active.values()]) this.advance(fight, ms, byId, enabled && !reduced);
    if (!enabled) return;
    const groups = new Map<string, SnowballThrower[]>();
    for (const r of throwers) if (!this.active.has(r.group)) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
    for (const [group, members] of groups) {
      const clock = this.clock(group), eligible = members.filter(free);
      if (reduced || eligible.length < 2) continue;
      const step = Math.max(0, Math.min(ms, 1000));
      if (forceBattle) clock.battle = 0; else clock.battle -= step;
      if (force) clock.remaining = 0; else clock.remaining -= step;
      if (clock.battle <= 0 && eligible.length >= SNOWBALL_BATTLE_MIN) {
        clock.battle = this.between(clock, SNOWBALL_BATTLE_GAP);
        // A duel never follows a battle at once.
        clock.remaining = Math.max(clock.remaining, SNOWBALL_GAP[0]);
        this.startBattle(group, eligible, clock);
      } else if (clock.remaining <= 0) {
        clock.remaining = this.between(clock, SNOWBALL_GAP);
        this.startDuel(group, eligible, clock);
      }
    }
  }
  private run(motion: RabbitMotion, place: Point): void {
    startRabbitActivity(motion, 'meet', place);
    const distance = Math.hypot(place.x - motion.from.x, place.y - motion.from.y);
    motion.duration = Math.max(300, distance / SNOWBALL_RUN_SPEED * 1000);
  }
  private startDuel(group: string, eligible: SnowballThrower[], clock: {seed: number}): void {
    const first = Math.floor(this.random(clock) * eligible.length), a = eligible[first], b = eligible[(first + 1) % eligible.length];
    const [pa, pb] = fightPlaces(a.motion.local, b.motion.local, motionZone(a.motion));
    // A small difference of height, so they do not stand on one line like statues.
    pb.y = clamp(pb.y + (this.random(clock) * 2 - 1) * 6, motionZone(b.motion).minY, motionZone(b.motion).maxY);
    this.run(a.motion, pa); this.run(b.motion, pb);
    const members: Member[] = [{id: a.id, team: 0, place: pa, cooldown: 300, act: null, hits: 0}, {id: b.id, team: 1, place: pb, cooldown: 300 + 700, act: null, hits: 0}];
    this.active.set(group, {group, kind: 'duel', members, elapsed: 0, length: Infinity, throws: Math.round(this.between(clock, SNOWBALL_THROWS)), thrown: 0, balls: [], cheer: 0, seed: clock.seed});
  }
  private startBattle(group: string, eligible: SnowballThrower[], clock: {seed: number}): void {
    // The rabbits on the left join the left camp: nobody crosses the whole enclosure.
    const sorted = [...eligible].sort((p, q) => p.motion.local.x - q.motion.local.x || p.motion.local.y - q.motion.local.y);
    const half = Math.ceil(sorted.length / 2), camps = [sorted.slice(0, half), sorted.slice(half)];
    const zone = motionZone(sorted[0].motion), [left, right] = battlePlaces(camps[0].length, camps[1].length, zone);
    const members: Member[] = [];
    camps.forEach((camp, team) => {
      const places = team === 0 ? left : right;
      // Each one takes the free place nearest to its own height.
      const order = [...camp].sort((p, q) => p.motion.local.y - q.motion.local.y);
      order.forEach((r, i) => { this.run(r.motion, places[i]); members.push({id: r.id, team: team as 0 | 1, place: places[i], cooldown: this.between(clock, [400, 1800]), act: null, hits: 0}); });
    });
    this.active.set(group, {group, kind: 'battle', members, elapsed: 0, length: this.between(clock, SNOWBALL_BATTLE_LENGTH), throws: Infinity, thrown: 0, balls: [], cheer: 0, seed: clock.seed});
  }

  private advance(fight: Fight, ms: number, byId: ReadonlyMap<string, SnowballThrower>, allowed: boolean): void {
    // A rabbit needed elsewhere or touched (it leaves its 'meet' place) quits; a fight with an empty camp ends.
    for (const member of [...fight.members]) {
      const r = byId.get(member.id);
      if (allowed && r && r.available && r.motion.mode === 'meet') continue;
      fight.members = fight.members.filter(m => m !== member);
      fight.balls = fight.balls.filter(b => b.from !== member.id && b.to !== member.id);
      if (r?.motion.mode === 'meet') endRabbitActivity(r.motion);
    }
    if (!fight.members.some(m => m.team === 0) || !fight.members.some(m => m.team === 1)) { this.end(fight, byId); return; }
    fight.elapsed += ms;
    const motion = (m: Member) => byId.get(m.id)!.motion;
    const arrived = (m: Member) => { const mo = motion(m); return mo.elapsed >= mo.duration || fight.elapsed >= SNOWBALL_SETUP_MAX; };
    const center = (team: 0 | 1) => { const camp = fight.members.filter(m => m.team === team); return camp.reduce((s, m) => s + motion(m).local.x, 0) / camp.length; };
    // Once in place, each one faces the other camp.
    const leftTeam: 0 | 1 = center(0) <= center(1) ? 0 : 1;
    for (const m of fight.members) { const mo = motion(m); if (mo.elapsed >= mo.duration) mo.facing = m.team === leftTeam ? 1 : -1; }
    // The acts under way.
    for (const m of fight.members) {
      if (!m.act) continue;
      m.act.t += ms;
      if (m.act.t < m.act.length) continue;
      const act = m.act; m.act = null;
      if (act.kind === 'windup' && act.target) this.release(fight, m, act.target, byId);
    }
    // The snowballs in the air.
    for (const ball of [...fight.balls]) {
      const target = fight.members.find(m => m.id === ball.to);
      const before = ball.u; ball.u += ms / ball.flight;
      // The dodger hops just before the snowball arrives.
      if (ball.dodge && target && before < .55 && ball.u >= .55 && !target.act) target.act = {kind: 'dodge', t: 0, length: SNOWBALL_DODGE};
      if (ball.u < 1) continue;
      fight.balls = fight.balls.filter(b => b !== ball);
      this.hits.push({...ball, u: 1});
      if (!ball.miss && target) {
        const thrower = fight.members.find(m => m.id === ball.from); if (thrower) thrower.hits++;
        if (!target.act || target.act.kind !== 'windup') target.act = {kind: 'recoil', t: 0, length: SNOWBALL_RECOIL};
        target.cooldown = Math.max(target.cooldown, 450);
      }
    }
    // The end: no more throws, the last snowballs land, then the camp that hit most cheers.
    const over = fight.kind === 'duel' ? fight.thrown >= fight.throws : fight.elapsed >= fight.length;
    if (over) {
      if (fight.balls.length || fight.members.some(m => m.act?.kind === 'windup')) return;
      if (fight.cheer === 0) {
        const score = [0, 1].map(team => fight.members.filter(m => m.team === team).reduce((s, m) => s + m.hits, 0));
        if (score[0] !== score[1]) for (const m of fight.members) if (m.team === (score[0] > score[1] ? 0 : 1)) m.act = {kind: 'cheer', t: 0, length: SNOWBALL_CHEER};
      }
      fight.cheer += ms;
      if (fight.cheer >= SNOWBALL_CHEER + 100 || !fight.members.some(m => m.act?.kind === 'cheer')) this.end(fight, byId);
      return;
    }
    // New throws: a rabbit in place, free, rested, with an opponent in place.
    const pause = fight.kind === 'duel' ? SNOWBALL_PAUSE : SNOWBALL_BATTLE_PAUSE;
    for (const m of fight.members) {
      m.cooldown -= ms;
      if (m.cooldown > 0 || m.act || !arrived(m)) continue;
      // A duel takes turns: never two snowballs of one duel in the air.
      if (fight.kind === 'duel' && (fight.balls.length || fight.members.some(o => o.act?.kind === 'windup') || fight.thrown >= fight.throws)) continue;
      const opponents = fight.members.filter(o => o.team !== m.team && arrived(o));
      if (!opponents.length) continue;
      const target = opponents[Math.floor(this.random(fight) * opponents.length)];
      m.act = {kind: 'windup', t: 0, length: SNOWBALL_WINDUP, target: target.id};
      m.cooldown = SNOWBALL_WINDUP + this.between(fight, pause);
      fight.thrown++;
    }
  }
  private release(fight: Fight, m: Member, targetId: string, byId: ReadonlyMap<string, SnowballThrower>): void {
    const from = byId.get(m.id)?.motion, to = byId.get(targetId)?.motion;
    if (!from || !to || !fight.members.some(o => o.id === targetId)) return;
    const start = {x: from.local.x + from.facing * 5, y: from.local.y};
    const roll = this.random(fight), dodge = roll < SNOWBALL_DODGE_CHANCE, miss = dodge || roll < SNOWBALL_DODGE_CHANCE + SNOWBALL_MISS;
    let end = {...to.local};
    if (miss) {
      // In the snow: short of the target, past it (a dodge always passes under it), or beside it.
      const zone = motionZone(to), dir = Math.sign(to.local.x - from.local.x) || 1, way = dodge ? 1 : this.random(fight) < .5 ? -1 : 1;
      end = {x: clamp(to.local.x + dir * way * (8 + 8 * this.random(fight)), zone.minX, zone.maxX), y: clamp(to.local.y + (this.random(fight) * 2 - 1) * 7, zone.minY, zone.maxY)};
    }
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    fight.balls.push({id: this.nextBall++, group: fight.group, from: m.id, to: targetId, u: 0, flight: 380 + distance * 3.4, start, end, arc: SNOWBALL_ARC + distance * .1, miss, dodge});
  }

  /** The snowballs in the air now. */
  balls(): Snowball[] { return [...this.active.values()].flatMap(f => f.balls); }
  isFighting(id: string): boolean { return [...this.active.values()].some(f => f.members.some(m => m.id === id)); }
  /** The kind of fight a rabbit is in, if any. */
  fightOf(id: string): 'duel' | 'battle' | null { for (const f of this.active.values()) if (f.members.some(m => m.id === id)) return f.kind; return null; }
  /** The extra pose of a thrower now (wind-up, recoil, dodge, cheer), or null. */
  pose(id: string, facing: 1 | -1): SnowballPose | null {
    for (const f of this.active.values()) { const m = f.members.find(x => x.id === id); if (m?.act) return snowballActPose(m.act, facing); }
    return null;
  }
  private end(fight: Fight, byId: ReadonlyMap<string, SnowballThrower | undefined>): void {
    for (const m of fight.members) { const r = byId.get(m.id); if (r?.motion.mode === 'meet') endRabbitActivity(r.motion); }
    this.active.delete(fight.group);
  }
  reset(throwers: readonly SnowballThrower[] = []): void {
    const byId = new Map(throwers.map(r => [r.id, r]));
    for (const fight of [...this.active.values()]) this.end(fight, byId);
    this.hits.length = 0;
  }
}
