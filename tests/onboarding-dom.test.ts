// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
// @vitest-environment happy-dom
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {pailleLines} from '../src/ui/onboarding';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {previousStart} from './regression-start';
import type {MeadowScene} from '../src/display/MeadowScene';
import {SAVE_KEY} from '../src/persistence/storage';

const cleanup: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); });
function setup(initial = createGame(0), laboratory = false, roll = .65) {
  let raw = encodeGame(initial); const clock = {now: 0};
  const controller = new GameController({scope: laboratory ? 'laboratory' : 'normal', getItem: k => k === SAVE_KEY ? raw : null, setItem: (_k, v) => { raw = v; }}, () => clock.now, () => roll);
  const prefs = new PreferenceStore('onboarding-test'); prefs.set({muted: true});
  const methods = new Map(); const scene = new Proxy({}, {get: (_t,key) => { if(!methods.has(key))methods.set(key,vi.fn());return methods.get(key); }}) as MeadowScene;
  const ui = new GameUI(controller, scene, () => clock.now, prefs);
  cleanup.push(() => { ui.dispose(); controller.dispose(); });
  const state = () => controller.getSnapshot().state!;
  return {controller, ui, prefs, state, clock, scene};
}
const modal = () => document.getElementById('paille-dialogue') as HTMLDialogElement;
const script = [
  ['Bienvenue sur l’île des lapins ! Cette île a été construite pour une célébration très spéciale !', 'Ici, tu vas pouvoir découvrir le merveilleux monde des lapins !', 'D’abord, donne-moi un prénom !', 'Miel, c’est un très joli prénom, il me va très bien ! Bah ouais !', 'Je m’ennuie ici, je veux que tu me trouves un amoureux !'],
  ['J’ai très faim ! Tu me fais tourner la tête ! Bah ouais !'],
  ['La ferme permet de nous nourrir ! J’aime manger autant que faire des bisous, c’est très important pour nous autres lapins !'],
  ['Une fois bien nourris, on peut essayer d’obtenir des lapins !'],
  ['Viens, on fait nos bails ! Bah ouais !'],
  ['Notre lapereau grandit dans la nurserie ! On découvrira son espèce quand il sera grand.', 'Quand il est prêt, accueille-le dans un habitat. Bah ouais !'],
  ['Je suis né d’un amour très fort entre deux êtres. Ce village t’appartient maintenant, prends-en le plus grand soin ! <3'],
];
function click(label: string, scope: ParentNode = modal()) { const b = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label); expect(b, label).toBeDefined(); b!.click(); }
function speech(scene: number, line = 0) {
  expect(modal().open).toBe(true); expect(modal().dataset.scene).toBe(String(scene));
  expect(document.getElementById('paille-speech')!.textContent).toBe(script[scene - 1][line]);
}
function next() { modal().click(); }
function name(value: string) { (document.getElementById('paille-name') as HTMLInputElement).value = value; modal().querySelector('form')!.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})); }
function introduction() {
  speech(1); next(); speech(1, 1); modal().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); speech(1, 2);
  expect(document.activeElement?.id).toBe('paille-name'); expect(document.getElementById('paille-name')!.getAttribute('enterkeyhint')).toBe('done');
  next(); speech(1, 2); name('   '); expect(document.getElementById('paille-name-error')!.textContent).toContain('vide');
  name('x'.repeat(33)); expect(document.getElementById('paille-name-error')!.textContent).toContain('32');
  name(' Miel '); speech(1, 3); next(); speech(1, 4); next(); speech(1, 4); click('Trouver un amoureux pour Miel');
}


const content = () => document.getElementById('panel-content')!;
function help() {
  for(let i=0;i<8 && modal().open && !modal().querySelector('.paille-bubble button');i++) next();
  const b = modal().querySelector<HTMLButtonElement>('.paille-bubble button'); expect(b, modal().textContent!).toBeTruthy(); b!.click();
}
function real() {
  const root = (document.getElementById('breeding-dialog') as HTMLDialogElement).open ? document.getElementById('breeding-dialog')! : content();
  const b=root.querySelector<HTMLButtonElement>('button.guide-target');expect(b,root.textContent!).toBeTruthy();expect(b!.disabled,b!.textContent!).toBe(false);b!.click();
}
it.each([.1,.65])('guides every real action, roll=%s, with reloads and no controller shortcuts', roll => {
  const {state,ui,prefs,scene,controller} = setup(createGame(0),false,roll); introduction();
  const checkpoints: ReturnType<typeof state>[]=[]; const checkpoint=()=>checkpoints.push(state());
  expect([state().pattes,state().grass]).toEqual([350,0]);
  document.getElementById('open-collection')!.click(); expect(content().textContent).toContain('Jardin enneigé');
  document.getElementById('recenter-view')!.click();expect(scene.recenter).toHaveBeenCalled();
  ui.select({kind:'rabbit',id:'rabbit-2'});document.getElementById('open-missions')!.click();
  real(); expect(content().textContent).toContain('Emplacement valide');
  const firstGhost=vi.mocked(scene.setPlacement).mock.calls.at(-1)![0]!;expect(firstGhost.cell).toEqual({x:0,y:32});
  real();expect(state().pattes).toBe(150);checkpoint();
  const snow = state().buildings.find(b=>b.habitat?.type==='neige')!;
  expect(snow.x).toBeGreaterThanOrEqual(0);
  help();real();real();real(); expect(state().pattes).toBe(70);checkpoint();
  // Playtest of 25 October 2026: the finished Neige purchase no longer stays on screen behind Paille.
  expect(document.getElementById('game-panel')!.hidden).toBe(true);
  help();real();expect(state().pattes).toBe(120);checkpoint();
  help();real();expect(content().textContent).toContain('Aucune case sélectionnée');expect(vi.mocked(scene.setPlacement).mock.calls.at(-1)![0]!.cell).toBeNull();
  // Playtest of 26 October 2026: no hand on the disabled confirmation; the scene points at the suggested cell instead.
  expect(content().querySelector('.guide-target')).toBeNull();expect(vi.mocked(scene.setTutorialCell).mock.calls.at(-1)![0]).not.toBeNull();
  ui.select({kind:'fineCell',x:6,y:36});expect(content().querySelector('.guide-target')?.textContent).toMatch(/^(Acheter et placer|Confirmer)/);real();expect(state().pattes).toBe(60);
  help();real();expect(state().pattes).toBe(50);checkpoint();
  help();real();help();real();expect(state().grass).toBe(20);checkpoint();
  help();real();expect(state().grass).toBe(18);help();real();expect(state().grass).toBe(16);checkpoint();
  help();real();
  const selected=[...document.querySelectorAll('.breeding-column .selected strong')].map(e=>e.textContent);
  expect(selected).toEqual(['Miel','Lapin Neige']);real();
  help();real();checkpoint();help();
  ui.select({kind:'birth',id:'building-4'});expect(scene.focusBuilding).toHaveBeenCalledWith('building-5');
  checkpoint();help();real();checkpoint();help();real();
  expect(state().missions.events.welcome).toBe(1);expect(state().rabbits.at(-1)!.species).toBe(roll===.1?'frisket':'icy');
  expect(state().initiation!.used).toEqual(['order','breeding','growth']);expect(state().hearts).toBe(14);
  help();expect(prefs.value.tutorialDone).toBe(true);expect(document.getElementById('game-panel')!.dataset.view).toBe('missions');
  document.getElementById('open-collection')!.click();expect(document.getElementById('game-panel')!.dataset.view).toBe('collection');
  ui.dispose();controller.dispose();
  const readyParents=checkpoints.find(saved=>saved.rabbits.length===2 && saved.rabbits.every(r=>r.affection===2) && !saved.missions.events.breed);
  if(readyParents) {
    new PreferenceStore('onboarding-test').restartGuidance();const pairing=setup(readyParents);help();real();
    pairing.controller.refresh();expect(document.querySelector('#breeding-dialog .breeding-launch.guide-target')).toBeTruthy();
    click('×',document.getElementById('breeding-dialog')!);expect(modal().open).toBe(true);help();real();
    click('Passer le tutoriel',document.getElementById('breeding-dialog')!);expect(document.querySelector('.onboarding-unavailable')).toBeNull();
    pairing.ui.dispose();pairing.controller.dispose();
  }
  const waitingFarm=checkpoints.find(saved=>saved.buildings.some(b=>b.order));
  if(waitingFarm) {
    new PreferenceStore('onboarding-test').restartGuidance();waitingFarm.initiation!.closed.push('order');waitingFarm.initiation!.used.push('order');
    const fallback=setup(waitingFarm);expect(modal().textContent).toContain('Attendre ou utiliser les cœurs');help();
    expect(content().querySelector('.guide-target')?.closest('.paid-acceleration')).toBeTruthy();
    fallback.clock.now=300001;document.getElementById('close-panel')!.click();help();expect(content().querySelector('.guide-target')?.textContent).toContain('Récolter');
    fallback.ui.dispose();fallback.controller.dispose();
  }
  for(const saved of checkpoints) {
    new PreferenceStore('onboarding-test').restartGuidance();const resumed=setup(saved,false,roll);
    expect(modal().open).toBe(true);expect(modal().querySelector('input')).toBeNull();
    // « Rejoindre la nurserie » performs the transfer itself and follows the baby to the nursery.
    help();if(saved.buildings.some(b=>b.breeding && b.breeding.endsAt<=0)){expect(resumed.controller.getSnapshot().state!.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();expect(resumed.scene.focusBuilding).toHaveBeenCalledWith('building-5');}else expect(content().querySelector('.guide-target')).toBeTruthy();resumed.ui.dispose();resumed.controller.dispose();
  }
});
it('replays the current task after reload and closing panels, retaining the name',()=>{
  const first=setup();introduction();real();real();
  const saved=first.state();first.ui.dispose();first.controller.dispose();const second=setup(saved);
  expect(modal().dataset.scene).toBe('8');expect(document.getElementById('paille-name')).toBeNull();help();
  document.getElementById('close-panel')!.click();expect(modal().open).toBe(true);expect(modal().dataset.scene).toBe('8');
  click('Passer le tutoriel');expect(second.prefs.value.tutorial).toBe(false);document.getElementById('open-collection')!.click();expect(document.getElementById('game-panel')!.dataset.view).toBe('collection');
});
it('keeps Settings available during speech and resumes after closing them',()=>{
  const {scene}=setup();click('Paramètres');expect(document.getElementById('game-panel')!.dataset.view).toBe('settings');
  document.getElementById('close-panel')!.click();expect(modal().open).toBe(true);
  click('Passer le tutoriel');expect(document.querySelector('.onboarding-unavailable')).toBeNull();expect(scene.setTutorialTarget).toHaveBeenLastCalledWith(null);
});
it('leaves old saves and laboratory unlocked',()=>{
  const old=setup(previousStart(0));expect(modal().open).toBe(false);old.ui.dispose();old.controller.dispose();
  setup(createGame(0),true);expect(modal().open).toBe(false);expect(document.querySelector('.onboarding-unavailable')).toBeNull();
});



it('keeps owner-approved new lines centralized and exact',()=>{
 expect(pailleLines(8,'Miel')).toEqual(['Un jardin tout blanc… Maintenant, invite quelqu’un à y vivre !']);
 expect(pailleLines(9,'Miel')).toEqual(['Les missions te récompensent ! Récupère ton cadeau.']);
 expect(pailleLines(10,'Miel')).toEqual(['Plus tu nous nourris, plus on t’aime… et plus on rapporte de pièces !']);
 expect(pailleLines(11,'Miel')).toEqual(['On attend notre bébé ! Je te fais gagner du temps.']);
 expect(pailleLines(7,'Miel').at(-1)).toBe('Tes missions t’attendent, il reste des récompenses !');
});
it('lets system dialogs opened during the tutorial be closed, such as the level-up Continue', () => {
  setup(); speech(1);
  // The level dialog opens between two renders (ProgressionFeedback), after the lock was applied.
  const level = document.getElementById('player-level-dialog') as HTMLDialogElement, cont = document.getElementById('continue-level-up') as HTMLButtonElement;
  expect(cont.classList.contains('onboarding-unavailable')).toBe(false); expect(cont.getAttribute('aria-disabled')).toBeNull();
  level.showModal(); let clicked = 0; cont.addEventListener('click', () => { clicked++; });
  cont.click(); expect(clicked).toBe(1);
  // Outside a dialog the guided lock still applies.
  expect(document.getElementById('open-shop')!.classList.contains('onboarding-unavailable')).toBe(true);
});
