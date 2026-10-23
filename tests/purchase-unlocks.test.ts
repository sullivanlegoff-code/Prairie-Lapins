import {previousStart as oldGame} from './regression-start';
import {describe,it,expect} from 'vitest';
import {advance,decodeGame,encodeGame,act,createGame} from '../src/simulation';
import {hasPurchaseUnlock} from '../src/simulation/purchaseUnlocks';
import {SPECIES_IDS,HOUR} from '../src/config/balance';
import {emptyBuilding} from '../src/state/initial';
import {scenarioState} from '../src/dev/scenarios';
import {stateLevelAccess} from '../src/simulation/levelRights';
const reload=(s:ReturnType<typeof oldGame>)=>{const d=decodeGame(encodeGame(s));if(!d.ok)throw Error(d.reason);return d.state;};
describe('old purchase milestones are evidence only at the one-time transition',()=>{
 it.each([['universal',3],['feu',5],['volant',7]] as const)('retains the historical %s purchase if the old threshold %i was met', (id,n)=>{
  const before=oldGame(0);before.discovered=SPECIES_IDS.filter(species=>!['feu','volant'].includes(species)).slice(0,n-1);
  expect(hasPurchaseUnlock(before,id)).toBe(false);const migratedBefore=reload(before);expect(hasPurchaseUnlock(migratedBefore,id)).toBe(false);
  before.discovered.push(SPECIES_IDS.filter(species=>!['feu','volant'].includes(species))[n-1]);
  const migratedAfter=reload(before);expect(hasPurchaseUnlock(migratedAfter,id)).toBe(true);
  migratedBefore.discovered=[...SPECIES_IDS];expect(hasPurchaseUnlock(reload(advance(migratedBefore,0)),id)).toBe(false);
 });
 it('keeps exact historical rights after cycles, reload and import',()=>{
  const old=oldGame(0);old.discovered=[...SPECIES_IDS];const migrated=reload(old),rights=structuredClone(migrated.levelAccessTransition);
  migrated.missions.completed=[];migrated.missions.claimed=[];const next=reload(advance(migrated,48*HOUR));
  expect(next.levelAccessTransition).toEqual(rights);expect(hasPurchaseUnlock(next,'volant')).toBe(true);
 });
 it('uses discovered commons only for old saves without the former registry and counts more than one universal as evidence',()=>{
  const old=oldGame(0);delete old.purchaseUnlocks;old.discovered.push('feu');const migrated=reload(old);expect(hasPurchaseUnlock(migrated,'feu')).toBe(true);expect(hasPurchaseUnlock(migrated,'volant')).toBe(false);
  const single=oldGame(0);delete single.purchaseUnlocks;expect(hasPurchaseUnlock(reload(single),'universal')).toBe(false);
  single.buildings.push(emptyBuilding('building-6','enclosure',18,24));single.nextId=7;expect(hasPurchaseUnlock(reload(single),'universal')).toBe(true);
  const registry=oldGame(0);registry.discovered.push('feu');expect(hasPurchaseUnlock(reload(registry),'feu')).toBe(false);
 });
 it('new missions keep XP, claims and monetary rewards, without generating mission-based rights',()=>{
  let s=createGame(0);s.discovered=[...SPECIES_IDS];s=advance(s,0);const wallet=s.pattes;
  const r=act(s,{type:'claimMainMission',id:'seven-species'},0);expect(r.ok).toBe(true);if(!r.ok)return;s=r.state;
  expect(s.pattes).toBe(wallet);expect(s.progression.totalXp).toBe(20);expect(s.levelAccessTransition?.rights).toEqual([]);
  expect(hasPurchaseUnlock(s,'volant')).toBe(false);expect(reload(s).missions.claimed).toContain('seven-species');
  expect(act(s,{type:'claimMainMission',id:'seven-species'},0)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});
 });
 it('offers a laboratory state just below Feu with no historical bypass',()=>{
  const s=scenarioState('purchaseMilestones',HOUR);expect(s.levelAccessTransition).toEqual({version:1,rights:[]});
  expect(stateLevelAccess(s,{family:'species',id:'feu',action:'purchase'}).currentLevel).toBe(4);expect(hasPurchaseUnlock(s,'feu')).toBe(false);expect(reload(s)).toEqual(s);
 });
});
