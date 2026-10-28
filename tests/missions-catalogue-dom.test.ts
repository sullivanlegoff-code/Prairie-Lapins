// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, advance, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {catalogueMainMissionIds} from '../src/simulation/missions';
import {previousStart} from './regression-start';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () {this.open = true;}; HTMLDialogElement.prototype.close = function () {this.open = false;};
});
afterEach(() => {for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks();});
function state(level = 7) {const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s;}
function setup(initial: GameState, tutorial = false) {
  let saved = encodeGame(initial);
  const controller = new GameController({getItem: key => key === SAVE_KEY ? saved : null, setItem: (_key, value) => {saved = value;}}, () => 0);
  const scene = {focusTutorialCell: vi.fn(), setTutorialCell: vi.fn(), setTutorialTarget: vi.fn(), setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn(), focusBuilding: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-mission-catalogue');
  prefs.set({muted: true, tutorial, intro: true, guideCamera: true, guideCollection: true, guideConfigured: true, pailleNamed: true, pailleScenes: []});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => {ui.dispose(); controller.dispose();});
  return {controller, ui, prefs};
}
const panel = () => document.getElementById('panel-content')!;
const cards = () => [...panel().querySelectorAll<HTMLElement>('[data-mission]')];
const card = (id: string) => panel().querySelector<HTMLElement>(`[data-mission="${id}"]`)!;
const filter = (key: string) => panel().querySelector<HTMLButtonElement>(`[data-mission-filter="${key}"]`)!;
const claim = (id: string) => card(id).querySelector<HTMLButtonElement>('.mission-claim')!;
const open = () => document.getElementById('open-missions')!.click();

describe('browsing all main missions from level seven', () => {
  it('opens the album and recurring discoveries without spending, and exposes decoration collections',()=>{
    const {ui,controller}=setup(state());ui.open({kind:'collection'});
    const click=(label:string)=>{const b=[...panel().querySelectorAll('button')].find(b=>b.textContent===label);expect(b).toBeDefined();b!.click();};
    click('Album et souvenirs');expect(panel().textContent).toContain('Cartes de voyage');expect(panel().textContent).toContain('Marrakech');
    click('Rendez-vous et découvertes');expect(panel().textContent).toContain('Fête des récoltes');
    const before=controller.getSnapshot().state!.pattes;click('Observer');expect(controller.getSnapshot().state!.cozy!.discoveries).toHaveLength(1);expect(controller.getSnapshot().state!.pattes).toBe(before);
    ui.open({kind:'shop',tab:'decorations'});click('Coin lecture');expect(panel().querySelectorAll('[data-catalog]')).toHaveLength(3);
    ui.open({kind:'arrange'});click('Déplacer un ensemble');expect(panel().textContent).toContain('Confirmer le déplacement');
  });
  it('puts rewards first, started objectives before untouched ones and claimed objectives last without hiding the catalogue', () => {
    const s = state(); s.missions.completed.push('discover-paille'); s.missions.claimed.push('discover-paille'); setup(s); open();
    const ids = cards().map(c => c.dataset.mission);
    expect(ids).toHaveLength(93);
    expect(cards()[0].dataset.missionStatus).toBe('ready');
    expect(ids.indexOf('level-ten')).toBeLessThan(ids.indexOf('at-nest'));
    expect(ids.at(-1)).toBe('discover-paille');
    expect(card('level-ten').classList.contains('mission-progressing')).toBe(true);
  });
  it('keeps the small initial view below seven, then opens all 93 solo objectives by default', () => {
    const young = setup(state(6)); open(); expect(cards().map(c => c.dataset.mission)).toEqual(['snow-habitat']); expect(filter('all')).toBeNull();
    young.ui.dispose(); young.controller.dispose(); cleanups.splice(0);
    const s = state(); s.missions.completed.push('discover-paille'); s.missions.claimed.push('discover-paille');
    setup(s); open(); expect(cards()).toHaveLength(93); expect(filter('all').getAttribute('aria-pressed')).toBe('true');
    expect(card('discover-paille').dataset.missionStatus).toBe('claimed'); expect(claim('discover-paille').disabled).toBe(true);
    expect(card('level-thirty').dataset.missionStatus).toBe('pending'); expect(card('decorate-robot-statue')).not.toBeNull();
    expect(panel().textContent).toContain('10 XP'); expect(document.querySelector('dialog[open]')).toBeNull();
  });
  it('filters real statuses, retains scroll and focus after a composite claim, and never displays zero XP', () => {
    const s = state(); s.discovered.push('dadi'); const {controller} = setup(s); open();
    expect(card('discover-dadi').textContent).toContain('60 pièces'); expect(card('discover-dadi').textContent).toContain('30 nourriture'); expect(card('discover-dadi').textContent).toContain('1 cœur'); expect(card('discover-dadi').textContent).not.toContain('0 XP');
    filter('ready').click(); expect(cards().every(c => c.dataset.missionStatus === 'ready')).toBe(true);
    panel().scrollTop = 180; const button = claim('discover-dadi'); button.focus(); const before = controller.getSnapshot().state!; button.click(); button.click();
    const after = controller.getSnapshot().state!;
    expect([after.pattes - before.pattes, after.grass - before.grass, after.hearts - before.hearts]).toEqual([60, 30, 1]);
    expect(after.progression).toEqual(before.progression); expect(card('discover-dadi')).toBeNull(); expect(panel().scrollTop).toBe(180); expect(document.activeElement).toBe(filter('ready'));
    expect(document.getElementById('toast')!.textContent).toContain('30 nourriture'); expect(document.getElementById('toast')!.textContent).toContain('1 cœur');
    filter('claimed').click(); expect(cards().map(c => c.dataset.mission)).toEqual(['discover-dadi']);
    filter('pending').click(); expect(cards().every(c => c.dataset.missionStatus === 'pending')).toBe(true);
    filter('all').click(); expect(cards()).toHaveLength(93); expect(filter('claimed').textContent).toBe('Terminées (1)');
    controller.refresh(); expect(filter('all').getAttribute('aria-pressed')).toBe('true'); expect(document.querySelector('dialog[open]')).toBeNull();
  });
  it('keeps the scroll position when claiming an unfinished initial reward from the complete catalogue', () => {
    const s = state(); s.rabbits[0].affection = 2; setup(s); open(); panel().scrollTop = 240;
    const button = claim('first-meal'); button.focus(); button.click();
    expect(panel().scrollTop).toBe(240); expect(card('first-meal').dataset.missionStatus).toBe('claimed'); expect(document.activeElement).toBe(filter('all'));
  });
  it('opens and uses filters and claims with real clicks even if an old solo guide is still at snowReward', () => {
    const s = state(); s.buildings.push(emptyBuilding('building-6', 'enclosure', 10, 40, 'neige')); s.nextId = 7; s.discovered.push('neige');
    const {controller, prefs} = setup(s, true); open(); expect(cards()).toHaveLength(93);
    filter('ready').click(); expect(filter('ready').getAttribute('aria-pressed')).toBe('true');
    const before = controller.getSnapshot().state!.pattes; claim('discover-paille').click();
    expect(controller.getSnapshot().state!.pattes).toBe(before + 20); expect(controller.getSnapshot().state!.missions.claimed).toContain('discover-paille');
    expect(document.body.classList.contains('onboarding-locked')).toBe(false);
    expect(prefs.value.pailleScenes).toEqual([]); // Opening the catalogue does not pretend that Paille's speech was read.
  });
  it('announces every component when the optional historical guide proposes a discovery reward', () => {
    let s = previousStart(0); s.progression = {totalXp: cumulativeLevelXp(7), rewardedThroughLevel: 7}; s.discovered.push('dadi'); s.missions.events.welcome = 1;
    s = advance(s, 0); s.missions.claimed = s.missions.completed.filter(id => id !== 'discover-dadi' && catalogueMainMissionIds(s).includes(id));
    const {controller} = setup(s, true), guide = document.getElementById('tutorial')!;
    expect(guide.hidden).toBe(false); expect(guide.textContent).toContain('60 pièces'); expect(guide.textContent).toContain('30 nourriture'); expect(guide.textContent).toContain('1 cœur'); expect(guide.textContent).not.toContain('0 XP');
    const button = [...guide.querySelectorAll('button')].find(b => b.textContent?.startsWith('Réclamer'))!; button.click();
    expect(controller.getSnapshot().state!.missions.claimed).toContain('discover-dadi'); expect(document.getElementById('toast')!.textContent).toContain('30 nourriture'); expect(document.getElementById('toast')!.textContent).toContain('1 cœur');
  });
});
