import {cumulativeLevelXp,requiredHabitatUpgradeLevel} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as createGame} from './regression-start';
import {describe, expect, it, vi} from 'vitest';
import {HABITAT_TYPES, HABITATS, habitatLevel, type HabitatType} from '../src/config/habitats';
import {SPECIES, SPECIES_IDS, HOUR, BALANCE} from '../src/config/balance';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries} from '../src/simulation';
import {habitatAccepts, habitatStats, terrainWidth, visibleColumns} from '../src/simulation/habitats';
import {quoteComplement} from '../src/simulation/actions';
import {quoteAcceleration} from '../src/simulation/hearts';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState, PattesCommand, Refusal} from '../src/state/types';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {MeadowCamera, cellsBounds, gridPoint, gridCell} from '../src/ui/gestures';
import {screenBounds} from '../src/ui/projection';
import {placementReason, nurseryView} from '../src/ui/models';
import {VISUAL} from '../src/config/visual';
import {toV11} from './island-remap';
import {babyOf, stateBaby, welcomeOf} from './nursery-baby';

const run = (s: GameState, command: Command, now = s.lastSimulatedAt) => {
  const r = act(s, command, now, () => .99); if (!r.ok) throw Error(r.reason); return r.state;
};
const rich = () => {const s=createGame(0);const level=Math.max(...HABITAT_TYPES.map(type=>requiredHabitatUpgradeLevel(type,3)));s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};s.pattes=10000;s.grass=1000;s.hearts=100;return s;};
// Former strip column/row → v10 fine cell → v11 fine cell (same arrangement, enlarged parcels).
const build = (s: GameState, type: HabitatType, x=1, y=0) => run(s,{type:'buyBuilding',kind:'enclosure',habitatType:type,x:toV11((x<6?x+3:x-6) * 4,'x'),y:toV11((y+3) * 4,'y')});
function refuse(s: GameState, c: Command, reason: Refusal, now=s.lastSimulatedAt) {
  const before=structuredClone(s), r=act(s,c,now,()=>.99);
  expect(r).toEqual({ok:false,state:before,reason}); expect(r.state).toBe(s); expect(s).toEqual(before);
}
function complement(s:GameState,action:PattesCommand):Command {
  const q=quoteComplement(s,action,s.lastSimulatedAt);if(!q.ok)throw Error(q.reason);
  return {type:'payWithHearts',action,maxHearts:q.hearts,maxPattes:q.pattes};
}
const decode=(raw:string,_now=0)=>{const r=decodeGame(raw);if(!r.ok)throw Error(r.reason);return r.state;};
function memory(raw?:string){
  const data=new Map(raw===undefined?[]:[[SAVE_KEY,raw]]),flags={fail:''};
  const storage:SaveStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flags.fail===k)throw Error('quota');data.set(k,v);}};
  return {data,flags,storage};
}
function breedingState(){
  let s=rich();s=run(s,{type: 'placeStarterBuilding',kind:'nest',x: 22, y: 20});s=run(s,{type: 'placeStarterBuilding',kind:'nursery',x: 26, y: 20});
  s=run(s,{type:'feed',id:'rabbit-2'});s=run(s,{type:'feed',id:'rabbit-3'});s.pityFailures=9;s.rabbits[0].species='feu';s.discovered.push('feu');s.rabbits.forEach(r=>r.affection=4); // Feu x Neige at affection 4: the guarantee reserves Feu Glacé
  return run(s,{type:'breed',parents:['rabbit-2','rabbit-3']},17);
}

describe('habitat compatibility and atomic entries',()=>{
  it.each(SPECIES_IDS.flatMap(species=>HABITAT_TYPES.map(type=>({species,type}))))('$species in $type follows species types',({species,type})=>{
    const b=emptyBuilding('building-4','enclosure',4,0,type);
    expect(habitatAccepts(b,species)).toBe(type==='universal'||SPECIES[species].types.includes(type));
  });
  it.each(HABITAT_TYPES.filter(t=>t!=='universal'))('buys %s for 200 and welcomes its common for 80',type=>{
    let s=build(rich(),type);const home=s.buildings.at(-1)!;
    expect(s.pattes).toBe(9800);expect(home.habitat).toEqual({type,level:1});expect(habitatStats(home)).toEqual({capacity:3,cap:900,cost:200,currency:'pattes'});
    const species=SPECIES_IDS.find(id=>SPECIES[id].price!==null&&SPECIES[id].types.includes(type))!;
    s=run(s,{type:'buyRabbit',species,enclosureId:home.id});expect(s.pattes).toBe(9720);expect(s.rabbits.at(-1)!.enclosureId).toBe(home.id);
    expect(decode(encodeGame(s))).toEqual(s);
  });
  it('rejects an incompatible purchase before pattes or hearts, and an occupied cell before payment',()=>{
    const s=build(rich(),'feu');s.pattes=0;const home=s.buildings.at(-1)!;
    const action:PattesCommand={type:'buyRabbit',species:'neige',enclosureId:home.id};
    refuse(s,action,'TYPE_INCOMPATIBLE');refuse(s,{type:'payWithHearts',action,maxPattes:0,maxHearts:4},'TYPE_INCOMPATIBLE');
    expect(quoteComplement(s,action,0)).toEqual({ok:false,reason:'TYPE_INCOMPATIBLE'});
    refuse(s,{type:'buyBuilding',kind:'enclosure',habitatType:'feu',x: 18, y: 20},'CELL_OCCUPIED');
  });
  it('rejects invalid habitat data on a non-habitat building and unknown types',()=>{
    const s=rich();
    refuse(s,{type:'buyBuilding',kind:'farm',habitatType:'neige',x: 22, y: 20},'INVALID_CHOICE');
    refuse(s,{type:'buyBuilding',kind:'enclosure',habitatType:'invalid' as HabitatType,x: 22, y: 20},'INVALID_CHOICE');
  });
  it('checks capacity for buying and transferring and preserves old occupants',()=>{
    let s=build(rich(),'neige');const home=s.buildings.at(-1)!.id;
    for(let n=0;n<3;n++)s=run(s,{type:'buyRabbit',species:'neige',enclosureId:home});
    refuse(s,{type:'buyRabbit',species:'neige',enclosureId:home},'CAPACITY_FULL');
    refuse(s,{type:'moveRabbit',id:'rabbit-3',enclosureId:home},'CAPACITY_FULL');
    refuse(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:home},'TYPE_INCOMPATIBLE');
    expect(s.rabbits[0].enclosureId).toBe('building-1');
  });
  it('welcomes a reserved hybrid into either matching type, rejects an incompatible nursery destination without loss',()=>{
    let s=breedingState();s=build(s,'paille',0,1);s=build(s,'neige',1,1);s=sendToNursery(s,20*60_000+17);s=advance(s,50*60_000+17);
    const nursery=s.buildings.find(b=>b.kind==='nursery')!,birth=structuredClone(babyOf(nursery)!.birth);
    expect(birth.species).toBe('feu-glace');
    refuse(s, welcomeOf(s, s.buildings[3].id),'TYPE_INCOMPATIBLE');
    expect(pendingDiscoveries(s)).toEqual(['feu-glace']);
    s=run(s, welcomeOf(s, s.buildings[4].id));
    expect(s.rabbits.at(-1)).toMatchObject({id:birth.id,species:'feu-glace',enclosureId:s.buildings[4].id});
    expect(s.discovered).toContain('feu-glace');expect(pendingDiscoveries(s)).toEqual([]);
  });
  it('moves an occupied specialized building without changing income, occupants, level or affinity',()=>{
    let s=build(rich(),'paille');const home=s.buildings.at(-1)!.id;
    s=run(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:home});s=run(s,{type:'upgradeHabitat',id:home,fromLevel:1});s=advance(s,1234567);
    const old=structuredClone(s.buildings.at(-1)!);s=run(s,{type:'moveBuilding',id:home,x: 26, y: 24});
    expect(s.buildings.at(-1)).toEqual({...old,x: 26, y: 24});expect(s.rabbits[0].enclosureId).toBe(home);expect(decode(encodeGame(s))).toEqual(s);
  });
  it('does not backdate income when entering a specialized habitat or increasing affection',()=>{
    let s=build(rich(),'paille');const home=s.buildings.at(-1)!.id;
    s=run(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:home},HOUR);
    expect(s.buildings[0].incomeUnits).toBe(24*HOUR);expect(s.buildings[1].incomeUnits).toBe(0);
    s=run(s,{type:'feed',id:'rabbit-2'},2*HOUR);expect(s.buildings[1].incomeUnits).toBe(12*HOUR);
    s=advance(s,3*HOUR);expect(s.buildings[1].incomeUnits).toBe(26*HOUR);
  });
});

describe('levels, income and payments',()=>{
  it.each(['universal','feu'] as const)('upgrades %s one level at a time, preserves stored fractions and rejects maximal/stale commands',type=>{
    let s=build(rich(),type);const home=s.buildings[1].id; s.buildings[1].incomeUnits=1234567;
    const initial=s.pattes, initialHearts=s.hearts, first:Command={type:'upgradeHabitat',id:home,fromLevel:1};
    // Independent prices: level 2 in coins (universal 200, specialized 300), level 3 in exactly ten hearts and no coin.
    const coins=type==='universal'?200:300;
    s=run(s,first);expect(s.pattes).toBe(initial-coins);expect(s.hearts).toBe(initialHearts);
    expect(habitatStats(s.buildings[1])).toEqual(habitatLevel(type,2));expect(s.buildings[1].incomeUnits).toBe(1234567);
    refuse(s,first,'STALE_ACTION');
    s=run(s,{type:'upgradeHabitat',id:home,fromLevel:2});expect(s.pattes).toBe(initial-coins);expect(s.hearts).toBe(initialHearts-10);
    expect(s.buildings[1]).toMatchObject({x: 22, y: 20,incomeUnits:1234567,habitat:{type,level:3}});
    refuse(s,{type:'upgradeHabitat',id:home,fromLevel:3},'MAX_HABITAT_LEVEL');
    expect(decode(encodeGame(s))).toEqual(s);
  });
  it.each(['universal','paille'] as const)('caps income with the old %s ceiling before upgrade without recovering lost income',type=>{
    let s=build(rich(),type);const home=s.buildings[1].id;s=run(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:home});
    s=run(s,{type:'upgradeHabitat',id:home,fromLevel:1},1000*HOUR);
    const oldCap=habitatLevel(type,1).cap;
    expect(s.buildings[1].incomeUnits).toBe(oldCap*HOUR);
    expect(advance(s,1001*HOUR).buildings[1].incomeUnits).toBe((oldCap+12)*HOUR);
    expect(advance(advance(s,1000*HOUR+1234),1001*HOUR)).toEqual(advance(s,1001*HOUR));
    expect(advance(s,999*HOUR)).toEqual(s);
  });
  it('supports exactly 3, 5 and 7 occupants without changing the per-rabbit rate or last-species protection',()=>{
    let s=rich();const id='building-1';
    for(const level of [1,2,3] as const){
      if(level>1)s=run(s,{type:'upgradeHabitat',id,fromLevel:(level-1) as 1|2});
      while(s.rabbits.length<habitatStats(s.buildings[0]).capacity)s=run(s,{type:'buyRabbit',species:'paille',enclosureId:id});
      refuse(s,{type:'buyRabbit',species:'paille',enclosureId:id},'CAPACITY_FULL');
      expect(advance(s,HOUR).buildings[0].incomeUnits).toBe(s.rabbits.length*12*HOUR);
    }
    refuse(s,{type:'release',id:'rabbit-3'},'LAST_OF_SPECIES');expect(decode(encodeGame(s))).toEqual(s);
  });
  it('keeps parent income during reproduction after transfer to matching habitats',()=>{
    let s=breedingState();s=build(s,'paille',0,1);expect(act(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:s.buildings[3].id},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'PARENT_BUSY'});
    const before=s.buildings[3].incomeUnits;s=advance(s,s.lastSimulatedAt+10*60_000);
    expect(s.buildings[3].incomeUnits-before).toBe(0);expect(s.buildings[1].breeding).not.toBeNull();
  });
  it('buys with optional heart complement only after all cell conditions and blocks a second purchase on the same cell',()=>{
    let s=rich();s.pattes=30;const action:PattesCommand={type:'buyBuilding',kind:'enclosure',habitatType:'vol',x: 22, y: 20};
    expect(quoteComplement(s,action,0)).toEqual({ok:true,cost:200,pattes:30,hearts:7,missing:170});
    refuse(s,action,'NOT_ENOUGH_PATTES');const paid=complement(s,action);s=run(s,paid);
    expect(s.pattes).toBe(0);expect(s.hearts).toBe(93);refuse(s,paid,'CELL_OCCUPIED');
  });
  it('upgrades with exact complementary hearts, refuses insufficient balances and stale double pressure',()=>{
    let s=build(rich(),'feu');s.pattes=30;const action:PattesCommand={type:'upgradeHabitat',id:s.buildings[1].id,fromLevel:1};
    const payment=complement(s,action);expect(payment).toMatchObject({maxPattes:30,maxHearts:11});
    const poor=structuredClone(s);poor.hearts=10;refuse(poor,payment,'NOT_ENOUGH_HEARTS');
    s=run(s,payment);expect(s).toMatchObject({pattes:0,hearts:89});expect(s.buildings[1].habitat!.level).toBe(2);refuse(s,payment,'STALE_ACTION');
  });
  it('growth acceleration recognizes upgraded free capacity without revealing the species in its quote',()=>{
    let s=breedingState();s=run(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'});s=sendToNursery(advance(s,20*60_000+17));
    const nursery=s.buildings.find(b=>b.kind==='nursery')!,birth=structuredClone(babyOf(nursery)!.birth);
    expect(quoteAcceleration(s, nursery.id, 'growth', s.lastSimulatedAt, stateBaby(s)?.birth.id)).toEqual({ok:false,reason:'CAPACITY_FULL'});
    // The legacy-style start group leaves no room beside the habitat: move it to free ground before its enlarged footprint is acquired.
    s=run(s,{type:'moveBuilding',id:'building-1',x:18,y:26});
    s=run(s,{type:'upgradeHabitat',id:'building-1',fromLevel:1});const q=quoteAcceleration(s, nursery.id, 'growth', s.lastSimulatedAt, stateBaby(s)?.birth.id);if(!q.ok)throw Error(q.reason);
    expect(JSON.stringify(q)).not.toContain(birth.species);expect(nurseryView(s,s.lastSimulatedAt).babies.map(b=>b.stage)).toEqual(['growing']);
    s=run(s,{type:'accelerate',id:nursery.id,stage:'growth',jobKey:q.jobKey,maxHearts:q.hearts,birthId:birth.id});
    expect(babyOf(s.buildings.find(b=>b.kind==='nursery')!)!.birth).toEqual(birth);expect(s.lastSimulatedAt).toBe(20*60_000+17);
  });
});

describe('two extensions, camera and placement',()=>{
  it('requires the first extension, charges 500 then 1000, preserves coordinates and claims the mission only once',()=>{
    let s=rich();refuse(s,{type:'expand',parcelId:'west',expectedCost:1000},'PRICE_CHANGED');expect(terrainWidth(s)).toBe(12);expect(visibleColumns(s)).toBe(12);
    s=run(s,{type:'expand',parcelId:'east',expectedCost:500});s=run(s,{type:'claimMainMission',id:'bigger-meadow'});
    const missions=structuredClone(s.missions),pattes=s.pattes,buildings=structuredClone(s.buildings);
    expect(terrainWidth(s)).toBe(12);expect(visibleColumns(s)).toBe(12);s=run(s,{type:'expand',parcelId:'west',expectedCost:1000});
    expect(s.pattes).toBe(pattes-1000);expect(s.buildings).toEqual(buildings);expect(s.missions).toEqual(missions);
    expect(terrainWidth(s)).toBe(12);expect(visibleColumns(s)).toBe(12);refuse(s,{type:'claimMainMission',id:'bigger-meadow'},'ALREADY_CLAIMED');
    refuse(s,{type:'expand',parcelId:'west',expectedCost:1000},'ALREADY_EXPANDED');refuse(s,{type:'expand',parcelId:'east',expectedCost:500},'ALREADY_EXPANDED');
    s=build(s,'metal',8,1);expect(decode(encodeGame(s))).toEqual(s);refuse(s,{type:'moveBuilding',id:'building-1',x: 48, y: 20},'INVALID_CELL');
  });
  it('supports second-extension hearts without paying twice',()=>{
    let s=run(rich(),{type:'expand',parcelId:'east',expectedCost:500});s.pattes=975;const command=complement(s,{type:'expand',parcelId:'west',expectedCost:1000});s=run(s,command);
    expect(s).toMatchObject({pattes:0,hearts:99,acquiredParcels:['center','east','west']});refuse(s,command,'ALREADY_EXPANDED');
  });
  it('validates placement across 18 cells while previews do not mutate or spend',()=>{
    const s=run(run(rich(),{type:'expand',parcelId:'east',expectedCost:500}),{type:'expand',parcelId:'west',expectedCost:1000}),before=structuredClone(s);
    expect(placementReason(s,{kind:'enclosure',habitatType:'metal',cell:{x: 10, y: 24}})).toBeNull();
    expect(placementReason(s,{kind:'enclosure',habitatType:'metal',cell:{x: 18, y: 12}})).not.toBeNull();
    expect(placementReason(s,{kind:'enclosure',cell:null})).not.toBeNull();expect(s).toEqual(before);
  });
  it('extends camera bounds without zoom/focus jumps; defers bounds and orientation changes during gestures',()=>{
    const c=new MeadowCamera();c.resize(844,390);c.recenter();const old={x:c.x,y:c.y,zoom:c.zoom};c.setColumns(9);
    expect({x:c.x,y:c.y,zoom:c.zoom}).toEqual(old);const nine=screenBounds(cellsBounds(0,0,9,VISUAL.grid.rows));expect(c.bounds.right).toBe(nine.right+VISUAL.camera.marginX);
    c.pan(-10000,0);expect(c.world({x:VISUAL.camera.overviewPadding,y:195}).x).toBeCloseTo(nine.right+VISUAL.ground.visualMargin.right+VISUAL.ground.floatingRim-(844-2*VISUAL.camera.overviewPadding)*VISUAL.camera.panKeep/c.zoom,9);
    const far={x:c.x,y:c.y,zoom:c.zoom};c.interaction(true);c.setColumns(6);c.resize(390,844);
    expect({x:c.x,y:c.y,zoom:c.zoom}).toEqual(far);expect(c.width).toBe(844);c.interaction(false);expect(c.width).toBe(390);expect(c.zoom).toBe(old.zoom);
    c.setColumns(9);c.resize(844,390);c.recenter();expect({x:c.x,y:c.y,zoom:c.zoom}).toEqual(old);
    for(let x=0;x<9;x++)for(let y=0;y<2;y++)expect(gridCell(c.world(c.screen(gridPoint(x+.5,y+.5))))).toEqual({x,y});
    c.scale(100,{x:422,y:195});expect(c.zoom).toBe(1.65);c.scale(.001,{x:422,y:195});expect(c.zoom).toBe(c.minimumZoom);
  });
  it('retains validated rabbit scale and targets and provides seven distinct resident slots',()=>{
    expect(VISUAL.rabbit.scale).toBe(1.3);expect(VISUAL.rabbit.hitRadius).toBe(27);expect(VISUAL.rabbit.offsets).toHaveLength(3);
    expect(new Set(VISUAL.rabbit.crowdedOffsets.map(p=>`${p.x},${p.y}`)).size).toBe(7);
    for(const p of VISUAL.rabbit.crowdedOffsets){expect(Math.abs(p.x)).toBeLessThan(72);expect(Math.abs(p.y)).toBeLessThan(60);}
  });
});

describe('v4 validation, migrations, imports and storage',()=>{
  it('keeps claimed missions, hearts, extension, reserved birth and fractional income through a save',()=>{
    let old=breedingState();old=run(old,{type:'expand',parcelId:'east',expectedCost:500});old=run(old,{type:'claimMainMission',id:'bigger-meadow'});old.hearts=7;old.nextHeartGiftAt=123456789;
    expect(decode(encodeGame(old),1000*HOUR)).toEqual(old);expect(pendingDiscoveries(old)).toEqual(['feu-glace']);
  });
  it('preserves claims on controller reload',()=>{
    let s=breedingState();if(!s.missions.completed.includes('cozy-nest'))s.missions.completed.push('cozy-nest');s.missions.claimed.push('cozy-nest');s.pattes+=30;s.hearts=7;
    const raw=encodeGame(s),m=memory(raw),rng=vi.fn(()=>0),c=new GameController(m.storage,()=>s.lastSimulatedAt,rng);
    expect(c.getSnapshot().state).toEqual(s);expect(c.getSnapshot().status).toBe('saved');expect(rng).not.toHaveBeenCalled();
    const second=new GameController(m.storage,()=>s.lastSimulatedAt);expect(second.getSnapshot().state).toEqual(s);
    expect(second.perform({type:'claimMainMission',id:'cozy-nest'})).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});
  });
  it('imports without resetting; exports and reloads retain upgraded specialized habitats',()=>{
    const initial=rich(),m=memory(encodeGame(initial)),c=new GameController(m.storage,()=>0);
    let s=build(rich(),'paille');s=run(s,{type:'upgradeHabitat',id:s.buildings[1].id,fromLevel:1});s=run(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:s.buildings[1].id});s.hearts=3;
    let p=c.prepareImport(encodeGame(s));if(!p.ok)throw Error(p.reason);expect(c.confirmImport(p.token,false).ok).toBe(false);expect(c.getSnapshot().state).toEqual(initial);
    p=c.prepareImport(encodeGame(s));if(!p.ok)throw Error(p.reason);m.flags.fail=SAVE_KEY;expect(c.confirmImport(p.token,true)).toEqual({ok:false,reason:'WRITE_FAILED'});expect(c.getSnapshot().state).toEqual(initial);expect(m.data.get(SAVE_KEY)).toBe(encodeGame(initial,c.getSnapshot().presentationId));
    m.flags.fail='';expect(c.confirmImport(p.token,true).ok).toBe(true);expect(c.getSnapshot().state).toEqual(s);
    const out=c.exportGame();if(!out.ok)throw Error(out.reason);expect(decode(out.json)).toEqual(s);
  });
  it.each(['level0','level4','fractionalLevel','unknownType','missingHabitat','utilityHabitat','overCap','overCapacity','incompatible','secondWithoutFirst','outside','missingSecond'] as const)('rejects invalid %s without replacing the active game',damage=>{
    const s=rich(),raw=JSON.parse(encodeGame(s));
    switch(damage){
      case 'level0':raw.buildings[0].habitat.level=0;break;
      case 'level4':raw.buildings[0].habitat.level=4;break;
      case 'fractionalLevel':raw.buildings[0].habitat.level=1.5;break;
      case 'unknownType':raw.buildings[0].habitat.type='rainbow';break;
      case 'missingHabitat':delete raw.buildings[0].habitat;break;
      case 'utilityHabitat':raw.buildings.push({...emptyBuilding('building-4','farm',4,0),habitat:{type:'feu',level:1}});raw.nextId=5;break;
      case 'overCap':raw.buildings[0].incomeUnits=600*HOUR+1;break;
      case 'overCapacity':raw.rabbits.push({...raw.rabbits[0],id:'rabbit-4'},{...raw.rabbits[0],id:'rabbit-5'});raw.nextId=6;break;
      case 'incompatible':raw.buildings[0].habitat.type='paille';break;
      case 'secondWithoutFirst':raw.secondExpanded=true;break;
      case 'outside':raw.expanded=true;raw.secondExpanded=true;raw.buildings[0].x=9;break;
      case 'missingSecond':delete raw.acquiredParcels;break;
    }
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok:false,reason:'INVALID_STATE'});
    const m=memory(encodeGame(s)),c=new GameController(m.storage,()=>0);expect(c.prepareImport(JSON.stringify(raw))).toMatchObject({ok:false,reason:'INVALID_STATE'});
    expect(c.getSnapshot().state).toEqual(s);expect(m.data.get(SAVE_KEY)).toBe(encodeGame(s,c.getSnapshot().presentationId));
  });
  it('uses only configured prices/capacities and preserves the pre-existing universal balance',()=>{
    expect(habitatLevel('universal',1)).toEqual({capacity:BALANCE.enclosureCapacity,cap:BALANCE.enclosureCap,cost:BALANCE.buildings.enclosure.price,currency:'pattes'});
    expect(Object.keys(HABITATS)).toHaveLength(6);
  });
});
