// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {BRANCH_MISSION_IDS, SOLO_INITIAL_MISSION_IDS} from '../src/config/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {HOUR} from '../src/config/balance';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (()=>void)[]=[];
beforeEach(()=>{
  document.body.innerHTML=html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g,'');
  localStorage.clear();vi.stubGlobal('requestAnimationFrame',()=>0);vi.stubGlobal('cancelAnimationFrame',()=>{});
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{cleanups.splice(0).reverse().forEach(f=>f());vi.unstubAllGlobals();});
function mount(s: GameState, now=0){
  const values=new Map([[SAVE_KEY,encodeGame(s)]]);
  const controller=new GameController({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}},()=>now);
  const scene={setRabbitPurchase:vi.fn(),setExpansion:vi.fn(),setPlacement:vi.fn(),setArrangement:vi.fn(),setDecorationSelection:vi.fn(),setPhoto:vi.fn()} as unknown as MeadowScene;
  const prefs=new PreferenceStore('economy-b');prefs.set({tutorial:false,muted:true});
  const ui=new GameUI(controller,scene,()=>now,prefs);cleanups.push(()=>{ui.dispose();controller.dispose();});return {ui,controller};
}
const panel=()=>document.getElementById('panel-content')!;
it('renders two goals, then reveals the next durable goal only after claiming',()=>{
  const s=createGame(0);s.missions.claimed=[...SOLO_INITIAL_MISSION_IDS,...BRANCH_MISSION_IDS];s.missions.completed=[...s.missions.claimed];s.progression={totalXp:cumulativeLevelXp(5),rewardedThroughLevel:5};
  const {ui}=mount(s);ui.open({kind:'missions',tab:'main'});
  expect(panel().querySelectorAll('[data-mission]')).toHaveLength(1);expect(panel().textContent).toContain('Atteindre le niveau 5');
  expect(panel().textContent).not.toContain('Accueillir Feu');panel().querySelector<HTMLButtonElement>('.mission-claim')!.click();
  expect(panel().textContent).toContain('Accueillir Feu');
});
it('shows free hints in collection and notebook while keeping affection and odds hidden',()=>{
  const {ui}=mount(createGame(0));ui.open({kind:'collection'});expect(panel().querySelectorAll('.recipe-hint')).toHaveLength(19);
  ui.open({kind:'recipes'});expect(panel().querySelectorAll('.recipe-hint')).toHaveLength(19);
  for(const card of panel().querySelectorAll('[data-recipe-known="false"]')){expect(card.textContent).not.toMatch(/Affection|\d+ %/);}
  for(const id of ['bouee','dinono','magicien','dragon','dadi','maxou','orange','requin'])expect(panel().querySelector(`[data-recipe="${id}"] .recipe-hint`)).toBeNull();
});
it('renders the ten crops with their icon, locks the later ones and shows a local completion clock for a running crop',()=>{
  const s=createGame(0);s.pattes=1000;s.buildings.push(emptyBuilding('building-100','farm',0,32));s.nextId=101;s.progression={totalXp:cumulativeLevelXp(5),rewardedThroughLevel:5};
  const {ui,controller}=mount(s);ui.select({kind:'building',id:'building-100'});
  const crops=[...panel().querySelectorAll<HTMLElement>('.farm-order')];
  expect(crops.map(c=>c.dataset.crop)).toEqual(['foin','pissenlit','trefle','persil','laitue','fanes','fenouil','pomme','fraise','banane']);
  expect(crops.every(c=>c.querySelector('img.crop-icon'))).toBe(true);expect(crops[9].textContent).toContain('Banane');expect(crops[9].textContent).toContain('10 h');
  expect(crops[3].querySelector('button')?.textContent).toBe('Cultiver · 50 pièces');expect(crops[4].querySelector('button')).toBeNull();expect(crops[4].querySelector('.badge')?.textContent).toBe('Niveau 7 requis');
  controller.perform({type:'startOrder',id:'building-100',recipe: 'persil'});
  expect(panel().querySelector('.order-ready-time')?.textContent).toMatch(/^Prête vers \d+ h \d{2}$/);
});
it('shows the accumulated gift amount and the timer only when none is ready',()=>{
  const s=createGame(0),{ui}=mount(s,s.nextHeartGiftAt+48*HOUR);ui.open({kind:'hearts'});
  expect(panel().textContent).toContain('3 cadeaux · 6 cœurs');expect(panel().querySelector('.timer')).toBeNull();
  panel().querySelector<HTMLButtonElement>('.heart-gift')!.click();
  expect(panel().textContent).toContain('Aucun cadeau prêt');expect(panel().textContent).toContain('Prochain cadeau dans :');expect(panel().querySelector('.timer')).not.toBeNull();
});
it('shows the Cuisine quota before choosing a rabbit and inside the activity',()=>{
  const s=createGame(0);s.buildings.push(emptyBuilding('building-100','kitchen',0,32));s.nextId=101;s.cuisine.fullRuns={cycle:0,used:2};
  const {ui}=mount(s);ui.open({kind:'cuisineRabbit'});expect(panel().textContent).toContain('Encore 3 récompenses complètes aujourd’hui');
  panel().querySelector<HTMLButtonElement>('[data-cuisine-rabbit]')!.click();
  expect(document.querySelector('.cuisine-activity .cuisine-quota')?.textContent).toBe('Encore 3 récompenses complètes aujourd’hui');
});
