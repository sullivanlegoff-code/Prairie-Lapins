// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import {afterEach, describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {ARKOKO_CRYSTAL, ARKOKO_EVOLVED_CRYSTAL, LEGENDARY_EFFECTS, LEGENDARY_IDLE_GAP_MS, LEGENDARY_PARTS, LEGENDARY_EVOLVED_PARTS, LEGENDARY_SHOWS, crystalCentre,
  legendaryMeadowArt, legendaryPartsForArt} from '../src/config/legendaryArt';
import {SPECIES, SPECIES_IDS} from '../src/config/species';
import {evolvedRabbitArt, rabbitArt} from '../src/config/rabbitArt';
import {decorateLegendaryCard} from '../src/ui/legendaryCard';
import {EASEL, FLARE, SLEEP_ACTS, TAP_ACT, arkokoHop, canvasProgress, crystalFlare, easelPresence, peintrePose, rainbowStep, stillAct} from '../src/display/legendaryTimeline';
import {PEINTRE_FX, PEINTRE_POSES} from '../src/config/peintreArt';
import {VISUAL} from '../src/config/visual';
import {ACT_MS, DIVE, IDLE_GAP, LegendaryClock, SLAM, SURF_ENTRY_MS, SURF_SLIDE_MS, TAP_COOLDOWN_MS, breathFrame, diveFin, partAngle, speciesActs, surfPose} from '../src/display/legendaryTimeline';
import {createRabbitMotion, motionZone, startSurf, stepRabbitMotion} from '../src/display/rabbitMotion';
import {showLegendaryReveal} from '../src/ui/legendaryReveal';
// @ts-expect-error -- the small project PNG codec is JavaScript and used only by Node tests.
import {decode} from '../scripts/png-rgba.mjs';

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
  itAll(effects.map(art => [art.texture, art] as const))('%s is a WebP of its declared size', (_name, art) => {
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
    for (const species of ['dragon', 'requin', 'ankylosaure'] as const) {
      const parts = LEGENDARY_EVOLVED_PARTS[species], evolved = pngSize(readFileSync(`public/assets/rabbits/${species}/${species}-v2.png`));
      expect(pngSize(readFileSync(publicFile(parts.body.url)))).toEqual(evolved);
      expect(pngSize(readFileSync(publicFile(parts.part.url)))).toEqual(evolved);
      const original = decode(readFileSync(`public/assets/rabbits/${species}/${species}-v2.png`));
      const body = decode(readFileSync(publicFile(parts.body.url))), piece = decode(readFileSync(publicFile(parts.part.url)));
      const seen = new Uint8Array(body.width * body.height), sizes: number[] = [];
      for (let start = 0; start < seen.length; start++) {
        if (seen[start]) continue;
        seen[start] = 1; const si = start * 4;
        if (body.rgba[si + 3] <= 24) continue;
        const queue = [start]; let count = 0;
        while (queue.length) {
          const at = queue.pop()!, x = at % body.width, y = Math.floor(at / body.width); count++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy; if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= body.width || ny >= body.height) continue;
            const next = ny * body.width + nx, ni = next * 4;
            if (!seen[next] && body.rgba[ni + 3] > 24) { seen[next] = 1; queue.push(next); }
            else if (!seen[next]) seen[next] = 1;
          }
        }
        sizes.push(count);
      }
      expect(sizes.filter(size => size > 20)).toHaveLength(1);
      let alphaError = 0, colorError = 0;
      for (let i = 0; i < original.rgba.length; i += 4) {
        const ba = body.rgba[i + 3] / 255, pa = piece.rgba[i + 3] / 255, alpha = pa + ba * (1 - pa);
        alphaError = Math.max(alphaError, Math.abs(alpha * 255 - original.rgba[i + 3]));
        if (alpha && original.rgba[i + 3]) for (let c = 0; c < 3; c++) {
          const color = (piece.rgba[i + c] * pa + body.rgba[i + c] * ba * (1 - pa)) / alpha;
          colorError = Math.max(colorError, Math.abs(color - original.rgba[i + c]));
        }
      }
      expect(alphaError).toBeLessThanOrEqual(1); expect(colorError).toBeLessThanOrEqual(1);
    }
    const evolvedMouth = LEGENDARY_EVOLVED_PARTS.dragon.mouth!;
    expect(existsSync(publicFile(evolvedMouth.url))).toBe(true);
    expect(pngSize(readFileSync(publicFile(evolvedMouth.url)))).toEqual([evolvedMouth.width, pngSize(readFileSync('public/assets/rabbits/dragon/dragon-v2.png'))[1]]);
    const original = decode(readFileSync('public/assets/rabbits/dragon/dragon-v2.png'));
    const body = decode(readFileSync('public/assets/rabbits/dragon/dragon-v2-body.png'));
    const mouthBody = decode(readFileSync(publicFile(evolvedMouth.url)));
    for (let i = 0; i < original.rgba.length; i += 4) {
      const pixel = i / 4, x = pixel % original.width, y = Math.floor(pixel / original.width);
      // The open body differs from the resting body only around the muzzle.
      if (x < 362 || x > 474 || y < 156 || y > 267) expect([...mouthBody.rgba.subarray(i, i + 4)]).toEqual([...body.rgba.subarray(i, i + 4)]);
    }
  });
  it('loads only its own species pictures in the meadow, never the full-screen paintings', () => {
    const dragon = legendaryMeadowArt('dragon').map(a => a.texture), requin = legendaryMeadowArt('requin').map(a => a.texture);
    expect(dragon).toContain('legendary-breath-1'); expect(dragon).not.toContain('legendary-surfboard');
    expect(requin).toContain('legendary-surfboard'); expect(requin).not.toContain('legendary-breath-1');
    // No halo in the meadow: the shine belongs to the appearance and the card.
    const ankylosaure = legendaryMeadowArt('ankylosaure').map(a => a.texture);
    expect(ankylosaure).toEqual(expect.arrayContaining(['rabbit-ankylosaure-tail', 'legendary-crack', 'legendary-dustring', 'legendary-rock', 'legendary-mound']));
    expect(ankylosaure).not.toContain('legendary-breath-1'); expect(ankylosaure).not.toContain('legendary-surfboard');
    for (const species of ['dragon', 'requin', 'ankylosaure'] as const) {
      const classic = legendaryMeadowArt(species, {evolved: undefined}).map(a => a.texture), evolved = legendaryMeadowArt(species, {evolved: true}).map(a => a.texture);
      expect(classic).toContain(`rabbit-${species}-v1-body`); expect(evolved).toContain(`rabbit-${species}-v2-body`);
      expect(evolved).toContain(`rabbit-${species}-v2-${species === 'dragon' ? 'wing' : species === 'requin' ? 'fin' : 'tail'}`);
    }
    for (const list of [dragon, requin, ankylosaure]) expect(list.some(t => /^legendary-(firewall|wave|foam|halo|rift|dustwall|strata)/.test(t))).toBe(false);
  });
});

describe('legendary clock', () => {
  it('waits its first gap (4 to 8 seconds) before its first spontaneous show, then plays one of its own', () => {
    const clock = new LegendaryClock('dragon', 'rabbit-9');
    expect(clock.step(IDLE_GAP.first[0] - 1, true)).toBeNull();
    let started = null; for (let t = 0; t < IDLE_GAP.first[1] && !started; t += 100) started = clock.step(100, true);
    expect(started).not.toBeNull(); expect(speciesActs('dragon')).toContain(started!.act);
  });
  it('plays every show of its species on its own, never more than 12 seconds apart', () => {
    // Owner's requests of 3 November 2026 ("toutes les animations possibles et toutes les 10 à 20 secondes pas plus") and of
    // 4 November 2026 (a little more often, seen without a touch): 6 to 12 seconds.
    expect(IDLE_GAP.first[1]).toBeLessThanOrEqual(8_000); expect(IDLE_GAP.next[1]).toBeLessThanOrEqual(12_000);
    for (const species of ['dragon', 'requin', 'ankylosaure', 'arkoko', 'peintre'] as const) {
      const clock = new LegendaryClock(species, 'rabbit-7'), seen = new Set<string>();
      for (let t = 0; t < 1_800_000; t += 100) { const s = clock.step(100, true); if (s) seen.add(s.act); }
      expect([...seen].sort()).toEqual([...speciesActs(species)].sort());
    }
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
    // Measured on a clock: one hour of an idle legendary gives well over 104 shows, against about 52 with the 40-95 s gap.
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
  it('brings Arkoko in a starry night with a rainbow drawing itself and bursts of light, then its crystal flares on its drawing', () => {
    const dialog = showLegendaryReveal('arkoko', {...text, name: 'Arkoko'});
    expect(dialog.classList.contains('legendary-reveal-arkoko')).toBe(true);
    expect(dialog.querySelectorAll('.lr-rainbow-step')).toHaveLength(8);
    expect(dialog.querySelectorAll('.lr-prism').length).toBeGreaterThanOrEqual(4); expect(dialog.querySelectorAll('.lr-trail')).toHaveLength(2);
    expect(dialog.querySelector('.lr-wall, .lr-wave, .lr-rift-image')).toBeNull();
    const figure = dialog.querySelector<HTMLElement>('.lr-hero .lr-figure')!;
    expect(figure.querySelector<HTMLImageElement>('.lr-rabbit')!.alt).toBe('Arkoko');
    expect(figure.querySelector<HTMLImageElement>('.lr-crystal-glow')!.src).toContain('arkoko-v1-crystal-glow');
    for (const piece of figure.querySelectorAll('.lr-crystal-glow, .lr-crystal-light, .lr-crystal-burst')) expect(piece.getAttribute('aria-hidden')).toBe('true');
    dialog.dispatchEvent(new Event('cancel', {cancelable: true})); expect(document.querySelector('dialog.legendary-reveal')).toBeNull();
  });
});

describe('Arkoko, the rainbow legendary', () => {
  it('is the fourth legendary with its own shows, its crystal flare at a touch and soft stars asleep', () => {
    expect(SPECIES_IDS.filter(id => SPECIES[id].rarity === 'legendary').every(id => (LEGENDARY_SHOWS as readonly string[]).includes(id))).toBe(true);
    expect(TAP_ACT.arkoko).toBe('flare'); expect(speciesActs('arkoko').sort()).toEqual(['flare', 'rainbow', 'stars', 'trail']); expect(SLEEP_ACTS.arkoko).toBe('stars');
    const clock = new LegendaryClock('arkoko', 'arkoko-1');
    expect(clock.tap()?.act).toBe('flare'); expect(clock.play('surf')).toBeNull();
    expect(partAngle('arkoko', 1234, 0, null, false)).toBe(0);
    expect(legendaryPartsForArt('arkoko', {})).toBeNull();
  });
  it('lights its crystal up strongly at once, holds a breath, then goes back to its toned-down drawing', () => {
    expect(crystalFlare(0).glow).toBe(0);
    const peak = crystalFlare(FLARE.peak);
    expect(peak.glow).toBeGreaterThan(.99); expect(peak.light).toBeGreaterThan(.99); expect(peak.scale).toBeGreaterThan(1.15);
    expect(crystalFlare(FLARE.peak / 2).glow).toBeGreaterThan(.4); // « d'un coup »: half way up in 55 ms
    expect(crystalFlare(FLARE.hold - 10).glow).toBeGreaterThan(.99);
    let last = 1;
    for (let ms = FLARE.hold; ms <= FLARE.calm; ms += 50) { const g = crystalFlare(ms).glow; expect(g).toBeLessThanOrEqual(last + 1e-9); last = g; }
    expect(crystalFlare(FLARE.calm)).toEqual({glow: 0, light: 0, scale: 1, burst: 0, burstScale: .3});
    expect(ACT_MS.flare).toBeGreaterThan(FLARE.calm);
    expect(rainbowStep(0).frame).toBe(0); expect(rainbowStep(1200).frame).toBe(7); expect(rainbowStep(ACT_MS.rainbow).alpha).toBeLessThan(.01);
  });
  it('keeps the original glow of its crystal as a patch over the toned-down drawing, and its crystals inside both drawings', () => {
    const v1 = rabbitArt('arkoko')!, v2 = evolvedRabbitArt('arkoko')!;
    for (const [crystal, art] of [[ARKOKO_CRYSTAL, v1], [ARKOKO_EVOLVED_CRYSTAL, v2]] as const) {
      for (const piece of [crystal.crystal, ...(crystal.glow ? [crystal.glow] : [])]) {
        expect(pngSize(readFileSync(publicFile(piece.url)))).toEqual([piece.width, piece.height]);
        expect(piece.x).toBeGreaterThanOrEqual(0); expect(piece.y).toBeGreaterThanOrEqual(0);
        expect(piece.x + piece.width).toBeLessThanOrEqual(art.width); expect(piece.y + piece.height).toBeLessThanOrEqual(art.height);
      }
      const centre = crystalCentre(crystal); expect(centre.y).toBeLessThan(art.height * .4); // on the forehead
    }
    expect(ARKOKO_EVOLVED_CRYSTAL.glow).toBeUndefined();
    // At rest the drawing under the patch is darker than the patch: the light taken away is the light the flare brings back.
    const glow = ARKOKO_CRYSTAL.glow!, patch = decode(readFileSync(publicFile(glow.url))), sprite = decode(readFileSync(publicFile(v1.url)));
    let weight = 0, patchLight = 0, restLight = 0;
    for (let y = 0; y < patch.height; y++) for (let x = 0; x < patch.width; x++) {
      const i = (y * patch.width + x) * 4, a = patch.rgba[i + 3] / 255, j = ((glow.y + y) * sprite.width + glow.x + x) * 4;
      if (a < .2 || sprite.rgba[j + 3] < 250) continue;
      weight += a; patchLight += a * (patch.rgba[i] + patch.rgba[i + 1] + patch.rgba[i + 2]); restLight += a * (sprite.rgba[j] + sprite.rgba[j + 1] + sprite.rgba[j + 2]);
    }
    expect(weight).toBeGreaterThan(200); expect(patchLight / weight).toBeGreaterThan(restLight / weight + 20);
  });
  it('loads only its crystal and its rainbow pictures in the meadow, never a halo nor another legendary\'s', () => {
    const all = legendaryMeadowArt('arkoko').map(a => a.texture), evolved = legendaryMeadowArt('arkoko', {evolved: true}).map(a => a.texture);
    expect(all).toEqual(expect.arrayContaining(['rabbit-arkoko-v1-crystal-glow', 'rabbit-arkoko-v1-crystal', 'rabbit-arkoko-v2-crystal', 'legendary-arkoko-prism', 'legendary-arkoko-rainbow-8']));
    expect(evolved).toContain('rabbit-arkoko-v2-crystal'); expect(evolved).not.toContain('rabbit-arkoko-v1-crystal-glow');
    expect(all.some(t => /^legendary-(halo|breath|surfboard|crack|firewall)/.test(t))).toBe(false);
  });
  it('moves in its shows: its hops crouch, rise and land with a squash, and all fit inside their show (20 November 2026)', () => {
    expect(arkokoHop(-1000, 0, 400, 6)).toEqual({on: false, lift: 0, squashX: 1, squashY: 1});
    const crouch = arkokoHop(-10, 0, 400, 6), top = arkokoHop(200, 0, 400, 6), land = arkokoHop(460, 0, 400, 6);
    expect(crouch.on).toBe(true); expect(crouch.lift).toBe(0); expect(crouch.squashY).toBeLessThan(.95);
    expect(top.lift).toBeCloseTo(6, 5);
    expect(land.lift).toBe(0); expect(land.squashY).toBeLessThan(.95); expect(land.squashX).toBeGreaterThan(1.05);
    expect(arkokoHop(400 * 1.31, 0, 400, 6).on).toBe(false);
    // The flare's jump and the three hops under the rainbow end before their show does (as built in legendaryEffects.ts).
    expect(60 + 520 * 1.3).toBeLessThan(ACT_MS.flare); expect(1350 + 520 * 1.3).toBeLessThan(ACT_MS.rainbow);
    const effects = readFileSync('src/display/legendaryEffects.ts', 'utf8') as string, scene = readFileSync('src/display/MeadowScene.ts', 'utf8') as string;
    expect(effects).toContain('arkokoHop(ms, 60, 520, 7)'); expect(effects).toContain('arkokoHop(ms, 1350, 520, 9)');
    expect(effects).toMatch(/this\.squashX = Math\.cos\(spin \* Math\.PI \* 2\)/);
    expect(scene).toContain('squashX *= show.squashX; squashY *= show.squashY;');
  });
  it('flies in along its rainbow on a trail of stardust, lands with a bounce, and keeps its rainbow over it at the end', () => {
    const dialog = showLegendaryReveal('arkoko', {title: 'Nouvelle découverte !', name: 'Arkoko', details: 'Arc-en-ciel · Légendaire', button: 'Fermer'});
    const trail = dialog.querySelector<HTMLImageElement>('.lr-figure > .lr-arrival-trail')!, arch = dialog.querySelector<HTMLImageElement>('.lr-hero > .lr-hero-rainbow')!;
    expect(trail.getAttribute('src')).toBe(LEGENDARY_EFFECTS.trail.url); expect(arch.getAttribute('src')).toBe(LEGENDARY_EFFECTS.rainbow[7].url);
    expect(dialog.querySelector('.lr-hero')!.firstElementChild).toBe(arch);
    dialog.remove();
    const other = showLegendaryReveal('dragon', {title: 'Nouvelle découverte !', name: 'Dragon', details: 'Feu', button: 'Fermer'});
    expect(other.querySelector('.lr-hero-rainbow, .lr-arrival-trail')).toBeNull(); other.remove();
    const css = readFileSync('src/display/styles.css', 'utf8') as string;
    for (const rule of ['.legendary-reveal-arkoko.is-playing .lr-figure { animation: lr-arkoko-arrive', '@keyframes lr-arkoko-arrive', '.legendary-reveal-arkoko.is-final .lr-arrival-trail { animation: none; opacity: 0; }',
      '.legendary-reveal-arkoko.is-final .lr-hero-rainbow { animation: none; opacity: .85; }', '.legendary-reveal-arkoko.is-final .lr-halo { animation: lr-spin 26s linear infinite;'])
      expect(css).toContain(rule);
    // The details line stays light on the night (the parchment's ink colour for dialog paragraphs made it dark).
    expect(css).toContain('.legendary-reveal .lr-text .lr-details { margin: 6px 0 10px; color: #fff3d6;');
  });
  it('themes its card with a rainbow banner and drifting stars', () => {
    const panel = document.createElement('div');
    expect(decorateLegendaryCard(panel, 'arkoko')).toBe(true);
    expect(panel.dataset.legendary).toBe('arkoko'); expect(panel.style.getPropertyValue('--legendary-banner')).toContain('rainbow-8');
    expect(panel.querySelectorAll('.legendary-mote').length).toBeGreaterThan(0);
  });
});

describe('The Peintre, the painter legendary (24 November 2026)', () => {
  it('has five shows of his own: a great brush stroke at a touch, the ten-second easel, sunflowers, a starry night and splashes', () => {
    expect(TAP_ACT.peintre).toBe('stroke');
    expect(speciesActs('peintre').sort()).toEqual(['easel', 'splatter', 'starry', 'stroke', 'sunflowers']);
    expect(ACT_MS.easel).toBe(10_000); expect(SLEEP_ACTS.peintre).toBe('starry');
    expect(legendaryPartsForArt('peintre', {})).toBeNull(); expect(partAngle('peintre', 1234, 0, null, false)).toBe(0);
    for (const act of speciesActs('peintre')) expect(stillAct(act)).toBe(true);
    expect(stillAct('flare')).toBe(false);
  });
  it('sets the easel up, places the canvas, paints the Almond Blossom step by step, admires it, then all fades', () => {
    expect(peintrePose('easel', 300)).toBeNull(); expect(peintrePose('easel', EASEL.carry + 10)).toBe('carry');
    expect(peintrePose('easel', EASEL.paint + 100)).toBe('paint'); expect(peintrePose('easel', EASEL.admire + 100)).toBe('admire');
    expect(peintrePose('easel', EASEL.fade + 10)).toBeNull(); expect(peintrePose('stroke', 500)).toBe('swing');
    expect(canvasProgress(EASEL.paint - 1)).toBe(0); expect(canvasProgress(EASEL.done)).toBe(1);
    let last = 0; for (let ms = EASEL.paint; ms <= EASEL.done; ms += 50) { const p = canvasProgress(ms); expect(p).toBeGreaterThanOrEqual(last - 1e-9); last = p; }
    expect(easelPresence(0)).toBe(0); expect(easelPresence(5000)).toBe(1); expect(easelPresence(ACT_MS.easel)).toBeLessThan(.01);
    expect(EASEL.fade).toBeLessThan(ACT_MS.easel);
  });
  it('has his painted poses on canvases that share his drawings\' ground, and every picture of his shows on disk', () => {
    for (const version of ['v1', 'v2'] as const) {
      const {canvas, poses} = PEINTRE_POSES[version];
      for (const pose of Object.values(poses)) {
        expect(pngSize(readFileSync(publicFile(pose.url)))).toEqual([canvas.width, canvas.height]);
        expect(existsSync(publicFile(pose.url).replace(/\.png$/, '.webp'))).toBe(true);
      }
      expect(poses.swing.tip).toBeDefined(); expect(poses.paint.tip).toBeDefined();
    }
    for (const art of [PEINTRE_FX.stroke, PEINTRE_FX.star, PEINTRE_FX.swirl, PEINTRE_FX.sunflower, PEINTRE_FX.bud, PEINTRE_FX.splatYellow, PEINTRE_FX.splatBlue, PEINTRE_FX.drop,
      PEINTRE_FX.easel, PEINTRE_FX.sky, PEINTRE_FX.frame, ...PEINTRE_FX.canvas]) expect(pngSize(readFileSync(publicFile(art.url)))).toEqual([art.width, art.height]);
    expect(PEINTRE_FX.canvas.length).toBeGreaterThan(4);
  });
  it('loads only his own poses and pieces in the meadow, the evolved poses for the Peintre Aguerri', () => {
    const base = legendaryMeadowArt('peintre', {}).map(a => a.texture), evolved = legendaryMeadowArt('peintre', {evolved: true}).map(a => a.texture);
    expect(base).toEqual(expect.arrayContaining(['rabbit-peintre-v1-pose-swing', 'peintre-easel', 'peintre-canvas-0', 'peintre-sunflower']));
    expect(base.some(t => t.includes('-v2-'))).toBe(false); expect(evolved).toContain('rabbit-peintre-v2-pose-paint');
    expect(base.some(t => /^legendary-/.test(t))).toBe(false);
  });
  it('appears in a painting: strokes paint a starry night, splashes and sunflowers, and a gilded frame closes around him', () => {
    const dialog = showLegendaryReveal('peintre', {title: 'Nouvelle découverte !', name: 'Peintre', details: 'Légendaire', button: 'Fermer'});
    expect(dialog.querySelectorAll('.lr-band').length).toBe(5); expect(dialog.querySelectorAll('.lr-brush').length).toBe(5);
    expect(dialog.querySelectorAll('.lr-sunflower').length).toBe(2); expect(dialog.querySelector('.lr-hero > .lr-frame')).not.toBeNull();
    expect(dialog.style.getPropertyValue('--peintre-sky')).toContain('sky');
    dialog.remove();
    const panel = document.createElement('div');
    expect(decorateLegendaryCard(panel, 'peintre')).toBe(true); expect(panel.style.getPropertyValue('--legendary-banner')).toContain('peintre/sky');
    const css = readFileSync('src/display/styles.css', 'utf8') as string;
    for (const rule of ['@keyframes lr-band-paint', '.legendary-reveal-peintre.is-final .lr-frame { animation: none; opacity: 1;']) expect(css).toContain(rule);
  });
  it('stands still in the meadow while he shows, his drawing\'s face and crown hidden in a painted pose', () => {
    const scene = readFileSync('src/display/MeadowScene.ts', 'utf8') as string;
    expect(scene).toContain('!!rabbit.legendary?.still'); expect(scene).toContain('rabbit.legendary?.posing || rabbit.dadi?.posing');
    expect(scene).toContain('!rabbit.legendary?.posing);');
  });
});
