// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import {afterEach, describe, expect, it} from 'vitest';
import {LEGENDARY_EFFECTS, LEGENDARY_IDLE_GAP_MS, LEGENDARY_PARTS, legendaryMeadowArt} from '../src/config/legendaryArt';
import {VISUAL} from '../src/config/visual';
import {ACT_MS, DIVE, IDLE_GAP, LegendaryClock, SLAM, SURF_ENTRY_MS, SURF_SLIDE_MS, TAP_COOLDOWN_MS, breathFrame, diveFin, partAngle, speciesActs, surfPose} from '../src/display/legendaryTimeline';
import {createRabbitMotion, motionZone, startSurf, stepRabbitMotion} from '../src/display/rabbitMotion';
import {showLegendaryReveal} from '../src/ui/legendaryReveal';

const publicFile = (url: string) => 'public/' + url.replace(/^.*?assets\//, 'assets/');
/** Canvas size of a WebP (VP8X, VP8L or VP8 chunk). */
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u24 = (b: Uint8Array, at: number) => b[at] | b[at + 1] << 8 | b[at + 2] << 16;
function webpSize(bytes: Uint8Array): [number, number] {
  expect(ascii(bytes, 0, 4)).toBe('RIFF'); expect(ascii(bytes, 8, 12)).toBe('WEBP');
  const chunk = ascii(bytes, 12, 16), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (chunk === 'VP8X') return [1 + u24(bytes, 24), 1 + u24(bytes, 27)];
  if (chunk === 'VP8L') { const b = view.getUint32(21, true); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
  return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff];
}
const pngSize = (b: Uint8Array): [number, number] => { const view = new DataView(b.buffer, b.byteOffset, b.byteLength); return [view.getUint32(16), view.getUint32(20)]; };
/** Advances a clock in steps it accepts (it caps one step at a second). */
const run = (clock: LegendaryClock, ms: number, idle = false) => { for (let t = 0; t < ms; t += 100) clock.step(100, idle); };

describe('legendary pictures', () => {
  const effects = Object.values(LEGENDARY_EFFECTS).flat();
  it.each(effects.map(art => [art.texture, art] as const))('%s is a WebP of its declared size', (_name, art) => {
    const file = publicFile(art.url); expect(existsSync(file)).toBe(true);
    expect(webpSize(readFileSync(file))).toEqual([art.width, art.height]);
  });
  it('keeps every flame and wave animation at four frames or more, and the five fire walls', () => {
    for (const name of ['breath', 'flame', 'surfwave', 'splash'] as const) expect(LEGENDARY_EFFECTS[name].length).toBeGreaterThanOrEqual(4);
    expect(LEGENDARY_EFFECTS.firewall).toHaveLength(5); expect(LEGENDARY_EFFECTS.wave).toHaveLength(3);
  });
  it('cuts the moving parts from the approved sprites, same frame, and keeps the open mouth on the same left edge', () => {
    const sprite = (species: 'dragon' | 'requin' | 'ankylosaure') => pngSize(readFileSync(`public/assets/rabbits/${species}/${species}-v1.png`));
    for (const species of ['dragon', 'requin', 'ankylosaure'] as const) {
      const parts = LEGENDARY_PARTS[species];
      expect(pngSize(readFileSync(publicFile(parts.body.url)))).toEqual(sprite(species));
      expect(pngSize(readFileSync(publicFile(parts.part.url)))).toEqual(sprite(species));
    }
    const mouth = LEGENDARY_PARTS.dragon.mouth!, [width, height] = pngSize(readFileSync(publicFile(mouth.url)));
    expect(width).toBe(mouth.width); expect(height).toBe(sprite('dragon')[1]); expect(width).toBeGreaterThan(sprite('dragon')[0]);
  });
  it('loads only its own species pictures in the meadow, never the full-screen paintings', () => {
    const dragon = legendaryMeadowArt('dragon').map(a => a.texture), requin = legendaryMeadowArt('requin').map(a => a.texture);
    expect(dragon).toContain('legendary-breath-1'); expect(dragon).not.toContain('legendary-surfboard');
    expect(requin).toContain('legendary-surfboard'); expect(requin).not.toContain('legendary-breath-1');
    // No halo in the meadow: the shine belongs to the appearance and the card.
    const ankylosaure = legendaryMeadowArt('ankylosaure').map(a => a.texture);
    expect(ankylosaure).toEqual(expect.arrayContaining(['rabbit-ankylosaure-tail', 'legendary-crack', 'legendary-dustring', 'legendary-rock', 'legendary-mound']));
    expect(ankylosaure).not.toContain('legendary-breath-1'); expect(ankylosaure).not.toContain('legendary-surfboard');
    for (const list of [dragon, requin, ankylosaure]) expect(list.some(t => /^legendary-(firewall|wave|foam|halo|rift|dustwall|strata)/.test(t))).toBe(false);
  });
});

describe('legendary clock', () => {
  it('waits its first gap (5 to 12 seconds) before its first spontaneous show, then plays one of its own', () => {
    const clock = new LegendaryClock('dragon', 'rabbit-9');
    expect(clock.step(IDLE_GAP.first[0] - 1, true)).toBeNull();
    let started = null; for (let t = 0; t < IDLE_GAP.first[1] && !started; t += 100) started = clock.step(100, true);
    expect(started).not.toBeNull(); expect(['smoke', 'hiccup', 'embers']).toContain(started!.act);
  });
  it('plays its shows far more often than a common rabbit does its rare somersault, with some randomness', () => {
    expect(IDLE_GAP).toBe(LEGENDARY_IDLE_GAP_MS);
    const mean = ([low, high]: readonly [number, number]) => (low + high) / 2;
    // A common resident somersaults on a share `salto.chance` of rest endings, and each rest lasts at least `restMin`:
    // on average, at least restMin / chance seconds between two somersaults (walks only add to it).
    const roam = VISUAL.rabbit.roam, commonMs = roam.restMin / roam.salto.chance * 1000;
    expect(mean(IDLE_GAP.next)).toBeLessThan(commonMs);
    // Owner's request of 3 November 2026: at least twice as often as the former 40-95 s gap, and still spread.
    expect(mean(IDLE_GAP.next) * 2).toBeLessThanOrEqual(mean([40_000, 95_000]));
    expect(mean(IDLE_GAP.first)).toBeLessThan(mean([10_000, 25_000]));
    expect(IDLE_GAP.next[1]).toBeGreaterThan(IDLE_GAP.next[0] * 1.5);
    // Measured on a clock: one hour of an idle legendary gives about 135 shows, against about 52 with the former gap.
    const clock = new LegendaryClock('dragon', 'rabbit-42'); let shows = 0;
    for (let t = 0; t < 3_600_000; t += 100) if (clock.step(100, true)) shows++;
    expect(shows).toBeGreaterThanOrEqual(104);
  });
  it('never starts a spontaneous show while it may not, and still finishes the one playing', () => {
    const clock = new LegendaryClock('requin', 'rabbit-3');
    for (let k = 0; k < 100; k++) expect(clock.step(1000, false)).toBeNull();
    expect(clock.tap()?.act).toBe('dive'); run(clock, ACT_MS.dive); expect(clock.act).toBeNull();
  });
  it('replays a touch at most every 900 ms and never stacks two shows', () => {
    const clock = new LegendaryClock('dragon', 'rabbit-1');
    expect(clock.tap()?.act).toBe('tap'); expect(clock.tap()).toBeNull();
    run(clock, ACT_MS.tap); expect(clock.act).toBeNull();
    expect(TAP_COOLDOWN_MS).toBeLessThan(ACT_MS.tap); expect(clock.tap()).not.toBeNull();
  });
  it('turns the surf into bubbles without room, plays soft shows asleep, and refuses the other species\' shows', () => {
    const requin = new LegendaryClock('requin', 'rabbit-2'); let started = null;
    for (let t = 0; t < 30_000 && !started; t += 100) started = requin.step(100, true, false, false);
    expect(started!.act).not.toBe('surf');
    const sleepy = new LegendaryClock('dragon', 'rabbit-4'); started = null;
    for (let t = 0; t < 30_000 && !started; t += 100) started = sleepy.step(100, true, true);
    expect(started!.act).toBe('smoke');
    expect(new LegendaryClock('requin', 'rabbit-5').play('tap')).toBeNull();
    expect(speciesActs('dragon')).not.toContain('surf'); expect(speciesActs('requin')).toContain('surf');
  });
  it('opens with a quick breath, flickers through three full flames, then fades', () => {
    const frames = Array.from({length: 15}, (_, k) => breathFrame(k * 100, 1500));
    expect(frames[0]).toBe(0); expect(frames.at(-1)).toBe(5);
    expect(new Set(frames.slice(3, 12))).toEqual(new Set([2, 3, 4]));
  });
  it('keeps the wing and fin still with reduced motion', () => {
    expect(partAngle('dragon', 4000, 1, null, true)).toBe(0);
    expect(Math.abs(partAngle('dragon', 4000, 1, null, false))).toBeLessThan(.25);
  });
  it('raises the club tail of the Ankylosaure high, then strikes the ground at the impact, and keeps its own earth shows', () => {
    const clock = new LegendaryClock('ankylosaure', 'rabbit-7'), slam = clock.tap()!;
    expect(slam.act).toBe('slam'); expect(SLAM.impact).toBeLessThan(ACT_MS.slam);
    const at = (ms: number) => partAngle('ankylosaure', 0, 0, {...slam, elapsed: ms}, false);
    expect(at(SLAM.raise)).toBeGreaterThan(.5); expect(at(SLAM.impact + 20)).toBeLessThan(0);
    expect(partAngle('ankylosaure', 0, 0, {...slam, elapsed: SLAM.raise}, true)).toBe(0);
    expect(speciesActs('ankylosaure')).toEqual(['slam', 'rumble', 'dig', 'dust']);
    expect(new LegendaryClock('ankylosaure', 'rabbit-8').play('surf')).toBeNull();
    expect(speciesActs('dragon')).not.toContain('slam');
  });
  it('shows only the fin while the Requin is under water, and a two-second slide on the board', () => {
    expect(diveFin(DIVE.hideAt - 10).visible).toBe(false); expect(diveFin((DIVE.hideAt + DIVE.showAt) / 2).visible).toBe(true);
    expect(surfPose(0).board).toBe(0); expect(surfPose(SURF_ENTRY_MS + SURF_SLIDE_MS / 2).board).toBe(1);
    expect(SURF_SLIDE_MS).toBe(2000); expect(ACT_MS.surf).toBeGreaterThanOrEqual(SURF_SLIDE_MS + 2 * SURF_ENTRY_MS);
  });
});

describe('Requin surf motion', () => {
  it('stays still while the board appears, slides inside the fence, then rests again', () => {
    const m = createRabbitMotion('rabbit-7', {x: 0, y: 0}, 1);
    const zone = motionZone(m), start = {...m.local};
    startSurf(m, {x: zone.maxX + 100, y: start.y}, SURF_ENTRY_MS, SURF_SLIDE_MS);
    expect(m.mode).toBe('surf'); expect(m.to.x).toBe(zone.maxX);
    const step = (ms: number) => { for (let t = 0; t < ms; t += 50) stepRabbitMotion(m, 50); };
    step(SURF_ENTRY_MS - 50); expect(m.local.x).toBeCloseTo(start.x);
    step(50 + SURF_SLIDE_MS / 2); expect(m.local.x).toBeGreaterThan(start.x);
    step(2000);
    expect(m.mode).not.toBe('surf'); expect(m.local.x).toBeLessThanOrEqual(zone.maxX);
  });
});

describe('legendary first appearance', () => {
  afterEach(() => document.querySelectorAll('dialog').forEach(d => d.remove()));
  const text = {title: 'Nouvelle découverte !', name: 'Lapin Dragon', details: 'Feu · Vol · Légendaire', button: 'Bienvenue dans la prairie'};
  it('fills the screen with the five fire walls, then the halo, the rabbit and the welcome button', () => {
    let closed = 0;
    const dialog = showLegendaryReveal('dragon', text, () => closed++);
    expect(dialog.open).toBe(true); expect(dialog.classList.contains('legendary-reveal-dragon')).toBe(true);
    expect(dialog.querySelectorAll('.lr-fire:not(.lr-fire-top) .lr-wall')).toHaveLength(5);
    expect(dialog.querySelector('.lr-halo')).not.toBeNull();
    expect(dialog.querySelector<HTMLImageElement>('.lr-rabbit')!.alt).toBe('Lapin Dragon');
    expect(dialog.getAttribute('aria-labelledby')).toBe('legendary-reveal-title');
    expect(dialog.querySelector('.lr-fx')!.getAttribute('aria-hidden')).toBe('true');
    const button = [...dialog.querySelectorAll('button')].find(b => b.textContent === 'Bienvenue dans la prairie')!;
    expect(document.activeElement).toBe(button);
    dialog.querySelector<HTMLElement>('.lr-backdrop')!.click(); expect(dialog.classList.contains('is-final')).toBe(true);
    button.click(); expect(closed).toBe(1); expect(document.querySelector('dialog.legendary-reveal')).toBeNull();
    button.click(); expect(closed).toBe(1);
  });
  it('brings the Requin on three waves and a screen of foam, never fire', () => {
    const dialog = showLegendaryReveal('requin', {...text, name: 'Lapin Requin'});
    expect(dialog.querySelectorAll('.lr-wave')).toHaveLength(3); expect(dialog.querySelector('.lr-foam-image')).not.toBeNull();
    expect(dialog.querySelector('.lr-wall')).toBeNull();
    dialog.dispatchEvent(new Event('cancel', {cancelable: true})); expect(document.querySelector('dialog.legendary-reveal')).toBeNull();
  });
  it('brings the Ankylosaure with an earthquake: the ground splits, dust rises and rocks fall, never fire or water', () => {
    const dialog = showLegendaryReveal('ankylosaure', {...text, name: 'Anky'});
    expect(dialog.classList.contains('legendary-reveal-ankylosaure')).toBe(true);
    expect(dialog.querySelector('.lr-rift-image')).not.toBeNull(); expect(dialog.querySelector('.lr-dustwall-image')).not.toBeNull();
    expect(dialog.querySelectorAll('.lr-rock').length).toBeGreaterThanOrEqual(12);
    expect(dialog.querySelector('.lr-wall, .lr-wave')).toBeNull();
    expect(dialog.querySelector<HTMLImageElement>('.lr-rabbit')!.alt).toBe('Anky');
    dialog.dispatchEvent(new Event('cancel', {cancelable: true})); expect(document.querySelector('dialog.legendary-reveal')).toBeNull();
  });
});
