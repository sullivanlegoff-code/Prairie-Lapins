// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import * as kitchenApi from '../cooktap-prototype/main';
import * as cuisineHostApi from '../src/ui/CuisineActivity';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {KitchenEngine} from '../cooktap-prototype/engine';
import {createGame,encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {buildingPlacementReason} from '../src/simulation/placement';
import {SPECIES,CUISINE_REWARDS} from '../src/config/balance';
import {portrait} from '../src/ui/portraits';
import mainStyles from '../src/display/styles.css?raw';
import {fitScene,toClient} from '../cooktap-prototype/geometry';

const cleanups: (() => void)[] = [];
let frames: FrameRequestCallback[];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear(); vi.useFakeTimers(); frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const query = new EventTarget(); Object.defineProperty(query, 'matches', {value: false});
  vi.stubGlobal('matchMedia', () => query);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(dispose => dispose()); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(withKitchen = true, rabbits?: 'duplicates' | 'different' | 'empty' | 'cap') {
  const values = new Map<string, string>();
  if (withKitchen) {
    const initial=createGame(0);
    if (rabbits === 'cap') initial.rabbits[0].affection=20;
    if (rabbits === 'empty') initial.rabbits=[];
    if (rabbits === 'duplicates') initial.rabbits.push({...initial.rabbits[0],id:'rabbit-101'});
    if (rabbits === 'different') {
      initial.rabbits.push({...initial.rabbits[0],id:'rabbit-101',species:'lunettes'});
      if(!initial.discovered.includes('lunettes'))initial.discovered.push('lunettes');
    }
    const cells=Array.from({length:48*48},(_,i)=>({x:i%48,y:Math.floor(i/48)}));
    const cell=cells.find(({x,y})=>buildingPlacementReason(initial,x,y)===null);
    if(!cell)throw Error('No free kitchen footprint in test fixture');
    initial.buildings.push(emptyBuilding('building-100','kitchen',cell.x,cell.y));initial.nextId=102;
    values.set(SAVE_KEY,encodeGame(initial));
  }
  const storage = {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }};
  const controller = new GameController(storage, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn()} as unknown as MeadowScene;
  const preferences = new PreferenceStore('cuisine-integration'); preferences.set({muted: true, tutorial: false});
  const completed = vi.fn();
  const mounted = vi.spyOn(kitchenApi, 'mountKitchen');
  const hostMounted = vi.spyOn(cuisineHostApi, 'mountCuisineActivity');
  const ui = new GameUI(controller, scene, () => 0, preferences, undefined, {onCuisineCompleted: completed});
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  const choose = (id?: string) => {
    const choices=[...document.querySelectorAll<HTMLButtonElement>('[data-cuisine-rabbit]')];
    (id ? choices.find(b=>b.dataset.cuisineRabbit===id)! : choices[0]).click();
  };
  const enterButton = () => [...document.querySelectorAll<HTMLButtonElement>('#game-panel button')].find(b => b.textContent === 'Entrer dans la Cuisine');
  const open = () => { ui.select({kind: 'building', id: 'building-100'}); enterButton()!.click(); choose(); };
  const exit = () => document.querySelector<HTMLButtonElement>('[data-cuisine-exit]')!.click();
  const activity = (index = 0): ReturnType<typeof kitchenApi.mountKitchen> => mounted.mock.results[index].value;
  const host: ReturnType<typeof cuisineHostApi.mountCuisineActivity> = hostMounted.mock.results[0].value;
  return {ui, controller, completed, mounted, open, enterButton, exit, activity, choose, host, storage, values};
}
const drop = (engine: KitchenEngine, id: string, zone: string) => engine.dispatch({type: 'drop', itemId: id, target: {kind: 'zone', id: zone}});
function finishSalad(engine: KitchenEngine) {
  for (const id of ['tomato', 'mozzarella', 'cucumber']) {
    expect(drop(engine, id, 'cutting-board').accepted).toBe(true);
    expect(engine.dispatch({type: 'use-tool', toolId: 'knife', targetId: id}).accepted).toBe(true);
    expect(drop(engine, id, 'bowl').accepted).toBe(true);
  }
  expect(drop(engine, 'olive-oil', 'bowl').accepted).toBe(true);
}
describe('main-game Cuisine activity', () => {
  it('shows cap feedback without a fake daily +1 and still records the consumed opportunity',()=>{
    const k=setup(true,'cap');k.open();const a=k.activity();
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();finishSalad(a.engine);a.refresh();
    const feedback=a.root.querySelector('.cuisine-reward-feedback')!.textContent;
    expect(feedback).toContain('Affection maximale');expect(feedback).not.toContain('+1 Affection');
    const state=k.controller.getSnapshot().state!;
    expect(state.rabbits[0].affection).toBe(20);expect(state.cuisine.affectionCycles[state.rabbits[0].id]).toBe(0);
  });
  it.each(['salad','chicken'] as const)('saves exactly one base reward for %s and shows feedback only after the canonical command',recipe=>{
    const k=setup(),before=structuredClone(k.controller.getSnapshot().state!);
    const performed=vi.spyOn(k.controller,'perform');k.open();const a=k.activity(),e=a.engine;
    expect(k.controller.getSnapshot().state).toEqual(before);
    a.root.querySelector<HTMLButtonElement>(`#recipe-${recipe}`)!.click();
    expect(drop(e,recipe==='salad'?'tomato':'chicken',recipe==='salad'?'bowl':'baking-dish').accepted).toBe(false);a.refresh();
    expect(performed).not.toHaveBeenCalled();expect(k.controller.getSnapshot().state).toEqual(before);
    if(recipe==='salad')finishSalad(e);
    else{
      drop(e,'chicken','cutting-board');e.dispatch({type:'use-tool',toolId:'knife',targetId:'chicken'});
      for(const id of ['soy','honey'])expect(e.dispatch({type:'drop',itemId:id,target:{kind:'item',id:'chicken'}}).accepted).toBe(true);
      expect(drop(e,'chicken','baking-dish').accepted).toBe(true);
      drop(e,'sweet-potato','cutting-board');
      for(const id of ['peeler','knife'])expect(e.dispatch({type:'use-tool',toolId:id,targetId:'sweet-potato'}).accepted).toBe(true);
      drop(e,'sweet-potato','baking-dish');drop(e,'baking-dish','oven');e.advance(5000);
    }
    a.refresh();a.refresh();vi.advanceTimersByTime(1000);a.refresh();
    expect(performed).toHaveBeenCalledExactlyOnceWith({type:'rewardCuisine',rabbitId:before.rabbits[0].id,recipeId:recipe});
    const paid=CUISINE_REWARDS[recipe],expected={...before,pattes:before.pattes+paid.pattes,grass:before.grass+paid.grass,hearts:before.hearts+1,
      missions:{...before.missions,completed:[...before.missions.completed,'first-meal'],daily:{...before.missions.daily,progress:{...before.missions.daily.progress,'gain-affection':before.missions.daily.progress['gain-affection']}}},
      rabbits:before.rabbits.map((r,i)=>i===0?{...r,affection:r.affection+1}:r),cuisine:{affectionCycles:{[before.rabbits[0].id]:before.missions.daily.cycleIndex},heartCycle:before.missions.daily.cycleIndex,fullRuns:{cycle:before.missions.daily.cycleIndex,used:1}}};
    expect(k.controller.getSnapshot().state).toEqual(expected);
    expect(JSON.parse(k.values.get(SAVE_KEY)!)).toMatchObject(expected);
    const feedback=a.root.querySelector('.cuisine-reward-feedback')!;
    expect(feedback.textContent).toContain(`+${paid.pattes}`);
    expect(feedback.textContent).toContain(`+${paid.grass} nourriture`);
    expect(feedback.querySelector('.coin-icon')).not.toBeNull();
    expect(feedback.textContent).toContain('+1 Affection');
    a.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    expect(a.root.querySelector('.cuisine-reward-feedback')).toBeNull();k.exit();
    expect(performed).toHaveBeenCalledOnce();expect(k.controller.getSnapshot().state).toEqual(expected);
  });
  it('does not adopt or display a reward when its save fails, and never retries on repeated result renders',()=>{
    const k=setup();k.open();const a=k.activity(),before=structuredClone(k.controller.getSnapshot().state);
    const performed=vi.spyOn(k.controller,'perform');
    k.storage.setItem=()=>{throw Error('quota');};
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();finishSalad(a.engine);a.refresh();a.refresh();
    expect(k.controller.getSnapshot().state).toEqual(before);
    expect(a.root.querySelector('.cuisine-reward-feedback')!.textContent).toContain('Récompense non enregistrée');
    expect(a.root.querySelector('.cuisine-reward-feedback .coin-icon')).toBeNull();
    expect(JSON.parse(k.values.get(SAVE_KEY)!)).toMatchObject(before!);
    expect(performed).toHaveBeenCalledOnce();
  });
  it('reacts to committed actions, ignores pointer cancellation, celebrates once and resets on replay/recipe choice',()=>{
    const k=setup();k.open();const a=k.activity(),e=a.engine;
    const companion=document.querySelector<HTMLElement>('.cuisine-companion')!;
    const reaction=()=>companion.dataset.reaction;
    expect(reaction()).toBe('idle');
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
    expect(drop(e,'tomato','cutting-board').accepted).toBe(true);a.refresh();
    expect(reaction()).toBe('idle');
    expect(e.dispatch({type:'use-tool',toolId:'knife',targetId:'tomato'}).accepted).toBe(true);a.refresh();
    expect(reaction()).toBe('positive');vi.advanceTimersByTime(600);expect(reaction()).toBe('idle');
    expect(drop(e,'mozzarella','bowl').accepted).toBe(false);a.refresh();
    expect(reaction()).toBe('mistake');vi.advanceTimersByTime(600);expect(reaction()).toBe('idle');
    const errors=e.snapshot().invalidActions;
    a.scene.setView(fitScene({left:0,top:0,width:900,height:396}));
    const surface=a.root.querySelector<HTMLElement>('#kitchen-surface')!;
    const item=a.root.querySelector<HTMLElement>('[data-item="mozzarella"]')!;
    const p=toClient(e.snapshot().items.find(i=>i.id==='mozzarella')!.anchor,a.scene.getView());
    const pointer=(target:HTMLElement,type:string,x:number)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',clientX:x,clientY:p.y,button:0,buttons:1}));
    pointer(item,'pointerdown',p.x);pointer(surface,'pointermove',p.x+30);
    expect(a.drag.activeId).toBe('mozzarella');pointer(surface,'pointercancel',p.x+30);a.refresh();
    expect(a.drag.activeId).toBeNull();expect(e.snapshot().invalidActions).toBe(errors);expect(reaction()).toBe('idle');
    expect(drop(e,'tomato','bowl').accepted).toBe(true);a.refresh();expect(reaction()).toBe('positive');
    for(const id of ['mozzarella','cucumber']){
      expect(drop(e,id,'cutting-board').accepted).toBe(true);
      expect(e.dispatch({type:'use-tool',toolId:'knife',targetId:id}).accepted).toBe(true);
      expect(drop(e,id,'bowl').accepted).toBe(true);a.refresh();
    }
    expect(drop(e,'olive-oil','bowl').accepted).toBe(true);a.refresh();
    expect(reaction()).toBe('celebrate');vi.advanceTimersByTime(1000);a.refresh();expect(reaction()).toBe('celebrate');
    expect(k.completed).toHaveBeenCalledOnce();
    a.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();expect(reaction()).toBe('idle');
    finishSalad(e);a.refresh();expect(reaction()).toBe('celebrate');
    a.root.querySelector<HTMLButtonElement>('#recipe-choose')!.click();expect(reaction()).toBe('idle');
    a.root.querySelector<HTMLButtonElement>('#recipe-chicken')!.click();expect(reaction()).toBe('idle');
  });
  it('clears pending transient reactions on disposal and never updates the abandoned companion',()=>{
    const k=setup();k.open();const a=k.activity();
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
    drop(a.engine,'tomato','cutting-board');a.engine.dispatch({type:'use-tool',toolId:'knife',targetId:'tomato'});a.refresh();
    const companion=document.querySelector<HTMLElement>('.cuisine-companion')!;
    expect(companion.dataset.reaction).toBe('positive');
    k.ui.dispose();expect(vi.getTimerCount()).toBe(0);
    const after=companion.outerHTML;vi.advanceTimersByTime(2000);expect(companion.outerHTML).toBe(after);
    expect(companion.dataset.reaction).toBe('idle');expect(k.completed).not.toHaveBeenCalled();
  });
  it('presents the selected species art and name without intercepting cooking pointers, and replaces it on a new session',()=>{
    const k=setup(true,'different'),rabbits=k.controller.getSnapshot().state!.rabbits;
    const pair=rabbits.filter((r,i)=>rabbits.findIndex(other=>other.species===r.species)===i).slice(0,2);
    expect(pair).toHaveLength(2);
    const style=document.createElement('style');style.textContent=mainStyles;document.head.append(style);
    cleanups.push(()=>style.remove());
    for(const r of pair){
      k.ui.select({kind:'building',id:'building-100'});
      [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b=>b.textContent==='Entrer dans la Cuisine')!.click();
      expect(document.querySelector('.cuisine-companion')!.hasAttribute('hidden')).toBe(true);
      k.choose(r.id);
      const companion=document.querySelector<HTMLElement>('.cuisine-companion')!;
      expect(companion.hidden).toBe(false);expect(companion.textContent).toBe(SPECIES[r.species].name);
      expect(companion.textContent).not.toContain(r.id);
      const expected=document.createElement('span');expected.innerHTML=portrait(r.species);
      const art=companion.querySelector<HTMLElement>('.cuisine-companion-art')!;
      expect(art.innerHTML).toBe(expected.innerHTML);
      expect(getComputedStyle(companion).pointerEvents).toBe('none');
      expect(getComputedStyle(art.firstElementChild!).pointerEvents).toBe('none');
      expect(k.host.selectedRabbit).toEqual({id:r.id,species:r.species});
      k.exit();expect(companion.hidden).toBe(true);expect(companion.childElementCount).toBe(0);
    }
    expect(k.mounted).toHaveBeenCalledTimes(2);
  });
  it('keeps rabbit presentation out of a standalone kitchen without host session information',()=>{
    const host=document.createElement('div');document.body.append(host);
    const activity=kitchenApi.mountKitchen(host);cleanups.push(()=>{activity.dispose();host.remove();});
    expect(host.querySelector('.cuisine-companion')).toBeNull();
    expect(host.querySelector('.cuisine-root')).not.toBeNull();
  });
  it('lists owned individuals with portraits and affection, and passes the exact same-species choice to the host only',()=>{
    const k=setup(true,'duplicates'),before=structuredClone(k.controller.getSnapshot().state!);
    k.ui.select({kind:'building',id:'building-100'});
    [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b=>b.textContent==='Entrer dans la Cuisine')!.click();
    const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-cuisine-rabbit]')];
    expect(buttons.map(b=>b.dataset.cuisineRabbit)).toEqual(before.rabbits.map(r=>r.id));
    const same=before.rabbits.filter(r=>r.species===before.rabbits[0].species);
    expect(same.length).toBeGreaterThanOrEqual(2);
    for(const r of before.rabbits){
      const card=buttons.find(b=>b.dataset.cuisineRabbit===r.id)!.parentElement!;
      expect(card.querySelector('.portrait')).not.toBeNull();
      expect(card.textContent).toContain(`Affection ${r.affection}`);expect(card.textContent).toContain(r.id);
    }
    expect(k.mounted).not.toHaveBeenCalled();expect(k.host.selectedRabbit).toBeNull();
    const chosen=same.at(-1)!;
    const action=buttons.find(b=>b.dataset.cuisineRabbit===chosen.id)!;action.click();action.click();
    expect(k.mounted).toHaveBeenCalledOnce();
    expect(k.host.selectedRabbit).toEqual({id:chosen.id,species:chosen.species});
    expect(k.mounted.mock.calls[0][1]).not.toHaveProperty('rabbit');
    expect(k.controller.getSnapshot().state).toEqual(before);
    k.exit();expect(k.host.selectedRabbit).toBeNull();expect(k.completed).not.toHaveBeenCalled();
    expect(k.controller.getSnapshot().state).toEqual(before);
  });
  it('shows an empty-rabbit explanation without mounting and allows returning to the building',()=>{
    const k=setup(true,'empty'),before=structuredClone(k.controller.getSnapshot().state);
    k.ui.select({kind:'building',id:'building-100'});
    [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b=>b.textContent==='Entrer dans la Cuisine')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Choisis ton lapin');
    expect(document.getElementById('panel-content')!.textContent).toContain('Tu as besoin d’un lapin pour cuisiner.');
    expect(document.querySelectorAll('[data-cuisine-rabbit]')).toHaveLength(0);
    expect(k.mounted).not.toHaveBeenCalled();expect(k.host.selectedRabbit).toBeNull();
    document.getElementById('panel-back')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Cuisine');
    expect(k.controller.getSnapshot().state).toEqual(before);
  });
  it('enters from the real building, preserves context and state, and cleanly exits and re-enters',()=>{
    const k=setup(true),before=structuredClone(k.controller.getSnapshot().state);
    expect(before!.buildings.find(b=>b.id==='building-100')?.kind).toBe('kitchen');
    k.ui.select({kind:'building',id:'building-100'});
    expect(document.getElementById('panel-title')!.textContent).toBe('Cuisine');
    const enter=()=>[...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b=>b.textContent==='Entrer dans la Cuisine')!;
    const action=enter();action.click();action.click();
    expect(k.mounted).not.toHaveBeenCalled();
    expect(document.getElementById('panel-title')!.textContent).toBe('Choisis ton lapin');
    k.choose(before!.rabbits[0].id);
    expect(k.mounted).toHaveBeenCalledOnce();
    expect(document.getElementById('app')!.inert).toBe(true);
    expect(document.querySelector('dialog.cuisine-activity[open]')).not.toBeNull();
    const first=k.activity(),stop=vi.spyOn(first,'dispose');
    k.ui.select({kind:'rabbit',id:before!.rabbits[0].id});k.controller.refresh();
    expect(document.getElementById('game-panel')!.dataset.view).toBe('building');
    expect(document.querySelector('.cuisine-root')).toBe(first.root);
    k.exit();
    expect(stop).toHaveBeenCalledOnce();expect(first.root.isConnected).toBe(false);
    expect(document.querySelector('dialog.cuisine-activity[open]')).toBeNull();
    expect(document.getElementById('app')!.inert).toBe(false);
    expect(document.getElementById('panel-title')!.textContent).toBe('Cuisine');
    expect(vi.getTimerCount()).toBe(0);
    expect(k.host.selectedRabbit).toBeNull();
    enter().click();k.choose();expect(k.mounted).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('.cuisine-root')).toHaveLength(1);
    expect(document.querySelectorAll('.cuisine-root style')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);k.exit();
    expect(vi.getTimerCount()).toBe(0);expect(k.completed).not.toHaveBeenCalled();
    expect(k.controller.getSnapshot().state).toEqual(before);
    k.ui.select({kind:'rabbit',id:before!.rabbits[0].id});
    expect(document.getElementById('game-panel')!.dataset.view).toBe('rabbit');
  });
  it('opens once from the Kitchen building, survives passive renders, and blocks background selection', () => {
    const k = setup(); const before = k.controller.getSnapshot().state;
    k.open(); k.enterButton()?.click();
    expect(k.mounted).toHaveBeenCalledOnce();
    const activity = k.activity(), root = activity.root;
    expect(document.querySelector('dialog.cuisine-activity[open]')).not.toBeNull();
    expect(document.getElementById('app')!.inert).toBe(true);
    root.querySelector<HTMLButtonElement>('#recipe-chicken')!.click();
    const state = activity.engine.snapshot();
    k.controller.refresh(); k.controller.refresh();
    expect(document.querySelector('.cuisine-root')).toBe(root);
    expect(activity.engine.snapshot()).toEqual(state);
    k.ui.select({kind: 'rabbit', id: before!.rabbits[0].id});
    document.getElementById('open-shop')!.click();
    expect(document.getElementById('game-panel')!.dataset.view).toBe('building');
    expect(k.controller.getSnapshot().state).toEqual(before);
  });
  it('disposes before exit, restores the previous panel, and reopens without duplicate DOM/styles/timers', () => {
    const k = setup(); k.open();
    const first = k.activity(), disposed = vi.spyOn(first, 'dispose');
    first.root.querySelector<HTMLButtonElement>('#recipe-chicken')!.click(); vi.advanceTimersByTime(500);
    k.exit();
    expect(disposed).toHaveBeenCalledOnce(); expect(first.root.isConnected).toBe(false);
    expect(document.querySelector('.cuisine-activity-host')!.childElementCount).toBe(0);
    expect(document.querySelector('dialog.cuisine-activity[open]')).toBeNull();
    expect(document.getElementById('app')!.inert).toBe(false);
    expect(document.getElementById('game-panel')!.dataset.view).toBe('building');
    expect(k.completed).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    k.open();
    expect(k.mounted).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('.cuisine-root')).toHaveLength(1);
    expect(document.querySelectorAll('.cuisine-root style')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    const second = k.activity(1);
    expect(second.engine.snapshot()).toMatchObject({phase: 'choosing', activeTimeMs: 0});
    k.exit(); k.ui.select({kind: 'rabbit', id: k.controller.getSnapshot().state!.rabbits[0].id});
    expect(document.getElementById('game-panel')!.dataset.view).toBe('rabbit');
  });
  it('forwards and rewards each run after Replay but grants affection and the Heart only once per cycle', () => {
    const k = setup(); k.open(); const activity = k.activity();
    const before = k.controller.getSnapshot().state;
    activity.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
    finishSalad(activity.engine); activity.refresh(); activity.refresh(); vi.advanceTimersByTime(1000);
    expect(activity.root.querySelector('.cuisine-reward-feedback')!.textContent).toContain('+1 Cœur');
    expect(k.completed).toHaveBeenCalledOnce();
    expect(k.completed).toHaveBeenLastCalledWith({recipeId: 'salad', activeTimeMs: 0, invalidActions: 0});
    activity.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    finishSalad(activity.engine); activity.refresh(); activity.refresh();
    expect(activity.root.querySelector('.cuisine-reward-feedback')!.textContent).not.toContain('+1 Affection');
    expect(activity.root.querySelector('.cuisine-reward-feedback')!.textContent).not.toContain('Cœur');
    expect(k.completed).toHaveBeenCalledTimes(2);
    expect(k.completed.mock.calls[0][0]).not.toBe(k.completed.mock.calls[1][0]);
    activity.root.querySelector<HTMLButtonElement>('#recipe-choose')!.click();
    expect(activity.engine.snapshot().phase).toBe('choosing'); expect(k.completed).toHaveBeenCalledTimes(2);
    expect(k.controller.getSnapshot().state).toEqual({...before,pattes:before!.pattes+2*CUISINE_REWARDS.salad.pattes,grass:before!.grass+2*CUISINE_REWARDS.salad.grass,hearts:before!.hearts+1,
      missions:{...before!.missions,completed:[...before!.missions.completed,'first-meal'],daily:{...before!.missions.daily,progress:{...before!.missions.daily.progress,'gain-affection':before!.missions.daily.progress['gain-affection']}}},
      rabbits:before!.rabbits.map((r,i)=>i===0?{...r,affection:r.affection+1}:r),cuisine:{affectionCycles:{[before!.rabbits[0].id]:before!.missions.daily.cycleIndex},heartCycle:before!.missions.daily.cycleIndex,fullRuns:{cycle:before!.missions.daily.cycleIndex,used:2}}});
  });
  it('cleans Cuisine on UI disposal without fake completion', () => {
    const k = setup(); k.open();
    const first = k.activity(), stop = vi.spyOn(first, 'dispose');
    k.ui.dispose(); expect(stop).toHaveBeenCalledOnce();
    expect(k.host.selectedRabbit).toBeNull();
    expect(document.querySelector('.cuisine-activity')).toBeNull(); expect(document.getElementById('app')!.inert).toBe(false);
    const frozen = first.engine.snapshot(); vi.advanceTimersByTime(10000);
    expect(first.engine.snapshot()).toEqual(frozen); expect(vi.getTimerCount()).toBe(0);
    expect(k.completed).not.toHaveBeenCalled();
  });
  it.each(['restart', 'import'] as const)('closes active Cuisine on %s and cannot retain its old engine', replacement => {
    const k = setup(); k.open(); const activity = k.activity();
    const stop = vi.spyOn(activity, 'dispose');
    if (replacement === 'restart') expect(k.controller.restart(true).ok).toBe(true);
    else {
      const exported = k.controller.exportGame(); expect(exported.ok).toBe(true);
      if (!exported.ok) throw Error('Export failed');
      const prepared = k.controller.prepareImport(exported.json); expect(prepared.ok).toBe(true);
      if (!prepared.ok) throw Error('Import preparation failed');
      expect(k.controller.confirmImport(prepared.token, true).ok).toBe(true);
    }
    expect(stop).toHaveBeenCalledOnce(); expect(document.querySelector('.cuisine-root')).toBeNull();
    expect(k.host.selectedRabbit).toBeNull();
    expect(document.getElementById('app')!.inert).toBe(false); expect(k.completed).not.toHaveBeenCalled();
    // A restarted game has no Kitchen building, so reopen the activity layer itself with its new owned rabbit.
    if (replacement === 'import') k.open(); else { const rabbit = k.controller.getSnapshot().state!.rabbits[0]; k.host.open({id: rabbit.id, species: rabbit.species}); }
    expect(k.mounted).toHaveBeenCalledTimes(2);
    expect(k.activity(1).engine).not.toBe(activity.engine);
  });
});

function finishChicken(e: KitchenEngine) {
  drop(e, 'chicken', 'cutting-board'); e.dispatch({type: 'use-tool', toolId: 'knife', targetId: 'chicken'});
  for (const id of ['soy', 'honey']) expect(e.dispatch({type: 'drop', itemId: id, target: {kind: 'item', id: 'chicken'}}).accepted).toBe(true);
  expect(drop(e, 'chicken', 'baking-dish').accepted).toBe(true);
  drop(e, 'sweet-potato', 'cutting-board');
  for (const id of ['peeler', 'knife']) expect(e.dispatch({type: 'use-tool', toolId: id, targetId: 'sweet-potato'}).accepted).toBe(true);
  drop(e, 'sweet-potato', 'baking-dish'); drop(e, 'baking-dish', 'oven'); e.advance(5000);
}
describe('Cuisine tasting celebration', () => {
  const companion = () => document.querySelector<HTMLElement>('.cuisine-companion')!;
  const chef = () => document.querySelector<HTMLElement>('.cuisine-chef');
  const tasting = () => document.querySelector<HTMLElement>('.cuisine-tasting');
  const play = (k: ReturnType<typeof setup>, recipe: 'salad' | 'chicken') => {
    k.open(); const a = k.activity();
    a.root.querySelector<HTMLButtonElement>(`#recipe-${recipe}`)!.click();
    if (recipe === 'salad') finishSalad(a.engine); else finishChicken(a.engine);
    a.refresh(); a.refresh(); return a;
  };
  it('shows the pay actually earned: salad full for the five slots, then the singular tip', () => {
    const k = setup(); k.open(); const a = k.activity(); const shown: string[] = [];
    expect(document.querySelector('.cuisine-activity .cuisine-quota')?.textContent).toContain('Encore 5');
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
    for (let run = 1; run <= 6; run++) {
      if (run > 1) a.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
      finishSalad(a.engine); a.refresh(); a.refresh();
      shown.push(a.root.querySelector('.cuisine-reward-feedback')!.textContent!);
      expect(document.querySelector('.cuisine-activity .cuisine-quota')?.textContent).toContain(run < 5 ? `Encore ${5-run}` : 'pourboire de 5 pattes et 1 nourriture');
    }
    const herbs = a.root.querySelector<HTMLElement>('.cuisine-reward-feedback [data-kind=herbs]');
    expect(herbs?.textContent).toContain('+1 nourriture'); expect(herbs?.textContent).not.toContain('herbes');
    expect(shown.slice(0, 5).map(t => t.match(/\+(\d+)/)![1])).toEqual(['40', '40', '40', '40', '40']);
    expect(shown[0]).toContain('+3 nourriture'); expect(shown[5]).toContain('+5'); expect(shown[5]).toContain('+1 nourriture');
    expect(shown[5]).not.toContain('Cœur'); expect(shown[5]).not.toContain('+1 Affection');
    const state = k.controller.getSnapshot().state!; expect(state.cuisine.fullRuns).toEqual({cycle: state.missions.daily.cycleIndex, used: 5});
    k.exit();
  });
  it('shows the chicken pay of 60 coins on the result card', () => {
    const k = setup(); const a = play(k, 'chicken'); const feedback = a.root.querySelector('.cuisine-reward-feedback')!;
    expect(feedback.textContent).toContain('+60'); expect(feedback.textContent).toContain('+3 nourriture'); k.exit();
  });
  it('starts the tasting on completion: celebrate state, Miam !, hearts and the finished Salad', () => {
    const k = setup(); const a = play(k, 'salad');
    expect(companion().dataset.reaction).toBe('celebrate'); expect(chef()!.dataset.reaction).toBe('celebrate'); expect(chef()!.dataset.tasting).toBe('salad');
    expect(tasting()!.querySelector('.cuisine-tasting-bubble')!.textContent).toBe('Miam !');
    const hearts = tasting()!.querySelectorAll('.cuisine-tasting-heart'); expect(hearts.length).toBeGreaterThanOrEqual(3); expect(hearts.length).toBeLessThanOrEqual(5);
    expect(tasting()!.querySelector('[data-dish="salad"] .dish-fill-bowl')).not.toBeNull();
    expect(tasting()!.querySelector('[data-dish="chicken"]')).toBeNull();
    expect(tasting()!.getAttribute('aria-hidden')).toBe('true');
    // Centred on the in-scene rabbit, not on the top-bar portrait.
    expect(tasting()!.closest('.cuisine-chef')).toBe(chef()); expect(companion().querySelector('.cuisine-tasting')).toBeNull();
    expect(chef()!.contains(tasting()!.querySelector('.cuisine-tasting-bubble'))).toBe(true);
    // The result card waits for the tasting; its content is already there.
    expect(a.root.dataset.tasting).toBe('salad'); expect(a.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false);
  });
  it('shows the cooked Chicken dish for the Chicken recipe', () => {
    const k = setup(); play(k, 'chicken');
    expect(chef()!.dataset.tasting).toBe('chicken');
    expect(tasting()!.querySelector('[data-dish="chicken"] .dish-fill-baking')).not.toBeNull();
    expect(tasting()!.querySelectorAll('.dish-fill-baking svg').length).toBe(2);
    expect(tasting()!.querySelector('[data-dish="salad"]')).toBeNull();
  });
  it('removes every tasting node after the short sequence and stays in the celebrate state', () => {
    const k = setup(); play(k, 'salad');
    vi.advanceTimersByTime(1999); expect(tasting()).not.toBeNull();
    vi.advanceTimersByTime(1); expect(tasting()).toBeNull(); expect(chef()!.dataset.tasting).toBeUndefined();
    expect(document.querySelector<HTMLElement>('.cuisine-root')!.dataset.tasting).toBeUndefined();
    expect(companion().dataset.reaction).toBe('celebrate'); expect(chef()!.dataset.reaction).toBe('celebrate');
  });
  it('does not change the reward or save content', () => {
    const k = setup(); const before = structuredClone(k.controller.getSnapshot().state!); play(k, 'salad');
    const after = k.controller.getSnapshot().state!;
    expect([after.pattes - before.pattes, after.grass - before.grass, after.hearts - before.hearts]).toEqual([CUISINE_REWARDS.salad.pattes, CUISINE_REWARDS.salad.grass, 1]);
    expect(JSON.stringify(after)).not.toContain('Miam');
  });
  it.each(['recipe-replay', 'recipe-choose'])('%s cleans the tasting immediately', id => {
    const k = setup(); const a = play(k, 'salad'); expect(tasting()).not.toBeNull();
    a.root.querySelector<HTMLButtonElement>(`#${id}`)!.click();
    expect(tasting()).toBeNull(); expect(companion().dataset.tasting).toBeUndefined(); expect(companion().dataset.reaction).toBe('idle');
    expect(vi.getTimerCount()).toBeLessThanOrEqual(0 + 1); // only the engine's own interval may remain
  });
  it('a second completion after Replay restarts one tasting, never two', () => {
    const k = setup(); const a = play(k, 'salad');
    a.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click(); finishSalad(a.engine); a.refresh(); a.refresh();
    expect(document.querySelectorAll('.cuisine-tasting').length).toBe(1);
    expect(document.querySelectorAll('.cuisine-tasting-bubble').length).toBe(1);
  });
  it('exit and UI disposal leave no tasting node and no timer', () => {
    const k = setup(); play(k, 'chicken'); k.exit();
    expect(tasting()).toBeNull(); expect(document.querySelector('.cuisine-tasting-heart')).toBeNull();
  });
  it('UI disposal during the tasting leaves no node and no timer', () => {
    const k = setup(); play(k, 'salad'); expect(tasting()).not.toBeNull(); k.ui.dispose();
    expect(document.querySelector('.cuisine-tasting')).toBeNull(); expect(document.querySelector('.cuisine-activity')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it('leaves a standalone kitchen without rabbit untouched', () => {
    const host = document.createElement('div'); document.body.append(host);
    const onComplete = vi.fn(), activity = kitchenApi.mountKitchen(host, {onRecipeCompleted: onComplete}); cleanups.push(() => { activity.dispose(); host.remove(); });
    activity.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click(); finishSalad(activity.engine); activity.refresh();
    expect(onComplete).toHaveBeenCalledOnce(); expect(host.querySelector('.cuisine-tasting, .cuisine-companion')).toBeNull();
    expect(document.querySelector('.cuisine-tasting')).toBeNull();
  });
});

describe('selected rabbit inside the Cuisine scene', () => {
  const chefs = () => document.querySelectorAll<HTMLElement>('.cuisine-chef');
  it('places the selected rabbit, with its own species art, on a stool in the kitchen world', () => {
    const k = setup(true, 'different'); const target = k.controller.getSnapshot().state!.rabbits[1];
    expect(target.species).toBe('lunettes');
    k.ui.select({kind: 'building', id: 'building-100'});
    [...document.querySelectorAll<HTMLButtonElement>('#game-panel button')].find(b => b.textContent === 'Entrer dans la Cuisine')!.click();
    k.choose(target.id); const a = k.activity();
    expect(chefs()).toHaveLength(1); const chef = chefs()[0];
    expect(chef.parentElement).toBe(a.root.querySelector('#kitchen-world'));
    expect(chef.previousElementSibling).toBe(a.root.querySelector('#kitchen-world .table-art'));
    expect(chef.dataset.chefRabbit).toBe('lunettes'); expect(chef.getAttribute('aria-hidden')).toBe('true');
    const expected = document.createElement('span'); expected.innerHTML = portrait('lunettes');
    expect(chef.querySelector('.cuisine-chef-rabbit')!.innerHTML).toBe(expected.innerHTML);
    expect(chef.querySelector('.cuisine-chef-stand svg')).not.toBeNull();
  });
  it('stays present and reacts while cooking, without touching the kitchen geometry', () => {
    const k = setup(); k.open(); const a = k.activity(), chef = chefs()[0];
    const items = () => a.engine.snapshot().items.map(i => [i.id, i.anchor.x, i.anchor.y, i.width, i.height]);
    a.root.querySelector<HTMLButtonElement>('#recipe-chicken')!.click(); a.refresh();
    const before = items();
    expect(chefs()).toHaveLength(1); expect(chefs()[0]).toBe(chef);
    expect(drop(a.engine, 'chicken', 'cutting-board').accepted).toBe(true); a.refresh();
    expect(a.engine.dispatch({type: 'use-tool', toolId: 'knife', targetId: 'chicken'}).accepted).toBe(true); a.refresh();
    expect(chef.dataset.reaction).toBe('positive'); vi.advanceTimersByTime(550); expect(chef.dataset.reaction).toBe('idle');
    expect(a.engine.dispatch({type: 'drop', itemId: 'honey', target: {kind: 'item', id: 'chicken'}}).accepted).toBe(false); a.refresh();
    expect(chef.dataset.reaction).toBe('mistake');
    // Resetting the recipe restores exactly the same anchors and sizes: the rabbit never enters the geometry.
    a.engine.dispatch({type: 'reset-recipe'}); a.refresh();
    expect(items()).toEqual(before); expect(chef.isConnected).toBe(true); expect(chefs()).toHaveLength(1);
  });
  it('celebrates on the in-scene rabbit, then Replay, Choose Recipe and exit leave one clean rabbit', () => {
    const k = setup(); k.open(); const a = k.activity(), chef = chefs()[0];
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click(); finishSalad(a.engine); a.refresh(); a.refresh();
    expect(chef.querySelectorAll('.cuisine-tasting')).toHaveLength(1);
    expect(chef.querySelector('.cuisine-tasting-bubble')!.textContent).toBe('Miam !');
    expect(chef.querySelectorAll('.cuisine-tasting-heart').length).toBe(5);
    a.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    expect(document.querySelector('.cuisine-tasting, .cuisine-tasting-heart, .cuisine-tasting-bubble')).toBeNull();
    expect(a.root.dataset.tasting).toBeUndefined(); expect(chef.dataset.reaction).toBe('idle'); expect(chefs()).toHaveLength(1);
    finishSalad(a.engine); a.refresh(); a.refresh();
    a.root.querySelector<HTMLButtonElement>('#recipe-choose')!.click();
    expect(document.querySelector('.cuisine-tasting')).toBeNull(); expect(chefs()).toHaveLength(1);
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click(); finishSalad(a.engine); a.refresh(); a.refresh();
    k.exit();
    expect(chefs()).toHaveLength(0); expect(document.querySelector('.cuisine-tasting')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
    k.open(); expect(chefs()).toHaveLength(1); expect(chefs()[0]).not.toBe(chef);
  });
  it('is removed with its timers when the UI is disposed mid-celebration', () => {
    const k = setup(); k.open(); const a = k.activity();
    a.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click(); finishSalad(a.engine); a.refresh(); a.refresh();
    k.ui.dispose();
    expect(chefs()).toHaveLength(0); expect(document.querySelector('.cuisine-tasting')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it('never appears in a standalone kitchen', () => {
    const host = document.createElement('div'); document.body.append(host);
    const activity = kitchenApi.mountKitchen(host); cleanups.push(() => { activity.dispose(); host.remove(); });
    activity.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click(); finishSalad(activity.engine); activity.refresh();
    expect(host.querySelector('.cuisine-chef, .cuisine-tasting')).toBeNull(); expect(activity.root.dataset.tasting).toBeUndefined();
    expect(activity.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false);
  });
});
