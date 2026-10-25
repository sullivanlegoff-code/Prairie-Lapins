// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
import {previousStart as createGame} from './regression-start';
// @vitest-environment happy-dom
import {beforeEach, describe, expect, it} from 'vitest';
import {guidedStep} from '../src/ui/guidance';
import {PreferenceStore} from '../src/ui/preferences';
import {act,  encodeGame, decodeGame} from '../src/simulation';
import type {Command} from '../src/state/types';
import {babyOf, setBaby, welcomeOf} from './nursery-baby';
beforeEach(() => localStorage.clear());
describe('optional guided beginning, separate from game rewards', () => {
  it('offers old saves voluntary activation and keeps resumption flags without migrating game data', () => {
    localStorage.setItem('old', JSON.stringify({tutorial:true, intro:true}));
    const old = new PreferenceStore('old'); old.initializeGuidance(false); expect(old.value.tutorial).toBe(false);
    const p = new PreferenceStore('new'); p.initializeGuidance(true); expect(p.value.tutorial).toBe(true);
    p.set({intro:true, guideCamera:true, guideCollection:true, tutorial:false});
    const reload = new PreferenceStore('new'); reload.initializeGuidance(false);
    expect(reload.value).toEqual(p.value); reload.set({tutorial:true});
    expect(reload.value.guideCollection).toBe(true);
    const optedOut = new PreferenceStore('out'); optedOut.set({tutorial:false}); optedOut.initializeGuidance(true);
    expect(optedOut.value.tutorial).toBe(false);
  });
  it.each([.1, .9])('recognizes real commands, normal delays and save interruptions with controlled result %s', rng => {
    let s = createGame(0), now = 0; const prefs = new PreferenceStore('guide'); prefs.initializeGuidance(true);
    const id = () => guidedStep(s, prefs.value, now).id;
    const perform = (command: Command) => { const result = act(s, command, now, () => rng); expect(result.ok).toBe(true); if (result.ok) s = result.state; };
    const reload = () => { const decoded = decodeGame(encodeGame(s)); expect(decoded.ok).toBe(true); if (decoded.ok) s = decoded.state; };
    expect(id()).toBe('welcome'); prefs.set({intro:true,guideCamera:true}); expect(id()).toBe('paille');
    perform({type:'feed',id:'rabbit-2'}); expect(id()).toBe('farmShop');
    perform({type:'buyBuilding',kind:'farm',x:22,y:20}); expect(id()).toBe('production');
    const farm=s.buildings.at(-1)!; perform({type:'startOrder',id:farm.id,recipe: 'foin'});
    expect(farm.kind).toBe('farm'); expect(id()).toBe('collection'); prefs.set({guideCollection:true}); reload(); expect(id()).toBe('harvest');
    expect(guidedStep(s,prefs.value,now).text).toContain('fin normale'); now=5*60_000;
    perform({type:'collectOrder',id:farm.id}); expect(id()).toBe('neige');
    perform({type:'feed',id:'rabbit-3'}); expect(id()).toBe('breed');
    const wallet=[s.pattes,s.grass,s.hearts]; perform({type:'breed',parents:['rabbit-2','rabbit-3']}); expect([s.pattes,s.grass,s.hearts]).toEqual(wallet);
    expect(id()).toBe('transfer'); expect(prefs.value.guideRecipe).toBe(false); reload(); expect(id()).toBe('transfer');
    now=25*60_000; reload(); expect(s.buildings.find(b=>b.kind==='nest')!.breeding).not.toBeNull();
    const birth=s.buildings.find(b=>b.kind==='nest')!.breeding!.birth;
    perform({type:'transferBirth',id:'building-4',birthId:birth.id}); expect(id()).toBe('welcomeBirth'); reload();
    const baby=babyOf(s.buildings.find(b=>b.kind==='nursery')!)!;
    expect(baby.startedAt).toBe(now); now=baby.readyAt; reload(); expect(id()).toBe('welcomeBirth');
    perform(welcomeOf(s, 'building-1')); expect(id()).toBe('free'); expect(guidedStep(s,prefs.value,now).done).toBe(true);
    expect(s.discovered).toEqual(['paille','neige',rng===.1?'frisket':'icy']);
    expect(s.missions.claimed).toEqual([]); expect(s.pattes).toBe(280); expect(s.grass).toBe(26); expect(s.hearts).toBe(14);
  });
  it('recognizes early feeding/consultation and explains lack of resources without applying actions', () => {
    const s=createGame(0),p=new PreferenceStore('guide');p.set({intro:true,guideCamera:true,guideCollection:true,guideRecipe:true});
    s.rabbits.forEach(r=>r.affection=2); expect(guidedStep(s,p.value,0).id).toBe('farmShop');
    s.rabbits[0].affection=1;s.grass=0;s.pattes=0;
    const before=encodeGame(s);expect(guidedStep(s,p.value,0).target).toBe('farmShop');expect(guidedStep(s,p.value,0).text).toContain('manque');expect(encodeGame(s)).toBe(before);
  });
});
it('guides to a ready second farm rather than asking for a redundant production',()=>{
 let s=createGame(0);s.rabbits[0].affection=2;
 const run=(c:Command)=>{const r=act(s,c,0);if(!r.ok)throw Error(r.reason);s=r.state;};
 run({type:'buyBuilding',kind:'farm',x:22,y:20});run({type:'buyBuilding',kind:'farm',x:18,y:24});const id=s.buildings.at(-1)!.id;run({type:'startOrder',id,recipe: 'foin'});
 const p=new PreferenceStore('twofarms');p.set({intro:true,guideCamera:true,guideCollection:true});const step=guidedStep(s,p.value,0);expect(step.id).toBe('harvest');expect(step.buildingId).toBe(id);expect(step.text).toContain('aide gratuite');
});
it('occupied nursery sends guidance to the nursery, while natural waiting remains possible',()=>{
 let s=createGame(0);s.rabbits.forEach(r=>r.affection=2);const r=act(s,{type:'breed',parents:['rabbit-2','rabbit-3']},0,()=>.1);if(!r.ok)throw Error(r.reason);s=r.state;
 setBaby(s.buildings.find(b=>b.kind==='nursery')!, {birth:{id:'birth-7',species:'paille',guaranteed:false,reservedDiscovery:false},startedAt:0,readyAt:300000});
 const p=new PreferenceStore('occupied');p.set({intro:true,guideCamera:true,guideRecipe:true});expect(guidedStep(s,p.value,20*60000).target).toBe('nursery');
});
