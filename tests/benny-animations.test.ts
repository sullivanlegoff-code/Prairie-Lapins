// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
import {MeadowScene} from '../src/display/MeadowScene';
import {createGame} from '../src/state/initial';
import {BENNY_ATLAS, BENNY_FRAMES, BENNY_ORIGIN, bennyMeadowArt} from '../src/config/bennyArt';
import {rabbitArt} from '../src/config/rabbitArt';
import frameConfig from '../src/config/bennyFrames.json';
import {ACT_GAP, BENNY_ACTS, BennyClock, FACE_GAP, FLOP_LYING_MS, HOP_KEYS, TAP_COOLDOWN_MS, bennyBody, bennyPlan, bennyShadow, hopTravel, keyAt, planDuration,
  type BennyActState, type BennyStep} from '../src/display/bennyTimeline';
import {createRabbitMotion, endPerform, motionZone, startPerform, stepRabbitMotion} from '../src/display/rabbitMotion';

const publicFile = (url: string) => 'public/' + url.replace(/^.*?assets\//, 'assets/');
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u24 = (b: Uint8Array, at: number) => b[at] | b[at + 1] << 8 | b[at + 2] << 16;
function webpSize(bytes: Uint8Array): [number, number] {
  expect(ascii(bytes, 0, 4)).toBe('RIFF'); expect(ascii(bytes, 8, 12)).toBe('WEBP');
  expect(ascii(bytes, 12, 16)).toBe('VP8X');
  return [1 + u24(bytes, 24), 1 + u24(bytes, 27)];
}
const atlasJson = () => JSON.parse(readFileSync(publicFile(BENNY_ATLAS.atlas), 'utf8')) as {frames: Record<string, {frame: {x: number; y: number; w: number; h: number}; trimmed: boolean;
  spriteSourceSize: {x: number; y: number; w: number; h: number}; sourceSize: {w: number; h: number}}>; meta: {image: string; size: {w: number; h: number}}};
const IDLE: BennyStep = {active: true, idle: true, asleep: false, reduced: false};
const run = (clock: BennyClock, ms: number, step: Partial<BennyStep> = {}, frames: (string | null)[] = []) => {
  for (let t = 0; t < ms; t += 20) { clock.step(20, {...IDLE, ...step}); frames.push(clock.frame(step.asleep)); }
  return frames;
};
/** Plays an act to its end and records each picture (one every 10 ms). */
const playThrough = (clock: BennyClock, state: BennyActState | null) => {
  expect(state).not.toBeNull(); const frames: (string | null)[] = [];
  for (let t = 0; t <= state!.duration + 20; t += 10) { clock.step(10, {...IDLE, idle: false}); frames.push(clock.frame()); }
  return frames;
};

describe('Benny frames', () => {
  it('ships one WebP atlas of the declared size, with every frame inside it, in the common frame', () => {
    const file = publicFile(BENNY_ATLAS.url); expect(existsSync(file)).toBe(true);
    const json = atlasJson(), bytes = readFileSync(file);
    expect(webpSize(bytes)).toEqual([json.meta.size.w, json.meta.size.h]);
    expect(json.meta.image).toBe('benny-frames.webp');
    expect(frameConfig.atlas.bytes).toBe(bytes.length);
    // A size an iPhone accepts as one texture.
    expect(Math.max(json.meta.size.w, json.meta.size.h)).toBeLessThanOrEqual(4096);
    for (const [name, frame] of Object.entries(json.frames)) {
      expect(frame.trimmed, name).toBe(true);
      expect(frame.sourceSize).toEqual({w: BENNY_FRAMES.canvas.width, h: BENNY_FRAMES.canvas.height});
      expect(frame.frame.x + frame.frame.w).toBeLessThanOrEqual(json.meta.size.w); expect(frame.frame.y + frame.frame.h).toBeLessThanOrEqual(json.meta.size.h);
      expect([frame.frame.w, frame.frame.h]).toEqual([frame.spriteSourceSize.w, frame.spriteSourceSize.h]);
      expect(frame.spriteSourceSize.x).toBeGreaterThanOrEqual(0); expect(frame.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
      expect(frame.spriteSourceSize.x + frame.spriteSourceSize.w).toBeLessThanOrEqual(BENNY_FRAMES.canvas.width);
      expect(frame.spriteSourceSize.y + frame.spriteSourceSize.h).toBeLessThanOrEqual(BENNY_FRAMES.canvas.height);
    }
    expect(Object.keys(json.frames).sort()).toEqual(Object.keys(BENNY_FRAMES.frames).sort());
  });
  it('declares the blink, nose and ears, the seven hops, the flop, scratch, wash and stretch, and ends hops and stretches on A1', () => {
    const names = Object.keys(BENNY_FRAMES.frames);
    for (const [name, count] of [['blink', 2], ['nose', 3], ['ears', 3], ['hop', 7], ['flop', 6], ['scratch', 6], ['groom', 6], ['stretch', 4]] as const)
      expect(names.filter(n => n.startsWith(name + '-')), name).toHaveLength(count);
    // Owner's decision: a hop or a stretch ends straight on the rest sprite A1, not on a painted near-copy.
    expect(names).not.toContain('hop-8'); expect(names).not.toContain('stretch-5');
    // The face pictures are not recoloured (they are A1 outside their moving part); the 29 full poses are.
    expect(names.filter(n => BENNY_FRAMES.frames[n].kind === 'pose')).toHaveLength(29);
    for (const n of ['blink-1', 'blink-2', 'nose-1', 'ears-1']) expect(BENNY_FRAMES.frames[n].kind).not.toBe('pose');
  });
  it('lands the rest pose on the game sprite pixel for pixel: same scale, same place, same ground', () => {
    const sprite = rabbitArt('benny')!;
    expect([BENNY_FRAMES.sprite.width, BENNY_FRAMES.sprite.height]).toEqual([sprite.width, sprite.height]);
    expect(BENNY_FRAMES.anchor).toEqual({x: BENNY_FRAMES.sprite.x + sprite.width / 2, y: BENNY_FRAMES.sprite.y + sprite.height});
    expect(BENNY_ORIGIN.x * BENNY_FRAMES.canvas.width).toBeCloseTo(BENNY_FRAMES.anchor.x, 6);
    expect(BENNY_ORIGIN.y * BENNY_FRAMES.canvas.height).toBeCloseTo(BENNY_FRAMES.anchor.y, 6);
    // Measured by the preparation script against benny-v1.png: the same silhouette, no shift, the same colours.
    expect(frameConfig.restCheck.silhouette).toBeGreaterThanOrEqual(.98);
    expect(frameConfig.restCheck.bestShift).toEqual([0, 0]);
    expect(frameConfig.restCheck.colour).toBeLessThan(2);
    // Blink patches stay inside the sprite's own area, so they always lie on A1.
    const json = atlasJson();
    for (const [name, data] of Object.entries(BENNY_FRAMES.frames)) if (data.kind === 'patch') {
      const r = json.frames[name].spriteSourceSize;
      expect(r.x).toBeGreaterThanOrEqual(BENNY_FRAMES.sprite.x); expect(r.y).toBeGreaterThanOrEqual(BENNY_FRAMES.sprite.y);
      expect(r.x + r.w).toBeLessThanOrEqual(BENNY_FRAMES.sprite.x + sprite.width); expect(r.y + r.h).toBeLessThanOrEqual(BENNY_FRAMES.sprite.y + sprite.height);
    }
    // Only the hop leaves the ground; its top is the highest.
    const lifts = Object.entries(BENNY_FRAMES.frames).map(([name, f]) => [name, f.lift] as const);
    for (const [name, lift] of lifts) if (!['hop-3', 'hop-4', 'hop-5'].includes(name)) expect(lift, name).toBeLessThan(1);
    expect(BENNY_FRAMES.frames['hop-4'].lift).toBeGreaterThan(BENNY_FRAMES.frames['hop-3'].lift);
  });
  it('loads the atlas once, only in a meadow with Benny, as a Phaser atlas', () => {
    expect(bennyMeadowArt()).toEqual([BENNY_ATLAS]);
    const s = new MeadowScene({} as never, () => {}, () => false) as any, state = createGame(0);
    expect(s.requiredArt(state).map((a: any) => a.texture)).not.toContain(BENNY_ATLAS.texture);
    state.rabbits.push({id: 'rabbit-benny', species: 'benny', affection: 0, enclosureId: state.rabbits[0]?.enclosureId ?? 'enclosure-1'});
    const art = s.requiredArt(state);
    expect(art.filter((a: any) => a.texture === BENNY_ATLAS.texture)).toEqual([BENNY_ATLAS]);
    // The loader asks Phaser for an atlas (picture and frames), the other pictures stay plain images.
    const loaded = new Set<string>(); s.current = state; s.sceneReady = true; s.lifeGeneration = 1;
    s.textures = {exists: (key: string) => loaded.has(key)};
    s.load = {image: vi.fn(), atlas: vi.fn(), once: vi.fn(), start: vi.fn()}; s.loading = {runtime: vi.fn()};
    s.ensureArt();
    // Her flight atlas comes along (tests/benny-flight.test.ts).
    expect(s.load.atlas.mock.calls[0]).toEqual([BENNY_ATLAS.texture, BENNY_ATLAS.url, BENNY_ATLAS.atlas]);
    expect(s.load.atlas.mock.calls.filter((c: any[]) => c[0] === BENNY_ATLAS.texture)).toHaveLength(1);
    expect(s.load.image.mock.calls.map((c: any[]) => c[0])).not.toContain(BENNY_ATLAS.texture);
  });
});

describe('Benny clock', () => {
  it('plays every picture of its acts at about 10 to 14 a second, holding longer only the key poses', () => {
    const holds = new Set(['hop-4', 'flop-4', 'groom-3', 'stretch-3', 'stretch-4', 'scratch-6', 'groom-6', 'stretch-2']);
    for (const act of BENNY_ACTS) for (const k of bennyPlan(act, 3).keys) {
      expect(BENNY_FRAMES.frames[k.frame!], `${act} ${k.frame}`).toBeDefined();
      if (!holds.has(k.frame!)) { expect(k.ms, `${act} ${k.frame}`).toBeGreaterThanOrEqual(70); expect(k.ms, `${act} ${k.frame}`).toBeLessThanOrEqual(120); }
    }
    expect(HOP_KEYS.find(k => k.frame === 'hop-4')!.ms).toBeGreaterThan(Math.max(...HOP_KEYS.filter(k => k.frame !== 'hop-4').map(k => k.ms)));
    expect(bennyPlan('flop').keys.find(k => k.frame === 'flop-4')!.ms).toBe(FLOP_LYING_MS);
    expect(FLOP_LYING_MS).toBeGreaterThanOrEqual(2000);
  });
  it('plays each act in order and comes back to A1, hops and stretches straight from their last painted pose', () => {
    for (const act of BENNY_ACTS) {
      const clock = new BennyClock('rabbit-1'), state = clock.play(act, act === 'hop' ? 2 : 1), frames = playThrough(clock, state);
      const shown = frames.filter((f, i) => f !== frames[i - 1]);
      expect(shown[0]).toBe(`${act === 'groom' ? 'groom' : act}-1`);
      expect(shown.at(-1)).toBeNull(); expect(clock.act).toBeNull();
      if (act === 'hop') { expect(shown.at(-2)).toBe('hop-7'); expect(shown.filter(f => f === 'hop-4')).toHaveLength(2); }
      if (act === 'stretch') expect(shown.at(-2)).toBe('stretch-4');
      if (act === 'flop') expect(shown.slice(0, 7)).toEqual(['flop-1', 'flop-2', 'flop-3', 'flop-4', 'flop-5', 'flop-6', null]);
    }
  });
  it('waits 3 to 6 seconds before its first act, then 5 to 9 seconds between two acts', () => {
    const clock = new BennyClock('rabbit-7'), starts: number[] = [], ends: number[] = [];
    let wasPlaying = false;
    for (let t = 0; t < 120_000; t += 20) {
      clock.step(20, IDLE); const playing = !!clock.act;
      if (playing && !wasPlaying) starts.push(t); if (!playing && wasPlaying) ends.push(t); wasPlaying = playing;
    }
    expect(starts[0]).toBeGreaterThanOrEqual(ACT_GAP.first[0] - 40); expect(starts[0]).toBeLessThanOrEqual(ACT_GAP.first[1] + 40);
    expect(starts.length).toBeGreaterThanOrEqual(5);
    for (let k = 1; k < starts.length; k++) { const gap = starts[k] - ends[k - 1]; expect(gap).toBeGreaterThanOrEqual(ACT_GAP.next[0] - 40); expect(gap).toBeLessThanOrEqual(ACT_GAP.next[1] + 40); }
  });
  it('counts the time during her walks too, and plays her act as soon as she stops (owner, 4 November 2026)', () => {
    const clock = new BennyClock('rabbit-11');
    run(clock, ACT_GAP.first[1] + 1000, {idle: false}); expect(clock.act).toBeNull();
    clock.step(20, IDLE); expect(clock.act).not.toBeNull();
  });
  it('starts no act when hidden or busy, and draws several kinds of act', () => {
    const hidden = new BennyClock('rabbit-2'); run(hidden, 60_000, {active: false}); expect(hidden.act).toBeNull();
    const busy = new BennyClock('rabbit-2'); run(busy, 60_000, {idle: false}); expect(busy.act).toBeNull();
    const seen = new Set<string>();
    for (const id of ['rabbit-1', 'rabbit-2', 'rabbit-3', 'rabbit-4', 'rabbit-5', 'rabbit-6']) {
      const clock = new BennyClock(id); for (let t = 0; t < 200_000; t += 20) { clock.step(20, IDLE); if (clock.act) seen.add(clock.act.act); }
    }
    expect([...seen].sort()).toEqual([...BENNY_ACTS].sort());
  });
  it('blinks every 3 to 6 seconds, twitches its nose often and moves its ears now and then, all on A1 between them', () => {
    const clock = new BennyClock('rabbit-3'), frames = run(clock, 60_000, {idle: false});
    const starts = (prefix: string) => frames.flatMap((f, i) => f?.startsWith(prefix) && !frames[i - 1]?.startsWith(prefix) ? [i * 20] : []);
    const blinks = starts('blink');
    expect(blinks.length).toBeGreaterThanOrEqual(60 / 6 - 1); expect(blinks.length).toBeLessThanOrEqual(2 * 60 / 3 + 2);
    expect(starts('nose').length).toBeGreaterThan(blinks.length);
    expect(starts('ears').length).toBeGreaterThanOrEqual(2);
    expect(frames.filter(f => f === null).length).toBeGreaterThan(frames.length / 2);
    expect(FACE_GAP.blink).toEqual([3000, 6000]);
  });
  it('answers a touch with one joyful hop in place, at most once in a while', () => {
    const clock = new BennyClock('rabbit-4'), hop = clock.tap();
    expect(hop?.act).toBe('hop'); expect(hop?.hops).toBe(1); expect(hop?.travel).toBe(false);
    expect(clock.tap()).toBeNull();
    playThrough(clock, hop); run(clock, TAP_COOLDOWN_MS, {idle: false});
    expect(clock.tap()?.act).toBe('hop');
  });
  it('with reduced motion, only blinks and twitches its nose: no act, no hop, no flop, no ears', () => {
    const clock = new BennyClock('rabbit-5'), frames = run(clock, 120_000, {reduced: true});
    expect(clock.act).toBeNull(); expect(clock.tap()).toBeNull(); expect(clock.play('flop')).toBeNull();
    const kinds = new Set(frames.filter(Boolean).map(f => f!.split('-')[0]));
    expect([...kinds].sort()).toEqual(['blink', 'nose']);
    // Asleep with reduced motion: eyes closed, no flop.
    run(clock, 5000, {reduced: true, asleep: true}); expect(clock.act).toBeNull(); expect(clock.frame(true)).toBe('blink-2');
    // An act already playing stops on A1 when motion becomes reduced.
    const lively = new BennyClock('rabbit-6'); lively.play('groom'); lively.step(20, {...IDLE, reduced: true}); expect(lively.act).toBeNull(); expect(lively.frame()).toBeNull();
  });
  it('naps lying in its flop, breathing calmly, as long as the nap lasts, then gets up to A1', () => {
    const clock = new BennyClock('rabbit-8'), frames = run(clock, 20_000, {asleep: true, idle: false});
    expect(clock.act?.act).toBe('nap'); expect(frames.at(-1)).toBe('flop-4');
    const lying = clock.act!, a = bennyBody(lying, 0).squashY, b = bennyBody(lying, 800).squashY;
    expect(a).not.toBeCloseTo(b, 4); expect(Math.abs(a - 1)).toBeLessThan(.05);
    const after = run(clock, 2000, {asleep: false, idle: false});
    expect(after.filter((f, i) => f !== after[i - 1])).toEqual(expect.arrayContaining(['flop-5', 'flop-6']));
    expect(clock.act).toBeNull();
  });
  it('carries a hop series across the enclosure only while in the air, ending exactly at its target', () => {
    const state = {...bennyPlan('hop', 3, true), elapsed: 0, duration: 0};
    let previous = 0; state.duration = planDuration(state);
    for (let t = 0; t <= state.duration; t += 10) {
      state.elapsed = t; const u = hopTravel(state), frame = state.keys[keyAt(state.keys, t).index].frame;
      expect(u).toBeGreaterThanOrEqual(previous - 1e-9);
      if (frame === 'hop-1' || frame === 'hop-7') expect(u).toBeCloseTo(previous, 9);
      previous = u;
    }
    expect(previous).toBeCloseTo(1, 9);
    expect(hopTravel({...bennyPlan('flop'), elapsed: 500})).toBe(0);
  });
  it('squashes before the hop and at its landing, stretches on take-off, and shrinks the shadow in the air', () => {
    const state = (frame: string): BennyActState => { const plan = bennyPlan('hop'), index = plan.keys.findIndex(k => k.frame === frame);
      return {...plan, duration: planDuration(plan), elapsed: plan.keys.slice(0, index).reduce((s, k) => s + k.ms, 0) + plan.keys[index].ms - 1}; };
    expect(bennyBody(state('hop-1'), 0).squashY).toBeLessThan(1); expect(bennyBody(state('hop-2'), 0).squashY).toBeGreaterThan(1);
    expect(bennyBody(state('hop-6'), 0).squashY).toBeLessThan(1); expect(bennyBody(null, 0)).toEqual({squashX: 1, squashY: 1});
    expect(bennyShadow('hop-4').scaleX).toBeLessThan(bennyShadow('hop-1').scaleX); expect(bennyShadow('hop-4').alpha).toBeLessThan(1);
    expect(bennyShadow('flop-4').scaleX).toBeGreaterThan(1.3); expect(bennyShadow(null)).toEqual({x: 0, scaleX: 1, scaleY: 1, alpha: 1});
  });
});

describe('Benny in the enclosure', () => {
  it('stays in the fence zone during her act, then rests where her hops took her', () => {
    const m = createRabbitMotion('rabbit-benny', {x: 0, y: 0}, 1), zone = motionZone(m);
    m.local = {x: zone.maxX - 3, y: 0};
    startPerform(m, {x: zone.maxX + 40, y: zone.maxY + 9}, 800);
    expect(m.mode).toBe('perform'); expect(m.to.x).toBeLessThanOrEqual(zone.maxX); expect(m.to.y).toBeLessThanOrEqual(zone.maxY);
    for (let t = 0; t < 750; t += 50) stepRabbitMotion(m, 50);
    expect(m.mode).toBe('perform');
    stepRabbitMotion(m, 50); expect(m.mode).not.toBe('perform');
    const n = createRabbitMotion('rabbit-benny', {x: 0, y: 0}, 1); startPerform(n, {x: 10, y: 0}, 800); n.local = {x: 4, y: 0};
    endPerform(n, false); expect(n.local).toEqual({x: 4, y: 0}); expect(n.mode).not.toBe('perform');
  });
  it('hops and scratches her ears more often, and stretches less often (owner, 10 November 2026)', () => {
    const counts: Record<string, number> = {};
    for (const id of ['rabbit-1', 'rabbit-2', 'rabbit-3']) {
      const clock = new BennyClock(id);
      for (let t = 0; t < 20 * 60_000; t += 50) { const started = clock.step(50, IDLE); if (started) counts[started.act] = (counts[started.act] ?? 0) + 1; }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(300);
    for (const act of ['flop', 'groom', 'stretch']) { expect(counts.hop, act).toBeGreaterThan(counts[act]); expect(counts.scratch, act).toBeGreaterThan(counts[act]); }
    expect(counts.stretch).toBeLessThan(counts.flop); expect(counts.stretch).toBeLessThan(counts.groom);
    expect(counts.stretch / total).toBeLessThan(.12); expect(counts.hop / total).toBeGreaterThan(.28);
  });
});
