import {describe, expect, it} from 'vitest';
import {HOUR, type SpeciesId} from '../src/config/balance';
import {habitatLevel, type HabitatType} from '../src/config/habitats';
import {createCentreStartGame} from '../src/state/initial';
import {advance, rabbitIncome, individualIncomeRoll} from '../src/simulation/time';
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
describe('individual income and owner habitat storage',()=>{
  it('matches both rare boundaries, rarity bonuses and common income',()=>{
    for(const [affection,low,high] of [[1,10,20],[10,70,100]] as const){
      expect(rabbitIncome(affection,'rare',0)).toBe(low);
      expect(rabbitIncome(affection,'rare',10000)).toBe(high);
      expect(rabbitIncome(affection,'epic',0)).toBe(Math.round(low*1.3));
      expect(rabbitIncome(affection,'legendary',10000)).toBe(Math.round(high*1.5));
    }
    expect(rabbitIncome(1,'paille')).toBe(10);expect(rabbitIncome(10,'paille')).toBe(19);
    for(const roll of [0,5000,10000])for(let level=2;level<=20;level++)expect(rabbitIncome(level,'rare',roll)).toBeGreaterThan(rabbitIncome(level-1,'rare',roll));
  });
  it('keeps the individual draw across reloads and exact short simulation ticks',()=>{
    const s=createCentreStartGame(0);s.rabbits[0].species='icy';s.rabbits[0].incomeRoll=1234;s.rabbits[0].affection=10;s.discovered=['icy'];s.buildings[0].habitat={type:'neige',level:1};
    const decoded=decodeGame(encodeGame(s));if(!decoded.ok)throw Error(decoded.reason);
    expect(decoded.state.rabbits[0].incomeRoll).toBe(1234);
    const rate=rabbitIncome(10,'icy',1234);let ticks=s;for(let n=1;n<=50;n++)ticks=advance(ticks,n);
    expect(ticks.buildings[0].incomeUnits).toBe(rate*50);expect(ticks.buildings[0].incomeUnits).toBe(advance(s,50).buildings[0].incomeUnits);
    delete s.rabbits[0].incomeRoll;const old=decodeGame(encodeGame(s));if(!old.ok)throw Error(old.reason);
    expect(individualIncomeRoll(old.state.rabbits[0])).toBe(individualIncomeRoll(s.rabbits[0]));
    expect(decodeGame(encodeGame(old.state))).toEqual(old);
  });
  it('uses the exact owner limits without changing places',()=>{
    const expected=[[100,125,150,200,175,200],[300,350,400,500,450,500],[1250,1250,1250,1250,1250,1250]];
    for(const level of [1,2,3] as const){
      expect(order.map(t=>habitatLevel(t,level).cap)).toEqual(expected[level-1]);
      order.forEach(type=>expect(habitatLevel(type,level).capacity).toBe([3,5,7][level-1]));
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
    expect(state.pattes).toBe(input.pattes+4300);expect(state.buildings[0].incomeUnits).toBe(500*HOUR-17);first.dispose();
    const second=new GameController(storage,()=>0);expect(second.getSnapshot().state).toEqual(state);second.dispose();
  });
});
