import {describe, expect, it} from 'vitest';
import {HOUR, MINUTE, type SpeciesId} from '../src/config/balance';
import {habitatLevel, type HabitatType} from '../src/config/habitats';
import {createCentreStartGame} from '../src/state/initial';
import {advance, rabbitIncome} from '../src/simulation/time';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';

const order = ['paille','neige','feu','universal','metal','vol'] as const;
const oldTyped = [[1300,1500,1800,2100,2500,2900],[2600,3000,3400,3800,4300,4800],Array(6).fill(5600)];
const oldUniform = [2400,4000,5600];
function raw(type: HabitatType='paille', level: 1|2|3=1) {
  const s=createCentreStartGame(0), species:Record<HabitatType,SpeciesId>={paille:'paille',neige:'neige',feu:'feu',universal:'paille',metal:'belier-gris',vol:'volant'};
  s.buildings[0].habitat={type,level};
  s.rabbits.forEach(r=>r.species=species[type]);s.discovered=[species[type]];
  return JSON.parse(encodeGame(s));
}
describe('faster income and smaller habitat storage',()=>{
  it('fills Paille level 1 in exactly twenty minutes with three affection-10 Paille',()=>{
    const s=createCentreStartGame(0);s.buildings[0].habitat={type:'paille',level:1};
    s.rabbits=[2,6,7].map(n=>({id:`rabbit-${n}`,species:'paille',affection:10,enclosureId:'building-1'}));s.nextId=8;
    expect(rabbitIncome(10,'paille')).toBe(950);
    expect(s.rabbits.reduce((n,r)=>n+rabbitIncome(r.affection,r.species),0)).toBe(2850);
    const almost=advance(s,20*MINUTE-1), full=advance(s,20*MINUTE);
    expect(almost.buildings[0].incomeUnits).toBe(950*HOUR-2850);
    expect(full.buildings[0].incomeUnits).toBe(950*HOUR);
    expect(advance(full,2*HOUR).buildings[0].incomeUnits).toBe(950*HOUR);
  });
  it('multiplies every rarity base and every affection increment by fifty',()=>{
    for(const [id,base] of [['paille',10],['icy',14],['frisket',17],['magicien',20],['dragon',26]] as const)
      for(const affection of [1,10,20])expect(rabbitIncome(affection,id)).toBe((base+affection-1)*50);
  });
  it('has the exact reduced caps, strictly increasing by type and by habitat level',()=>{
    const expected=[[950,1100,1300,1500,1800,2200],[1800,2100,2500,2900,3500,4300],[2700,3100,3600,4100,4700,5500]];
    for(const level of [1,2,3] as const){
      expect(order.map(t=>habitatLevel(t,level).cap)).toEqual(expected[level-1]);
      order.forEach((type,i)=>{const h=habitatLevel(type,level);expect(h.cap).toBeLessThan(oldTyped[level-1][i]);
        if(i)expect(h.cap).toBeGreaterThan(habitatLevel(order[i-1],level).cap);
        if(level>1)expect(h.cap).toBeGreaterThan(habitatLevel(type,(level-1) as 1|2).cap);
        expect(h.capacity).toBe([3,5,7][level-1]);
      });
    }
  });
  it('preserves every unit from all published historical caps and normalizes idempotently',()=>{
    for(const level of [1,2,3] as const)order.forEach((type,i)=>{
      for(const historical of new Set([oldTyped[level-1][i],oldUniform[level-1]])){
        const input=raw(type,level), cap=habitatLevel(type,level).cap;
        // Exact cap, a fractional excess and the historical maximum all retain every unit.
        for(const units of [cap*HOUR,cap*HOUR+17,historical*HOUR]){
          if(units>Math.max(oldTyped[level-1][i],oldUniform[level-1])*HOUR)continue;
          input.buildings[0].incomeUnits=units;const d=decodeGame(JSON.stringify(input));if(!d.ok)throw Error(d.reason);
          expect(d.state.pattes*HOUR+d.state.buildings[0].incomeUnits).toBe(input.pattes*HOUR+units);
          expect(d.state.buildings[0].incomeUnits).toBeLessThanOrEqual(cap*HOUR);
          expect(decodeGame(encodeGame(d.state))).toEqual(d);
        }
      }
    });
  });
  it('refuses stock beyond every published cap and wallet overflow without changing the input',()=>{
    for(const level of [1,2,3] as const)order.forEach((type,i)=>{
      const input=raw(type,level);input.buildings[0].incomeUnits=Math.max(oldTyped[level-1][i],oldUniform[level-1])*HOUR+1;
      expect(decodeGame(JSON.stringify(input))).toEqual({ok:false,reason:'INVALID_STATE'});
    });
    const input=raw();input.pattes=Number.MAX_SAFE_INTEGER;input.buildings[0].incomeUnits=950*HOUR+1;
    const before=JSON.stringify(input);expect(decodeGame(before)).toEqual({ok:false,reason:'INVALID_STATE'});expect(JSON.stringify(input)).toBe(before);
  });
  it('persists the normalized settlement once on load and does not pay it again',()=>{
    const input=raw('vol',2);input.buildings[0].incomeUnits=4800*HOUR-17;
    const data=new Map([[SAVE_KEY,JSON.stringify(input)]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
    const first=new GameController(storage,()=>0),state=first.getSnapshot().state!;
    expect(state.pattes).toBe(input.pattes+500);expect(state.buildings[0].incomeUnits).toBe(4300*HOUR-17);first.dispose();
    const second=new GameController(storage,()=>0);expect(second.getSnapshot().state).toEqual(state);second.dispose();
  });
});
