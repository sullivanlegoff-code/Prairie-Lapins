// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {createGame,encodeGame} from '../src/simulation';
import {SAVE_KEY} from '../src/persistence/storage';
import {DECORATION_IDS,DECORATIONS} from '../src/config/decorations';
import {levelUnlockContents} from '../src/simulation/levelRights';
import {ProgressionNotices} from '../src/ui/progressionNotices';
import {cumulativeLevelXp,requiredDecorationLevel} from '../src/simulation/progression';
import {mountSavePanel} from '../src/display/SavePanel';
const disposers:(()=>void)[]=[];
const el=(id:string)=>document.getElementById(id)!;
const dialog=()=>el('player-level-dialog') as HTMLDialogElement;
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();document.body.innerHTML=html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g,'');el('portrait-notice').style.display='none';});
afterEach(()=>{disposers.splice(0).forEach(f=>f());vi.useRealTimers();vi.restoreAllMocks();});
function setup(raw:string|null=null){
 raw ??= encodeGame({...createGame(0), progression:{totalXp:40,rewardedThroughLevel:1}});
 const values=new Map<string,string>([[SAVE_KEY,raw]]),flags={fail:false};
 const c=new GameController({scope:'laboratory',getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(flags.fail)throw Error('quota');values.set(k,v);}},()=>0);
 const dispose=mountSavePanel(c,()=>{},{test:true,preferenceKey:'test-feedback'});disposers.push(()=>{dispose();c.dispose();});return{c,values,flags,dispose};
}
const tick=()=>vi.advanceTimersByTimeAsync(300);
describe('confirmed XP presentation',()=>{
 it('publishes gains only after writing and never for load, refresh, refused writes or imports',()=>{
  const {c,values,flags}=setup(),gains:unknown[]=[];c.onProgressionGain(g=>{expect(JSON.parse(values.get(SAVE_KEY)!).progression.totalXp).toBe(c.getSnapshot().state!.progression.totalXp);gains.push(g);});
  c.refresh();expect(gains).toHaveLength(0);flags.fail=true;c.grantLaboratoryXp(50);expect(gains).toHaveLength(0);expect(el('player-xp-feedback').hidden).toBe(true);
  flags.fail=false;c.grantLaboratoryXp(50);expect(gains).toHaveLength(1);
  const p=c.prepareImport(encodeGame(createGame(0)));if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,true);expect(gains).toHaveLength(1);expect(el('player-xp-feedback').hidden).toBe(true);
 });
 it('animates a non-level gain without congratulation',async()=>{
  const s=createGame(0);s.progression={totalXp:90,rewardedThroughLevel:2};const{c}=setup(encodeGame(s));c.grantLaboratoryXp(50);
  expect(el('player-xp-feedback').textContent).toBe('+50 XP');expect(el('player-xp-bar').classList.contains('xp-animated')).toBe(true);
  await tick();expect(dialog().open).toBe(false);expect(el('player-xp-label').textContent).toBe('50 / 162 XP');
  await vi.advanceTimersByTimeAsync(1600);expect(el('player-xp-feedback').hidden).toBe(true);
 });
 it('groups a single and multiple gain into one recap with exact already-received hearts',async()=>{
  const{c}=setup();c.grantLaboratoryXp(50);c.grantLaboratoryXp(500);expect(el('player-xp-feedback').textContent).toBe('+550 XP');await tick();
  expect(dialog().open).toBe(true);expect(el('level-up-title').textContent).toBe('Niveau 4 atteint !');expect(el('level-up-range').textContent).toBe('Niveau 1 → 4');expect(el('level-up-reward').textContent).toBe('3 cœurs déjà reçus.');expect(c.getSnapshot().state!.hearts).toBe(15);expect(el('level-up-unlocks').hidden).toBe(false);for(const id of DECORATION_IDS.filter(id=>requiredDecorationLevel(id)>1&&requiredDecorationLevel(id)<=4))expect(el('level-up-unlocks').textContent).toContain(DECORATIONS[id].name);expect(el('level-up-unlocks').textContent).not.toMatch(/Terre|Mottelin|Brumelin|Géant/);
 });
 it('defers through a panel and placement, persists once across reload, and never closes the active action',async()=>{
  const first=setup();el('game-panel').hidden=false;document.body.classList.add('arranging');first.c.grantLaboratoryXp(50);await tick();expect(dialog().open).toBe(false);expect(el('game-panel').hidden).toBe(false);
  const id=first.c.getSnapshot().presentationId,raw=first.values.get(SAVE_KEY)!;first.dispose();first.c.dispose();
  const next=setup(raw);expect(next.c.getSnapshot().presentationId).toBe(id);await tick();expect(dialog().open).toBe(false);
  el('game-panel').hidden=true;document.body.classList.remove('arranging');await tick();expect(dialog().open).toBe(true);expect(el('level-up-title').textContent).toBe('Niveau 2 atteint !');el('continue-level-up').click();await tick();expect(dialog().open).toBe(false);
  const saved=next.values.get(SAVE_KEY)!;next.dispose();next.c.dispose();setup(saved);await tick();expect(dialog().open).toBe(false);
 });
 it('merges new levels into an already open recap without stacking dialogs',async()=>{
  const{c}=setup();c.grantLaboratoryXp(50);await tick();expect(dialog().open).toBe(true);c.grantLaboratoryXp(500);await tick();expect(document.querySelectorAll('dialog[open]').length).toBe(1);expect(el('level-up-reward').textContent).toBe('3 cœurs déjà reçus.');expect(el('level-up-range').textContent).toBe('Niveau 1 → 4');
 });
 it('blocks during a confirmation and drops transients on same-export import or restart',async()=>{
  const{c}=setup();const confirmation=el('game-dialog') as HTMLDialogElement;confirmation.showModal();c.grantLaboratoryXp(50);await tick();expect(dialog().open).toBe(false);
  const oldId=c.getSnapshot().presentationId,raw=c.exportGame();if(!raw.ok)throw Error(raw.reason);const p=c.prepareImport(raw.json);if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,true);
  expect(c.getSnapshot().presentationId).not.toBe(oldId);confirmation.close();await tick();expect(dialog().open).toBe(false);expect(el('player-xp-feedback').hidden).toBe(true);
  c.grantLaboratoryXp(500);c.restart(true);await tick();expect(dialog().open).toBe(false);expect(el('player-level').textContent).toBe('1');
 });
 it('does not consume or rotate presentation identity after a failed import',()=>{
  const{c,flags}=setup(),id=c.getSnapshot().presentationId,p=c.prepareImport(encodeGame(createGame(0)));if(!p.ok)throw Error(p.reason);flags.fail=true;c.confirmImport(p.token,true);expect(c.getSnapshot().presentationId).toBe(id);
 });
 it('uses immediate updates and a stationary message with reduced motion',async()=>{
  vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList);const{c}=setup();c.grantLaboratoryXp(50);
  expect(el('player-xp-feedback').classList.contains('xp-rise')).toBe(false);expect(el('player-xp-feedback').classList.contains('xp-still')).toBe(true);expect(el('player-xp-bar').classList.contains('xp-level-change')).toBe(false);await tick();expect(dialog().open).toBe(true);
 });
 it('max-level XP displays a gain without a fictitious new level or reward',async()=>{
  const s=createGame(0);s.progression={totalXp:1_000_000,rewardedThroughLevel:30};const{c}=setup(encodeGame(s));c.grantLaboratoryXp(50);await tick();expect(dialog().open).toBe(false);expect(el('player-xp-label').textContent).toBe('Niveau maximum');expect(el('player-xp-feedback').textContent).toBe('+50 XP');
 });
 it('does not reinterpret a pre-activation pending level notice as new unlocks',async()=>{
  const s=createGame(0),id=crypto.randomUUID();s.progression={totalXp:590,rewardedThroughLevel:4};s.hearts=15;
  localStorage.setItem('test-feedback.progression',JSON.stringify({presentationId:id,pending:{fromLevel:1,toLevel:4,heartsGranted:3}}));
  setup(encodeGame(s,id));await tick();expect(dialog().open).toBe(true);expect(el('level-up-unlocks').hidden).toBe(true);
 });
 it('groups old and new pending notices without fabricating unlocks from the old interval',async()=>{
  const s=createGame(0),id=crypto.randomUUID();s.progression={totalXp:cumulativeLevelXp(3),rewardedThroughLevel:3};s.hearts=14;
  localStorage.setItem('test-feedback.progression',JSON.stringify({presentationId:id,pending:{fromLevel:1,toLevel:3,heartsGranted:2}}));
  el('game-panel').hidden=false;const {c}=setup(encodeGame(s,id));c.grantLaboratoryXp(500);await tick();expect(dialog().open).toBe(false);
  el('game-panel').hidden=true;await tick();expect(el('level-up-title').textContent).toBe('Niveau 4 atteint !');expect(el('level-up-unlocks').textContent).toContain('Extension 1');expect(el('level-up-unlocks').textContent).not.toContain('Niveau 3');
 });
 it('ignores out-of-range pending level bounds without breaking announcement calculation',async()=>{
  const id=crypto.randomUUID();localStorage.setItem('test-feedback.progression',JSON.stringify({presentationId:id,pending:{fromLevel:1,toLevel:31,heartsGranted:30}}));
  setup(encodeGame(createGame(0),id));await tick();expect(dialog().open).toBe(false);
 });
 it('persists grouped decoration announcements across deferred reload with the species and habitats',async()=>{
  el('game-panel').hidden=false;const first=setup();first.c.grantLaboratoryXp(50);first.c.grantLaboratoryXp(500);first.c.grantLaboratoryXp(500);await tick();expect(dialog().open).toBe(false);
  const raw=first.values.get(SAVE_KEY)!;first.dispose();first.c.dispose();setup(raw);el('game-panel').hidden=true;await tick();
  expect(el('level-up-title').textContent).toBe('Niveau 5 atteint !');const texts=[...el('level-up-unlocks').querySelectorAll('li')].map(n=>n.textContent!);
  for(const id of DECORATION_IDS.filter(id=>requiredDecorationLevel(id)>1&&requiredDecorationLevel(id)<=5))expect(texts).toContain(`${DECORATIONS[id].name} · Disponible en boutique`);
  expect(new Set(texts).size).toBe(texts.length);expect(texts).toContain('Lapin Feu · Disponible en boutique');expect(texts.some(t=>/Terre|Mottelin|Brumelin|Géant/.test(t))).toBe(false);expect(texts.some(t=>t.includes('Habitat')&&t.includes('amélioration'))).toBe(false);
 });
 it('retains a complete multi-level catalogue larger than the former notification limit',()=>{
  const s=createGame(0),targets=levelUnlockContents(s,1,30),id=crypto.randomUUID();expect(targets.length).toBeGreaterThan(22);
  const notices=new ProgressionNotices('all-level-contents',id);notices.add({fromLevel:1,toLevel:30,heartsGranted:29,unlocks:targets});
  const loaded=new ProgressionNotices('all-level-contents',id).take();expect(loaded?.unlocks).toEqual(targets);
 });
 it('persists paid upgrade possibilities by type and target, without upgrading owned habitats',async()=>{
  el('game-panel').hidden=false;const first=setup();first.c.grantLaboratoryXp(500);await tick();const raw=first.values.get(SAVE_KEY)!;first.dispose();first.c.dispose();const next=setup(raw);el('game-panel').hidden=true;await tick();
  const texts=[...el('level-up-unlocks').querySelectorAll('li')].map(n=>n.textContent!);const upgrades=texts.filter(t=>t.includes('amélioration au niveau'));
  expect(upgrades).toEqual(['Prairie de paille : amélioration au niveau 2 disponible · possibilité payante','Jardin enneigé : amélioration au niveau 2 disponible · possibilité payante']);expect(new Set(texts).size).toBe(texts.length);expect(next.c.getSnapshot().state!.buildings[0].habitat!.level).toBe(1);expect(next.c.getSnapshot().state!.progression.totalXp).toBe(540);
 });
 it('does not open an unacknowledgeable window when preference writes fail',async()=>{
  const{c}=setup();vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw Error('preference quota');});c.grantLaboratoryXp(50);await tick();expect(dialog().open).toBe(false);expect(c.getSnapshot().state!.hearts).toBe(13);
 });

});
