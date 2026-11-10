// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {MAGICIEN_ART, MAGICIEN_POSE_ART, POSE_CANVAS, magicienShowArt} from '../src/config/magicienArt';
import {LEVITATION_LIFT, MAGICIEN_ACTS, MAGICIEN_DURATION, MAGICIEN_GAP, MAGICIEN_POSES, MagicienClock, TWINKLE_MS, magicienButterfly, magicienCircle,
  magicienFirework, magicienLevitation, magicienPose, magicienRune, magicienSmoke, magicienSparks, magicienSpell} from '../src/display/magicienTimeline';

const publicFile = (url: string) => 'public/' + url.replace(/^.*?assets\//, 'assets/');
/** Width and height of a PNG, read from its header. */
const size = (path: string) => { const b = readFileSync(path); return {width: b.readUInt32BE(16), height: b.readUInt32BE(20)}; };
/** Runs a clock `ms` in 50 ms frames; returns every trick started. */
const run = (clock: MagicienClock, ms: number, friend = true) => {
  const started: string[] = [];
  for (let t = 0; t < ms; t += 50) { const s = clock.step(50, true, false, friend); if (s) started.push(s.act); }
  return started;
};

describe('the evolved Magicien’s magic shows (owner, 10 November 2026)', () => {
  it('draws the same tricks for the same rabbit, the first one 5 to 12 seconds after he is free, then every 9 to 18 seconds', () => {
    expect(run(new MagicienClock('rabbit-42'), 120_000)).toEqual(run(new MagicienClock('rabbit-42'), 120_000));
    const clock = new MagicienClock('rabbit-42'); let elapsed = 0;
    while (!clock.step(50, true, false, true)) elapsed += 50;
    expect(elapsed).toBeGreaterThanOrEqual(MAGICIEN_GAP.first[0] - 50); expect(elapsed).toBeLessThanOrEqual(MAGICIEN_GAP.first[1]);
    expect(MAGICIEN_GAP.next).toEqual([9_000, 18_000]);
  });
  it('plays all six tricks over time, never the same twice in a row, and a spell only with a friend', () => {
    const tricks = run(new MagicienClock('rabbit-7'), 30 * 60_000);
    expect(new Set(tricks)).toEqual(new Set(MAGICIEN_ACTS));
    tricks.slice(1).forEach((act, k) => expect(act).not.toBe(tricks[k]));
    const alone = run(new MagicienClock('rabbit-7'), 30 * 60_000, false);
    expect(alone.length).toBeGreaterThan(50); expect(alone).not.toContain('spell');
    expect(new MagicienClock('a').play('spell', false)).toBeNull();
  });
  it('starts nothing while busy elsewhere or with reduced motion, and never overlaps two tricks', () => {
    const clock = new MagicienClock('rabbit-x');
    for (let i = 0; i < 60; i++) { expect(clock.step(1000, false, false, true)).toBeNull(); expect(clock.step(1000, true, true, true)).toBeNull(); }
    expect(clock.twinkle).toBe(-1);
    expect(clock.play('circle')!.duration).toBe(MAGICIEN_DURATION.circle); expect(clock.play('sparks')).toBeNull();
    for (let t = 0; t < MAGICIEN_DURATION.circle; t += 500) expect(clock.step(500, true, false, true)).toBeNull();
    expect(clock.act).toBeNull();
  });
  it('twinkles at the tip of his wand now and then between tricks', () => {
    const clock = new MagicienClock('rabbit-9'); let twinkles = 0, was = -1;
    for (let t = 0; t < 4000; t += 50) {
      clock.step(50, true, false, true);
      if (clock.twinkle >= 0 && was < 0) twinkles++;
      was = clock.twinkle; expect(clock.twinkle).toBeLessThan(TWINKLE_MS);
    }
    expect(twinkles).toBeGreaterThanOrEqual(1);
  });
  it('shows a painted pose during each trick and his usual drawing at its ends', () => {
    const shown = new Set<string>();
    for (const act of MAGICIEN_ACTS) {
      expect(magicienPose(act, MAGICIEN_DURATION[act] - 1)).toBeNull();
      for (let t = 0; t < MAGICIEN_DURATION[act]; t += 50) { const pose = magicienPose(act, t); if (pose) shown.add(pose); }
    }
    expect(shown).toEqual(new Set(MAGICIEN_POSES));
    expect(magicienPose('firework', 300)).toBe('twirl'); expect(magicienPose('firework', 1500)).toBe('cast'); expect(magicienPose('firework', 3000)).toBe('bow');
    expect(magicienPose('levitation', 1500)).toBe('float'); expect(magicienPose('spell', 1000)).toBe('point');
  });
  it('rises gently in his levitation and comes back down to the ground', () => {
    expect(magicienLevitation('levitation', 0)).toBe(0); expect(magicienLevitation('levitation', 1500)).toBeCloseTo(1);
    expect(magicienLevitation('levitation', MAGICIEN_DURATION.levitation)).toBe(0); expect(magicienLevitation('sparks', 1500)).toBe(0);
    expect(LEVITATION_LIFT).toBeGreaterThan(0);
  });
  it('keeps every effect within its trick: sparks, circle and runes, firework, smoke and butterflies, spell', () => {
    expect(magicienSparks(0, 0, 8).alpha).toBe(0); expect(magicienSparks(1000, 0, 8).alpha).toBeGreaterThan(0); expect(magicienSparks(1900, 0, 8).alpha).toBe(0);
    expect(magicienCircle('circle', 1500)).toMatchObject({size: 1, alpha: 1}); expect(magicienCircle('circle', MAGICIEN_DURATION.circle).alpha).toBe(0);
    expect(magicienCircle('sparks', 1000).alpha).toBe(0);
    expect(magicienRune(0, 0, 5).alpha).toBe(0); expect(magicienRune(1350, 0, 5).alpha).toBeGreaterThan(.9);
    const f = magicienFirework(1300); expect(f.cometAlpha).toBe(1); expect(f.burstAlpha).toBe(0);
    expect(magicienFirework(1900).burstAlpha).toBeGreaterThan(.5); expect(magicienFirework(MAGICIEN_DURATION.firework).burstAlpha).toBe(0);
    expect(magicienSmoke(900).alpha).toBe(1); expect(magicienSmoke(1800).alpha).toBe(0);
    expect(magicienButterfly(0, 0).alpha).toBe(0); expect(magicienButterfly(2000, 1).alpha).toBeGreaterThan(0); expect(magicienButterfly(MAGICIEN_DURATION.butterflies, 3).u).toBeLessThanOrEqual(1);
    // The wings beat: open and closed in turn.
    expect(new Set([0, 110, 220].map(t => magicienButterfly(1000 + t, 0).open))).toEqual(new Set([true, false]));
    expect(magicienSpell(300)).toMatchObject({flight: 0, flightAlpha: 0, friend: 0});
    expect(magicienSpell(1000).flightAlpha).toBe(1); expect(magicienSpell(2300).friend).toBeCloseTo(1); expect(magicienSpell(MAGICIEN_DURATION.spell).friend).toBeCloseTo(0);
  });
  it('ships his five poses on one canvas at the drawing’s scale, and every effect', () => {
    for (const pose of MAGICIEN_POSES) {
      const art = MAGICIEN_POSE_ART[pose], path = publicFile(art.url);
      expect(existsSync(path), path).toBe(true); expect(size(path)).toEqual(POSE_CANVAS);
      expect(art.tip.x).toBeGreaterThan(POSE_CANVAS.width / 2); expect(art.tip.y).toBeLessThan(POSE_CANVAS.height);
    }
    for (const art of Object.values(MAGICIEN_ART).filter(a => typeof a === 'object' && 'url' in a)) {
      const {url, width, height} = art as {url: string; width: number; height: number}, path = publicFile(url);
      expect(existsSync(path), path).toBe(true); expect(size(path)).toEqual({width, height});
    }
    expect(new Set(magicienShowArt().map(a => a.texture)).size).toBe(magicienShowArt().length);
  });
});
