// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
// @ts-expect-error -- idem.
import {createHash} from 'node:crypto';
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
import {MeadowScene} from '../src/display/MeadowScene';
import {createGame} from '../src/state/initial';
import {BENNY_FLIGHT, BENNY_FLIGHT_ATLAS, BENNY_FLIGHT_EFFECTS, BENNY_MASTER_WIDTH, bennyFlightArt} from '../src/config/bennyFlightArt';
import {BENNY_ATLAS} from '../src/config/bennyArt';
import {ALTITUDE, BACK_LEAN, BEATS, BennyFlightClock, GLIDE_FRAME, ORBIT_PERIOD, TURN_MS, flightBody, flightView, lapShape, orbitPoint, wingFrame,
  type FlightFrame, type FlightGeometry, type FlightView} from '../src/display/bennyFlight';

const publicFile = (url: string) => 'public/' + url.replace(/^.*?assets\//, 'assets/');
const G: FlightGeometry = {home: {x: -60, y: 40}, facing: 1, centre: {x: 0, y: 0}, rx: 320, ry: 160, nursery: {x: 140, y: 30}};
const STEP = 20;
/** Steps the clock `ms` in 20 ms frames and records every frame. */
const run = (clock: BennyFlightClock, ms: number, o: {sky?: boolean; reduced?: boolean; geometry?: FlightGeometry} = {}, frames: FlightFrame[] = []) => {
  for (let t = 0; t < ms; t += STEP) frames.push(clock.step({dt: STEP, sky: o.sky ?? false, reduced: o.reduced ?? false, geometry: o.geometry ?? G}));
  return frames;
};
/** Until the phase is reached (at most `limit` ms); returns the frames. */
const until = (clock: BennyFlightClock, test: (f: FlightFrame) => boolean, o: Parameters<typeof run>[2] = {}, limit = 30000) => {
  const frames: FlightFrame[] = [];
  for (let t = 0; t < limit; t += STEP) { const f = run(clock, STEP, o)[0]; frames.push(f); if (test(f)) return frames; }
  throw Error('never reached');
};
const phases = (frames: FlightFrame[]) => frames.map(f => f.phase).filter((p, k, all) => p !== all[k - 1]);
/** Where her body is drawn: the ground track lifted by the altitude. */
const drawn = (f: FlightFrame) => ({x: f.x, y: f.y - f.altitude});
const largestJump = (frames: FlightFrame[]) => Math.max(...frames.slice(1).map((f, k) => Math.hypot(drawn(f).x - drawn(frames[k]).x, drawn(f).y - drawn(frames[k]).y)));

describe('Benny in the air: her circuits (owner, 10 November 2026)', () => {
  const laps = 12, frames = run(new BennyFlightClock(), ORBIT_PERIOD * laps, {sky: true});
  it('flies circles, never twice the same circuit, and some laps make little loops', () => {
    const shapes = Array.from({length: laps}, (_, k) => lapShape(k));
    expect(new Set(shapes.map(s => JSON.stringify(s))).size).toBe(laps);
    expect(shapes.some(s => s.loopSize > 0)).toBe(true); expect(shapes.some(s => s.loopSize === 0)).toBe(true);
    // The same lap always has the same shape (no random generator, nothing saved).
    expect(lapShape(5)).toEqual(lapShape(5));
    // Two laps apart, the same angle is not the same place.
    const a = orbitPoint(G, 1), b = orbitPoint(G, 1 + 2 * Math.PI);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(5);
  });
  it('never jumps where two laps meet, and stays above the island', () => {
    expect(largestJump(frames)).toBeLessThan(3);
    for (const f of frames) { expect(Math.abs(f.x - G.centre.x)).toBeLessThanOrEqual(G.rx * 1.12); expect(Math.abs(f.y - G.centre.y)).toBeLessThanOrEqual(G.ry * 1.4); }
  });
  it('is seen from the back less than a quarter of the time', () => {
    const back = frames.filter(f => f.view === 'dos').length / frames.length;
    expect(back).toBeGreaterThan(.05); expect(back).toBeLessThan(.25);
  });
});

describe('Benny in the air: angles', () => {
  it('chooses the view from her heading, mirroring only the left side, the back (leaned) only near straight away', () => {
    const cases: [number, number, FlightView, boolean, number][] = [
      [1, 0, 'profil', false, 0], [1, .5, '34devant', false, 0], [0, 1, 'face', false, 0], [-1, .5, '34devant', true, 0],
      [-1, 0, 'profil', true, 0], [-.4, -1, 'dos', false, -BACK_LEAN], [0, -1, 'dos', false, 0], [.4, -1, 'dos', false, BACK_LEAN],
      // Going diagonally away (owner, 10 November 2026: less often from the back): the profile.
      [-1, -.5, 'profil', true, 0], [1, -.5, 'profil', false, 0],
    ];
    for (const [dx, dy, view, mirror, lean] of cases) expect(flightView(dx, dy), `${dx},${dy}`).toEqual({view, mirror, lean});
    // About 20°, leaned towards her way: clockwise (positive) going up-right, anticlockwise going up-left.
    expect(BACK_LEAN).toBeCloseTo(20 * Math.PI / 180);
    // Going sideways stays in profile even with a little depth; the ground's slant counts screen y twice.
    expect(flightView(1, .15).view).toBe('profil'); expect(flightView(-1, -.15)).toEqual({view: 'profil', mirror: true, lean: 0});
  });
  it('shows the four views and both sides during one turn of the island, each change cross-faded', () => {
    const clock = new BennyFlightClock(), frames = run(clock, ORBIT_PERIOD + 2000, {sky: true});
    expect(frames[0].phase).toBe('orbit');
    expect(new Set(frames.map(f => f.view))).toEqual(new Set(['profil', '34devant', 'face', 'dos']));
    expect(frames.some(f => f.view === 'profil' && f.mirror)).toBe(true); expect(frames.some(f => f.view === 'profil' && !f.mirror)).toBe(true);
    let changes = 0;
    frames.slice(1).forEach((f, k) => {
      const before = frames[k];
      if (f.view !== before.view || f.mirror !== before.mirror) { changes++; expect(f.previous).toEqual({view: before.view, mirror: before.mirror, k: 1}); }
    });
    expect(changes).toBeGreaterThanOrEqual(6);
    // The old view fades over TURN_MS, never longer.
    const fading = frames.filter(f => f.previous); expect(fading.length).toBeLessThanOrEqual(changes * (TURN_MS / STEP + 1));
    // The view follows her real direction on the orbit (clockwise on screen: going down on the right, left at the front).
    // Every lap has its own circuit: her rightmost and frontmost points on this one (there she goes straight down, then left).
    const settled = frames.filter(f => !f.previous), most = (key: (f: FlightFrame) => number) => settled.reduce((a, b) => key(b) > key(a) ? b : a);
    const right = most(f => f.x), front = most(f => f.y);
    expect(right.view).toBe('face'); expect(front).toMatchObject({view: 'profil', mirror: true});
    // Going away (the back of the island): the back, never mirrored, leaned both ways and straight.
    const away = frames.filter(f => f.view === 'dos');
    expect(away.every(f => !f.mirror)).toBe(true);
    expect(away.some(f => f.lean > BACK_LEAN * .95)).toBe(true); expect(away.some(f => f.lean < -BACK_LEAN * .95)).toBe(true); expect(away.some(f => f.lean === 0)).toBe(true);
  });
  it('turns the back\'s lean smoothly, never jumping, and adds it to the tilt', () => {
    const clock = new BennyFlightClock(), frames = run(clock, ORBIT_PERIOD + 2000, {sky: true});
    const leans = frames.map(f => f.lean);
    expect(Math.max(...leans)).toBeCloseTo(BACK_LEAN); expect(Math.min(...leans)).toBeCloseTo(-BACK_LEAN);
    // In 20 ms the lean turns at most a quarter of its way (time constant LEAN_MS), so no step of the whole 20°.
    const steps = leans.slice(1).map((l, k) => Math.abs(l - leans[k]));
    expect(Math.max(...steps)).toBeLessThan(BACK_LEAN * .25);
    // A lean appears only on the back, or fading out of it within 0.4 s.
    for (const [k, f] of frames.entries()) if (f.view !== 'dos' && Math.abs(f.lean) > .01) expect(frames.slice(Math.max(0, k - 400 / STEP), k).some(g => g.view === 'dos'), `frame ${k}`).toBe(true);
    // The tilt holds the lean (plus at most the small bank of a turn).
    for (const f of frames.filter(f => f.view === 'dos')) expect(Math.abs(f.tilt - f.lean)).toBeLessThanOrEqual(.1 + 1e-9);
  });
});

describe('Benny in the air: wings and bodies', () => {
  it('beats in a loop of 8 pictures, the paws stretched on the down stroke, the back in its own order', () => {
    expect(Array.from({length: 17}, (_, k) => wingFrame(k * 1000 / 11 + 1, 11))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1]);
    for (const view of ['profil', '34devant', 'face'] as const) expect([1, 2, 3, 4, 5, 6, 7, 8].map(k => flightBody(k, view))).toEqual([1, 1, 2, 2, 2, 2, 1, 1]);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(k => flightBody(k))).toEqual([1, 1, 2, 2, 2, 2, 1, 1]);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(k => flightBody(k, 'dos'))).toEqual([1, 2, 2, 1, 1, 2, 2, 1]);
    expect(BEATS).toBe(BENNY_FLIGHT.beats);
  });
  it('flies with her wings always beating, about 11 a second, the two bodies alternating, and glides now and then', () => {
    const frames = run(new BennyFlightClock(), 16000, {sky: true}), beats = frames.map(f => f.wing.frame);
    expect(frames.every(f => f.wing.series === 'beat' && f.shown && f.wing.back === 1)).toBe(true);
    expect(new Set(beats)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(new Set(frames.map(f => f.body))).toEqual(new Set([1, 2]));
    // Pictures per second outside the glides: a change at most every 2 frames of 20 ms (12.5 a second) and at least 10 a second.
    const changes = beats.slice(1).filter((b, k) => b !== beats[k]).length, seconds = 16;
    expect(changes / seconds).toBeGreaterThan(8); expect(changes / seconds).toBeLessThan(12.5);
    // A glide: the wings held flat (picture 3) for about a second.
    let longest = 0, run3 = 0; for (const b of beats) { run3 = b === GLIDE_FRAME ? run3 + 1 : 0; longest = Math.max(longest, run3); }
    expect(longest * STEP).toBeGreaterThanOrEqual(900);
  });
});

describe('Benny in the air: sequences', () => {
  it('takes off: sparkles, wings born in profile (1 to 8), A1 handing over, a spiral up to her orbit', () => {
    const clock = new BennyFlightClock();
    expect(run(clock, 200)).toSatisfy((f: FlightFrame[]) => f.every(x => x.phase === 'ground' && !x.shown && x.ground === 1));
    clock.takeOff();
    const frames = until(clock, f => f.phase === 'orbit', {sky: true});
    expect(phases(frames)).toEqual(['wake', 'rise', 'orbit']);
    const wake = frames.filter(f => f.phase === 'wake');
    expect(wake[0]).toMatchObject({shown: false, ground: 1}); expect(wake[0].sparkle).toBeGreaterThan(0);
    const appear = wake.filter(f => f.shown).map(f => f.wing);
    expect(appear.every(w => w.series === 'appear' && w.back === 0)).toBe(true);
    expect([...new Set(appear.map(w => w.frame))]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(wake.filter(f => f.shown).every(f => f.view === 'profil' && !f.mirror)).toBe(true);
    expect(wake.at(-1)!.ground).toBe(0);
    const rise = frames.filter(f => f.phase === 'rise');
    expect(rise.at(-1)!.altitude).toBeGreaterThan(ALTITUDE * .8);
    expect(frames.every(f => !f.dust && !f.feathers && f.rain === 0)).toBe(true);
    expect(largestJump(frames)).toBeLessThan(12);
  });
  it('takes off facing the way A1 looked in her enclosure', () => {
    const clock = new BennyFlightClock(); clock.takeOff();
    const wake = until(clock, f => f.phase === 'rise', {sky: true, geometry: {...G, facing: -1}}).filter(f => f.phase === 'wake' && f.shown);
    expect(wake.every(f => f.view === 'profil' && f.mirror)).toBe(true);
  });
  it('turns round her island in sky mode without stardust, then spirals down and folds her wings away (1 to 8)', () => {
    const clock = new BennyFlightClock();
    const sky = run(clock, 30000, {sky: true});
    expect(sky.every(f => f.phase === 'orbit' && !f.dust && !f.feathers && f.rain === 0 && f.sparkle === 0)).toBe(true);
    // Gentle swells of altitude, a smaller Benny at the back of the island.
    const heights = sky.map(f => f.altitude); expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(6);
    const back = sky.reduce((a, b) => b.y < a.y ? b : a), front = sky.reduce((a, b) => b.y > a.y ? b : a); expect(back.scale).toBeLessThan(front.scale);
    clock.land();
    const frames = until(clock, f => f.phase === 'ground', {sky: false});
    expect(phases(frames)).toEqual(['descend', 'settle', 'ground']);
    const vanish = frames.filter(f => f.phase === 'settle' && f.shown).map(f => f.wing);
    expect(vanish.every(w => w.series === 'disappear')).toBe(true);
    expect([...new Set(vanish.map(w => w.frame))]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(frames.filter(f => f.phase === 'settle').every(f => f.view === 'profil')).toBe(true);
    expect(frames.at(-1)).toMatchObject({shown: false, ground: 1, x: G.home.x, y: G.home.y, altitude: 0});
    expect(frames.every(f => !f.dust)).toBe(true);
    expect(largestJump([...sky.slice(-1), ...frames])).toBeLessThan(12);
  });
  it('lands by herself when the saved sky mode ends without a command (another save)', () => {
    const clock = new BennyFlightClock(); run(clock, 2000, {sky: true});
    expect(phases(until(clock, f => f.phase === 'ground', {sky: false}))).toEqual(['descend', 'settle', 'ground']);
  });
});

describe('Benny\'s power in the air', () => {
  it('from her enclosure: takes off, a grand tour with stardust and feathers, a rain over the nursery, then lands', () => {
    const clock = new BennyFlightClock(); run(clock, 200);
    clock.usePower(false);
    const frames = until(clock, f => f.phase === 'ground', {sky: false});
    expect(phases(frames)).toEqual(['wake', 'rise', 'orbit', 'toNursery', 'nursery', 'descend', 'settle', 'ground']);
    const seconds = frames.length * STEP / 1000; expect(seconds).toBeGreaterThanOrEqual(8); expect(seconds).toBeLessThanOrEqual(12.5);
    const flying = frames.filter(f => ['rise', 'orbit', 'toNursery', 'nursery'].includes(f.phase));
    expect(flying.every(f => f.dust && f.feathers)).toBe(true);
    // Her show ends with the nursery: she comes down without the trail.
    expect(frames.filter(f => ['wake', 'descend', 'settle'].includes(f.phase)).every(f => !f.dust)).toBe(true);
    // The rain falls only above the nursery, while she circles over its roof.
    const rain = frames.filter(f => f.rain > 0);
    expect(rain.length * STEP).toBeGreaterThan(1200);
    expect(rain.every(f => f.phase === 'nursery' && Math.hypot(f.x - G.nursery!.x, (f.y - G.nursery!.y) * 2) < 40)).toBe(true);
    expect(largestJump(frames)).toBeLessThan(14);
  });
  it('in sky mode: the show, then back on her orbit without any dust', () => {
    const clock = new BennyFlightClock(); run(clock, 3000, {sky: true});
    clock.usePower(false); clock.usePower(false); // A second press changes nothing.
    const show = until(clock, f => f.phase === 'orbit' && !f.dust, {sky: true});
    expect(phases(show)).toEqual(['orbit', 'toNursery', 'nursery', 'rejoin', 'orbit']);
    const seconds = show.length * STEP / 1000; expect(seconds).toBeGreaterThanOrEqual(7); expect(seconds).toBeLessThanOrEqual(10);
    expect(run(clock, 5000, {sky: true}).every(f => f.phase === 'orbit' && !f.dust && f.rain === 0)).toBe(true);
    expect(largestJump(show)).toBeLessThan(14);
  });
  it('without a nursery (laboratory), the tour only', () => {
    const clock = new BennyFlightClock(); clock.usePower(false);
    const frames = until(clock, f => f.phase === 'ground', {geometry: {...G, nursery: null}});
    expect(frames.every(f => f.rain === 0)).toBe(true); expect(phases(frames)).not.toContain('nursery');
  });
});

describe('Benny in the air: reduced motion and reloads', () => {
  it('reduced motion: no flight at all; her power is a still glow on her, then on the nursery', () => {
    const clock = new BennyFlightClock();
    expect(run(clock, 5000, {sky: true, reduced: true}).every(f => f.phase === 'ground' && !f.shown && f.ground === 1 && !f.glow)).toBe(true);
    clock.usePower(true);
    const frames = run(clock, 3000, {sky: true, reduced: true});
    expect(frames.every(f => !f.shown && !f.dust && f.ground === 1)).toBe(true);
    const at = frames.filter(f => f.glow && f.glow.alpha > 0).map(f => f.glow!.at);
    expect([...new Set(at)]).toEqual(['benny', 'nursery']);
    expect(frames.at(-1)!.glow).toBeNull();
    // Switched on while she flies: she is straight back in her enclosure.
    const flying = new BennyFlightClock(); run(flying, 1000, {sky: true});
    expect(run(flying, 40, {sky: true, reduced: true}).at(-1)).toMatchObject({phase: 'ground', shown: false, ground: 1});
  });
  it('a reload in sky mode puts her straight back on her orbit, without taking off again', () => {
    const clock = new BennyFlightClock(), first = run(clock, STEP, {sky: true})[0];
    expect(first).toMatchObject({phase: 'orbit', shown: true, ground: 0, previous: null});
    expect(first.wing.series).toBe('beat');
    const near = orbitPoint(G, Math.atan2((G.home.y - G.centre.y) / G.ry, (G.home.x - G.centre.x) / G.rx));
    expect(Math.hypot(first.x - near.x, first.y - near.y)).toBeLessThan(10);
  });
  it('gone from the meadow (a trip), then back: nothing left in the air, then her orbit again', () => {
    const clock = new BennyFlightClock(); clock.usePower(false); run(clock, 3000);
    clock.reset();
    expect(clock.power).toBe(false); expect(clock.phase).toBe('ground');
    expect(run(clock, STEP, {sky: true})[0].phase).toBe('orbit');
  });
});

describe('Benny\'s flight art', () => {
  const json = () => JSON.parse(readFileSync(publicFile(BENNY_FLIGHT_ATLAS.atlas), 'utf8')) as {frames: Record<string, {frame: {x: number; y: number; w: number; h: number}; trimmed: boolean;
    spriteSourceSize: {x: number; y: number; w: number; h: number}; sourceSize: {w: number; h: number}}>; meta: {image: string; size: {w: number; h: number}}};
  it('ships one light WebP atlas matching its frames and its checks', () => {
    const file = publicFile(BENNY_FLIGHT_ATLAS.url); expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file) as Uint8Array;
    expect(String.fromCharCode(...bytes.subarray(8, 12))).toBe('WEBP');
    expect(bytes.length).toBe(BENNY_FLIGHT.atlas.bytes); expect(bytes.length).toBeLessThan(600 * 1024);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(BENNY_FLIGHT.atlas.sha256);
    const atlas = json();
    expect(atlas.meta.image).toBe('benny-flight.webp'); expect(atlas.meta.size).toEqual({w: BENNY_FLIGHT.atlas.width, h: BENNY_FLIGHT.atlas.height});
    expect(Math.max(atlas.meta.size.w, atlas.meta.size.h)).toBeLessThanOrEqual(2048);
    expect(Object.keys(atlas.frames).sort()).toEqual([...BENNY_FLIGHT.frames].sort());
    for (const [name, frame] of Object.entries(atlas.frames)) {
      const square = name.startsWith('body-') ? BENNY_FLIGHT.body.size : BENNY_FLIGHT.wing.size;
      expect(frame.sourceSize, name).toEqual({w: square, h: square});
      expect(frame.frame.x + frame.frame.w).toBeLessThanOrEqual(atlas.meta.size.w); expect(frame.frame.y + frame.frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
      expect(frame.spriteSourceSize.x + frame.spriteSourceSize.w).toBeLessThanOrEqual(square); expect(frame.spriteSourceSize.y + frame.spriteSourceSize.h).toBeLessThanOrEqual(square);
    }
  });
  it('declares a full rig for each of the four views, the wings\' appearance and disappearance', () => {
    const frames = new Set(BENNY_FLIGHT.frames);
    expect(Object.keys(BENNY_FLIGHT.views).sort()).toEqual(['34devant', 'dos', 'face', 'profil']);
    // No more three-quarter back: the back serves the diagonals going away.
    expect(BENNY_FLIGHT.frames.filter(name => name.includes('34derriere'))).toEqual([]);
    expect(Object.keys(json().frames).filter(name => name.includes('34derriere'))).toEqual([]);
    // The back's textures (concept B): its two bodies and its wing's 8 beats, the right wing drawn mirrored.
    for (const name of ['body-dos-1', 'body-dos-2', ...Array.from({length: BEATS}, (_, k) => `wing-dos-left-${k + 1}`)]) { expect(frames.has(name), name).toBe(true); expect(json().frames[name], name).toBeDefined(); }
    expect(BENNY_FLIGHT.views.dos.wings.map(w => w.series)).toEqual(['wing-dos-left', 'wing-dos-left']);
    // Its shoulders on the shoulder blades, either side of the spine (x 502 in the 900 frame), at the same height.
    const [left, right] = BENNY_FLIGHT.views.dos.wings.map(w => w.shoulder);
    expect(left[1]).toBe(right[1]); expect(Math.abs((left[0] + right[0]) / 2 - 502)).toBeLessThanOrEqual(5); expect(right[0] - left[0]).toBe(89);
    for (const [view, rig] of Object.entries(BENNY_FLIGHT.views)) {
      expect(rig.bodies, view).toEqual([`body-${view}-1`, `body-${view}-2`]);
      for (const body of rig.bodies) expect(frames.has(body)).toBe(true);
      expect(rig.wings).toHaveLength(2);
      for (const wing of rig.wings) {
        for (let k = 1; k <= BEATS; k++) expect(frames.has(`${wing.series}-${k}`), `${view} ${wing.series}-${k}`).toBe(true);
        for (const c of wing.shoulder) { expect(c).toBeGreaterThan(200); expect(c).toBeLessThan(700); }
      }
    }
    // The far wing of the side views is darkened behind the body; the face's wings both behind, the back's both in front; right = mirror.
    for (const view of ['profil', '34devant'] as const) expect(BENNY_FLIGHT.views[view].wings.map(w => [w.layer, w.darken])).toEqual([['front', false], ['behind', true]]);
    expect(BENNY_FLIGHT.views.face.wings.map(w => [w.layer, w.mirror])).toEqual([['behind', false], ['behind', true]]);
    expect(BENNY_FLIGHT.views.dos.wings.map(w => [w.layer, w.mirror])).toEqual([['front', false], ['front', true]]);
    for (const series of [BENNY_FLIGHT.transition.appear, BENNY_FLIGHT.transition.disappear]) for (let k = 1; k <= BEATS; k++) expect(frames.has(`${series}-${k}`)).toBe(true);
    expect(BENNY_FLIGHT.frames).toHaveLength(8 + 7 * 8);
  });
  it('is made by its script at A1\'s scale, every body recoloured onto A1', () => {
    const script = readFileSync('scripts/prepare-benny-flight.mjs', 'utf8');
    expect(script).toContain('export const SCALE = .4'); expect(BENNY_FLIGHT.scale).toBe(.4);
    expect([BENNY_FLIGHT.body, BENNY_FLIGHT.wing]).toEqual([{source: 900, size: 360}, {source: 1200, size: 480}]);
    const master = readFileSync('assets-source/rabbits/benny/sprite.png') as Uint8Array;
    expect(new DataView(master.buffer, master.byteOffset).getUint32(16)).toBe(BENNY_MASTER_WIDTH);
    const colour = (BENNY_FLIGHT as unknown as {colour: Record<string, {after: {fur: number; mask: number}}>}).colour;
    expect(Object.keys(colour)).toHaveLength(8);
    for (const [name, c] of Object.entries(colour)) { expect(c.after.fur, name).toBeLessThan(1.5); expect(Math.abs(c.after.mask), name).toBeLessThan(1.5); }
    for (const art of [...Object.values(BENNY_FLIGHT_EFFECTS).flat()]) expect(existsSync(publicFile(art.url)), art.url).toBe(true);
  });
  it('is loaded only in a meadow with Benny: the atlas as a Phaser atlas, the effects as images', () => {
    const s = new MeadowScene({} as never, () => {}, () => false) as any, state = createGame(0);
    const keys = bennyFlightArt().map(a => a.texture);
    expect(s.requiredArt(state).map((a: any) => a.texture).filter((k: string) => keys.includes(k))).toEqual([]);
    state.rabbits.push({id: 'rabbit-benny', species: 'benny', affection: 0, enclosureId: state.rabbits[0]?.enclosureId ?? 'enclosure-1'});
    expect(s.requiredArt(state).map((a: any) => a.texture).filter((k: string) => keys.includes(k)).sort()).toEqual([...keys].sort());
    const loaded = new Set<string>(); s.current = state; s.sceneReady = true; s.lifeGeneration = 1;
    s.textures = {exists: (key: string) => loaded.has(key)};
    s.load = {image: vi.fn(), atlas: vi.fn(), once: vi.fn(), start: vi.fn()}; s.loading = {runtime: vi.fn()};
    s.ensureArt();
    expect(s.load.atlas.mock.calls).toEqual([[BENNY_ATLAS.texture, BENNY_ATLAS.url, BENNY_ATLAS.atlas], [BENNY_FLIGHT_ATLAS.texture, BENNY_FLIGHT_ATLAS.url, BENNY_FLIGHT_ATLAS.atlas]]);
    const images = s.load.image.mock.calls.map((c: any[]) => c[0]);
    for (const key of keys.filter(k => k !== BENNY_FLIGHT_ATLAS.texture)) expect(images).toContain(key);
  });
});
