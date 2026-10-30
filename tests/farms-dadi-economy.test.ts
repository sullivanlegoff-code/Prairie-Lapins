import {describe, expect, it} from 'vitest';
import {act} from '../src/simulation/actions';
import {createCentreStartGame, emptyBuilding} from '../src/state/initial';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {habitatAccepts} from '../src/simulation/habitats';
import {drawIncomeRoll} from '../src/simulation/time';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {HOUR, ORDERS, SPECIES} from '../src/config/balance';
import type {Command, GameState} from '../src/state/types';

function free(s: GameState) {
  for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(!buildingPlacementReason(s,x,y))return {x,y};
  throw Error('No free cell');
}
function run(s: GameState, command: Command) {
  const result=act(s,command,s.lastSimulatedAt,()=>0);
  if(!result.ok)throw Error(result.reason);
  return result.state;
}
function level(s: GameState, n: number) {s.progression={totalXp:cumulativeLevelXp(n),rewardedThroughLevel:n};}

describe('farms and Dadi owner rules',()=>{
  it('opens the third farm at 12 and the fourth at 15, and persists four farms',()=>{
    let s=createCentreStartGame(0);s.pattes=10000;
    for(let i=0;i<2;i++)s=run(s,{type:'buyBuilding',kind:'farm',...free(s)});
    level(s,11);expect(act(s,{type:'buyBuilding',kind:'farm',...free(s)},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
    level(s,12);s=run(s,{type:'buyBuilding',kind:'farm',...free(s)});
    expect(act(s,{type:'buyBuilding',kind:'farm',...free(s)},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
    level(s,15);s=run(s,{type:'buyBuilding',kind:'farm',...free(s)});
    expect(act(s,{type:'buyBuilding',kind:'farm',...free(s)},0)).toMatchObject({ok:false,reason:'BUILDING_LIMIT'});
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
  });
  it('keeps a running crop unchanged and shortens the next crop by 20%',()=>{
    let s=createCentreStartGame(0);s.pattes=10000;s.hearts=100;level(s,15);
    s=run(s,{type:'buyBuilding',kind:'farm',...free(s)});const id=s.buildings.at(-1)!.id;
    s=run(s,{type:'startOrder',id,recipe:'foin'});const order=s.buildings.at(-1)!.order;
    s=run(s,{type:'upgradeFarm',id});expect(s.buildings.at(-1)!.order).toEqual(order);
    s.lastSimulatedAt=HOUR;s=run(s,{type:'collectOrder',id});s=run(s,{type:'startOrder',id,recipe:'foin'});
    expect(s.buildings.at(-1)!.order!.duration).toBe(ORDERS.foin.duration*0.8);
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
  });
  it('gives distinct individual draws and keeps Dadi fire/metal with its old home preserved',()=>{
    expect(drawIncomeRoll({id:'birth-6',species:'dadi'},()=>0)).toBe(0);
    expect(drawIncomeRoll({id:'birth-7',species:'dadi'},()=>1-Number.EPSILON)).toBe(10000);
    expect(SPECIES.dadi.types).toEqual(['feu','metal']);
    const s=createCentreStartGame(0);s.buildings[0].habitat={type:'neige',level:1};s.rabbits[0].species='dadi';s.discovered=['dadi'];
    expect(decodeGame(encodeGame(s)).ok).toBe(true);
    expect(habitatAccepts(s.buildings[0],'dadi')).toBe(false);
    expect(habitatAccepts(emptyBuilding('building-6','enclosure',0,0,'feu'),'dadi')).toBe(true);
    expect(habitatAccepts(emptyBuilding('building-6','enclosure',0,0,'metal'),'dadi')).toBe(true);
  });
});
