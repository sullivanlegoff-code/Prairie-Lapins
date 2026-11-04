// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {JUMP_ROPE} from '../src/config/balance';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
let now = 0;
beforeEach(() => {
  now = 0;
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); });
let clock = 0;
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => now);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('jump-rope'); prefs.set({tutorial: false, muted: true});
  clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const ui = new GameUI(controller, scene, () => now, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
const layer = () => document.querySelector<HTMLElement>('.jump-rope-activity')!;
const stage = () => layer().querySelector<HTMLElement>('[data-jump-rope-stage]')!;
const tapAt = (t: number) => { clock = t; stage().dispatchEvent(new Event('pointerdown', {bubbles: true, cancelable: true})); };
const slotText = (slot: number) => panel().querySelector(`[data-jump-rope-slot="${slot}"]`)!.textContent;
/** Level 20, the islet bought, a universal enclosure (building-100) with Noisette (affection 9), Pompon (6) and Caramel (4). */
function game(): GameState {
  const s = createGame(0); s.pattes = 1_000; s.progression = {totalXp: cumulativeLevelXp(JUMP_ROPE.unlockLevel), rewardedThroughLevel: JUMP_ROPE.unlockLevel};
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  const c = free(); s.buildings.push(emptyBuilding('building-100', 'enclosure', c.x, c.y)); s.jumpIsland = true;
  for (const [id, name, affection] of [['rabbit-101', 'Noisette', 9], ['rabbit-102', 'Pompon', 6], ['rabbit-103', 'Caramel', 4]] as const)
    s.rabbits.push({id, species: 'paille', affection, enclosureId: 'building-100', name});
  s.nextId = 104; return s;
}

it('the shop sells the islet whole, for 75 000 pattes from level 20, and not the old kiosk building', () => {
  const s = game(); delete s.jumpIsland; s.pattes = 80_000;
  const {ui, controller} = mount(s); ui.open({kind: 'shop', tab: 'buildings'});
  expect(panel().textContent).not.toContain('Terrain de corde à sauter');
  const card = panel().querySelector<HTMLElement>('[data-jump-island-offer]')!;
  expect(card.textContent).toContain('Île de la corde à sauter'); expect(card.textContent).toMatch(/Acheter · 75\s000 pièces/u);
  expect(card.textContent).toContain('à gauche de la tienne');
  card.querySelector<HTMLButtonElement>('button')!.click();
  expect(controller.getSnapshot().state!.jumpIsland).toBe(true); expect(controller.getSnapshot().state!.pattes).toBe(5_000);
  expect(panel().querySelector('[data-jump-rope-play]')).not.toBeNull();
});

it('below level 20, the islet card says the level it needs', () => {
  const s = game(); delete s.jumpIsland; s.pattes = 80_000; s.progression = {totalXp: cumulativeLevelXp(19), rewardedThroughLevel: 19};
  const {ui} = mount(s); ui.open({kind: 'shop', tab: 'buildings'});
  const card = panel().querySelector<HTMLElement>('[data-jump-island-offer]')!;
  expect(card.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true); expect(card.textContent).toContain('Niveau 20 requis');
});

it('the islet picks a trio, plays one life with Rejouer, pays the jumps and remembers the trio', () => {
  const {ui, controller} = mount(game()); ui.open({kind: 'jumpIsland'});
  expect(panel().textContent).toContain('Encore 3 parties récompensées aujourd’hui');
  // By default the most affectionate rabbit jumps and the next two turn the rope.
  expect(slotText(2)).toContain('Athlète : Noisette'); expect(slotText(0)).toContain('Porteur : Pompon'); expect(slotText(1)).toContain('Porteur : Caramel');
  // Caramel becomes the athlete: Noisette takes Caramel's place.
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-slot="2"] button')!.click();
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-103"] button')!.click();
  expect(slotText(2)).toContain('Athlète : Caramel'); expect(slotText(1)).toContain('Porteur : Noisette');
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-play]')!.click();
  expect(layer().hidden).toBe(false); expect(layer().textContent).toContain('Caramel saute à la corde !');
  expect(layer().textContent).toContain('Pompon et Noisette font tourner la corde');
  expect(layer().querySelectorAll('.jump-rope-carrier img').length).toBe(2); expect(layer().querySelector('.jump-rope-post')).toBeNull();
  expect(stage().querySelector<HTMLImageElement>('img.jump-rope-island')!.src).toContain('assets/jump-rope/island.webp');
  expect(stage().querySelector('canvas.jump-rope-sky')).not.toBeNull();
  layer().querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  // Five good jumps right on each pass, then one tap far from the rope: the game is over at once.
  let pass = JUMP_ROPE.leadIn, period: number = JUMP_ROPE.startPeriod;
  for (let i = 0; i < 5; i++) { tapAt(pass); period = Math.max(JUMP_ROPE.minPeriod, period * JUMP_ROPE.speedUp); pass += period; }
  expect(layer().querySelector('.jump-rope-score')!.textContent).toBe('5 sauts');
  expect(layer().querySelector('.jump-rope-combo')!.textContent).toBe('Parfait ×5');
  tapAt(pass - period / 2);
  const card = layer().querySelector<HTMLElement>('[data-jump-rope-card]')!;
  expect(card.hidden).toBe(false); expect(card.textContent).toContain('Caramel a fait 5 sauts !'); expect(card.textContent).toContain('+10');
  expect(card.textContent).toContain('Ton premier record');
  let s = controller.getSnapshot().state!;
  expect(s.pattes).toBe(1_010); expect(s.jumpRope).toMatchObject({rewarded: 1, best: 5, team: {carriers: ['rabbit-102', 'rabbit-101'], athlete: 'rabbit-103'}});
  // Rejouer starts the next game at once; a miss on the first pass scores nothing and keeps the record.
  card.querySelector<HTMLButtonElement>('[data-jump-rope-again]')!.click();
  expect(card.hidden).toBe(true); expect(layer().querySelector('.jump-rope-best')!.textContent).toBe('Record : 5');
  const start = clock; tapAt(start + 10);
  expect(card.hidden).toBe(false); expect(card.textContent).toContain('Caramel s’est emmêlé les pattes'); expect(card.textContent).toContain('Ton record : 5 sauts');
  s = controller.getSnapshot().state!; expect(s.jumpRope).toMatchObject({rewarded: 1, best: 5});
  card.querySelector<HTMLButtonElement>('[data-jump-rope-quit]')!.click();
  expect(layer().hidden).toBe(true); expect(panel().textContent).toContain('Ton record : 5 sauts');
});

it('the remembered trio comes back, a rabbit on a trip cannot be chosen, and the space bar jumps too', () => {
  const s = game(); s.jumpRope = {cycle: 0, rewarded: 0, best: 3, team: {carriers: ['rabbit-101', 'rabbit-103'], athlete: 'rabbit-102'}};
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  const c = free(); s.buildings.push(emptyBuilding('building-105', 'agency', c.x, c.y));
  const d = free(); s.buildings.push(emptyBuilding('building-106', 'enclosure', d.x, d.y)); s.nextId = 107;
  s.rabbits.push({id: 'rabbit-104', species: 'neige', affection: 20, enclosureId: 'building-106'}); s.discovered.push('neige');
  s.travel = {welcomed: true, trips: [{rabbitId: 'rabbit-104', destination: 'Paris', startedAt: 0, endsAt: 3 * 3_600_000, hearts: 1}]};
  const {ui} = mount(s); ui.open({kind: 'jumpIsland'});
  expect(slotText(2)).toContain('Athlète : Pompon'); expect(slotText(0)).toContain('Porteur : Noisette'); expect(slotText(1)).toContain('Porteur : Caramel');
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-slot="0"] button')!.click();
  expect(panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-104"] button')!.disabled).toBe(true);
  expect(panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-101"] button')!.disabled).toBe(true); // Already there.
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-103"] button')!.click();
  expect(slotText(0)).toContain('Porteur : Caramel'); expect(slotText(1)).toContain('Porteur : Noisette');
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-play]')!.click();
  layer().querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  clock = JUMP_ROPE.leadIn; document.dispatchEvent(new KeyboardEvent('keydown', {key: ' '}));
  expect(layer().querySelector('.jump-rope-score')!.textContent).toBe('1 saut');
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); expect(layer().hidden).toBe(true);
});

it('needs three rabbits at home to play', () => {
  const s = game(); s.rabbits = s.rabbits.slice(0, 2);
  const {ui} = mount(s); ui.open({kind: 'jumpIsland'});
  const play = panel().querySelector<HTMLButtonElement>('[data-jump-rope-play]')!;
  expect(play.disabled).toBe(true); expect(panel().textContent).toContain('Il te faut trois lapins à la maison');
});

it('the islet menu shows the challenge of the day and the medals still to win', () => {
  const s = game(); s.jumpRope = {cycle: 0, rewarded: 0, best: 26};
  const {ui} = mount(s); ui.open({kind: 'jumpIsland'});
  expect(panel().textContent).toMatch(/Défi du jour : (15|20|25) sauts/u);
  expect(panel().textContent).toContain('Médailles sur le kiosque : 10, 25 sauts. Prochaine médaille à 50 sauts.');
  expect([...panel().querySelectorAll<HTMLImageElement>('[data-jump-rope-medal]')].map(img => img.dataset.jumpRopeMedal)).toEqual(['10', '25']);
});

it('a « tac » marks each pass of the rope, the carriers console a miss and applaud a record', async () => {
  const {mountJumpRopeActivity} = await import('../src/ui/JumpRopeActivity');
  let t = 0, ticks = 0, best = 2; const host = document.createElement('div'); document.body.append(host);
  const activity = mountJumpRopeActivity(host, {onFinished: () => '', best: () => best, tick: () => { ticks++; }, challengeText: () => 'Défi du jour : 20 sauts', clock: () => t, frame: () => 0});
  cleanups.push(() => activity.dispose());
  const r = {id: 'rabbit-1', species: 'paille' as const, affection: 3};
  activity.open({carriers: [{...r, id: 'rabbit-2'}, {...r, id: 'rabbit-3'}], athlete: r});
  expect(activity.element.textContent).toContain('Défi du jour : 20 sauts');
  activity.element.querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  // The count-in beat before the first pass, then one « tac » per pass, early or late taps alike.
  t = JUMP_ROPE.leadIn - JUMP_ROPE.startPeriod; activity.update(); expect(ticks).toBe(1);
  t = JUMP_ROPE.leadIn - 30; activity.tap(); activity.update(); expect(ticks).toBe(1); // An early jump: the pass is still to come.
  t = JUMP_ROPE.leadIn; activity.update(); expect(ticks).toBe(2);
  activity.update(); expect(ticks).toBe(2);
  let pass = JUMP_ROPE.leadIn, period = JUMP_ROPE.startPeriod * JUMP_ROPE.speedUp;
  for (let i = 0; i < 2; i++) { pass += period; t = pass; activity.update(); activity.tap(); period *= JUMP_ROPE.speedUp; }
  expect(ticks).toBe(4);
  const carriers = [...activity.element.querySelectorAll('.jump-rope-carrier')];
  expect(carriers.every(c => c.classList.contains('applaud'))).toBe(true); // Jump 3 beat the record of 2.
  expect(activity.element.querySelector('.jump-rope-cheer')!.textContent).toBe('Bravo !');
  // A miss: the game ends, and the record of this game is applauded on the card.
  t = pass + period / 2; activity.tap();
  expect(activity.element.querySelector('[data-jump-rope-card]')!.textContent).toContain('Nouveau record');
  // Next game, no record: a first-pass miss is consoled.
  best = 3; activity.element.querySelector<HTMLButtonElement>('[data-jump-rope-again]')!.click(); t += 10; activity.tap();
  expect(carriers.every(c => c.classList.contains('console'))).toBe(true);
  expect(activity.element.querySelector('.jump-rope-cheer')!.textContent).toBe('Courage, on recommence !');
});

it('an evolved rabbit jumps and turns the rope with its evolved drawing (audit 4 November 2026)', () => {
  const s = game();
  const [noisette, pompon, caramel] = ['rabbit-101', 'rabbit-102', 'rabbit-103'].map(id => s.rabbits.find(r => r.id === id)!);
  noisette.affection = 32; pompon.affection = 30; caramel.affection = 29;
  noisette.evolution = {done: true, challenges: {voyage: 1}};
  const {ui} = mount(s); ui.open({kind: 'jumpIsland'});
  expect(slotText(2)).toContain('Athlète : Noisette');
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-play]')!.click();
  // Noisette (evolved) jumps with the new drawing; Pompon and Caramel have not evolved.
  expect(layer().querySelector<HTMLImageElement>('.jump-rope-rabbit .jump-rope-figure img')!.src).toContain('paille-v2');
  const carriers = [...layer().querySelectorAll<HTMLImageElement>('.jump-rope-carrier .jump-rope-figure img')].map(img => img.src);
  expect(carriers.length).toBe(2); expect(carriers.some(src => src.includes('paille-v2'))).toBe(false);
});
