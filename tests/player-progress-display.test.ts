// @vitest-environment happy-dom
import {beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {mountPlayerProgression} from '../src/display/PlayerProgression';
import {GameController, type Snapshot} from '../src/application/GameController';
import {applyProgressionGain} from '../src/simulation/progressionRewards';
import {createGame, encodeGame} from '../src/simulation';
import {PROGRESSION} from '../src/config/progression';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {mountSavePanel} from '../src/display/SavePanel';
const el=(id:string)=>document.getElementById(id)!;
const snapshot=(state: Snapshot['state'], generation=0):Snapshot=>({viewRevision:0,state,generation,status:'saved',issue:null,lastSavedAt:0,dirty:false,hasUnreadableBackup:false,catalogReset:false});
beforeEach(()=>{document.body.innerHTML=html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g,'');});
describe('player progress display',()=>{
 it('uses in-level XP and updates stable controls after one and several levels',()=>{
  const ui=mountPlayerProgression(),s=createGame(0),button=el('player-progress'),bar=el('player-xp-bar');ui.update(snapshot(s));
  expect(el('player-level').textContent).toBe('1');expect(el('player-xp-label').textContent).toBe('0 / 90 XP');
  applyProgressionGain(s,90);ui.update(snapshot(s));expect(el('player-level').textContent).toBe('2');expect(el('player-xp-label').textContent).toBe('0 / 200 XP');
  applyProgressionGain(s,900);ui.update(snapshot(s));expect(el('player-level').textContent).toBe('4');expect(el('player-detail-total').textContent).toContain('990');
  expect(bar.getAttribute('aria-valuenow')).toBe('382');expect(bar.getAttribute('aria-valuemax')).toBe('443');
  expect(el('player-progress')).toBe(button);expect(el('player-xp-bar')).toBe(bar);expect(s.hearts).toBe(15);ui.dispose();
 });
 it('renders maximum and safe large totals without a fictitious threshold',()=>{
  const ui=mountPlayerProgression(),s=createGame(0);s.progression.totalXp=Number.MAX_SAFE_INTEGER;ui.update(snapshot(s));
  expect(el('player-level').textContent).toBe(String(PROGRESSION.curve.maximumLevel));expect(el('player-xp-label').textContent).toBe('Niveau maximum');
  expect(el('player-xp-fill').style.width).toBe('100%');expect(el('player-xp-bar').getAttribute('aria-valuemax')).toBe('1');
  expect(el('player-detail-total').textContent).toBe(new Intl.NumberFormat('fr-FR').format(Number.MAX_SAFE_INTEGER)+' XP au total');
  expect(el('player-detail-remaining').textContent).toBe('Niveau maximum');ui.dispose();
 });
 it('shows unavailable state instead of inventing level 1 and removes stale bar values',()=>{
  const ui=mountPlayerProgression();ui.update(snapshot(createGame(0)));ui.update(snapshot(null));
  expect(el('player-level').textContent).toBe('—');expect((el('player-progress') as HTMLButtonElement).disabled).toBe(true);
  expect(el('player-xp-bar').hasAttribute('aria-valuenow')).toBe(false);expect(el('player-xp-bar').getAttribute('aria-valuetext')).toBe('Aucune partie chargée');ui.dispose();
 });
 it('opens/closes details without mutations, closes on replacement and removes listeners on disposal',()=>{
  const ui=mountPlayerProgression(),s=createGame(0),before=structuredClone(s);ui.update(snapshot(s));const dialog=el('player-progress-dialog') as HTMLDialogElement;
  el('player-progress').click();expect(dialog.open).toBe(true);el('close-player-progress').click();expect(dialog.open).toBe(false);expect(s).toEqual(before);
  el('player-progress').click();ui.update(snapshot(s,1));expect(dialog.open).toBe(false);
  ui.dispose();el('player-progress').click();expect(dialog.open).toBe(false);
 });
 it('tracks confirmed controller gains, imports and new games through SavePanel subscription, then unsubscribes',()=>{
  const values=new Map<string,string>(),c=new GameController({scope:'laboratory',getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}},()=>0);
  const dispose=mountSavePanel(c);c.grantLaboratoryXp(50);c.grantLaboratoryXp(50);expect(el('player-level').textContent).toBe('2');expect(el('hearts').textContent).toBe('13');
  const state=createGame(0);state.progression.totalXp=cumulativeLevelXp(5);const p=c.prepareImport(encodeGame(state));if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,true);expect(el('player-level').textContent).toBe('5');expect(el('hearts').textContent).toBe('12');
  c.restart(true);expect(el('player-xp-label').textContent).toBe('0 / 90 XP');dispose();c.grantLaboratoryXp(50);expect(el('player-level').textContent).toBe('1');c.dispose();
 });
 it('does not display unconfirmed XP after a failed write',()=>{
  let fail=false;const values=new Map<string,string>(),c=new GameController({scope:'laboratory',getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}},()=>0);
  const dispose=mountSavePanel(c);fail=true;c.grantLaboratoryXp(500);expect(el('player-xp-label').textContent).toBe('0 / 90 XP');expect(el('hearts').textContent).toBe('12');dispose();c.dispose();
 });
});


it('measures wrapping HUD height without retaining observers after unmount',()=>{
 const disconnect=vi.fn();let resize=()=>{};
 vi.stubGlobal('ResizeObserver',class {constructor(callback:()=>void){resize=callback;}observe(){}disconnect=disconnect;});
 const hud=el('hud'),rect=vi.spyOn(hud,'getBoundingClientRect').mockReturnValue(new DOMRect(0,0,390,170));
 const s=createGame(0),raw=encodeGame(s),c=new GameController({getItem:()=>raw,setItem:()=>{}},()=>0);
 const dispose=mountSavePanel(c),style=document.documentElement.style;
 expect(style.getPropertyValue('--hud-occupied-height')).toBe('170px');
 rect.mockReturnValue(new DOMRect(0,0,390,122));resize();expect(style.getPropertyValue('--hud-occupied-height')).toBe('122px');
 dispose();expect(disconnect).toHaveBeenCalledOnce();resize();expect(style.getPropertyValue('--hud-occupied-height')).toBe('');
 c.dispose();rect.mockRestore();vi.unstubAllGlobals();
});
