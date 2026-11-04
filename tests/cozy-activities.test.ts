import {expect,it} from 'vitest';
import {regressionStart} from './regression-start';
import {act} from '../src/simulation/actions';
import {translatedDecorations} from '../src/simulation/cozyActivities';

it('translates groups atomically, rejects overlap and preserves resources',()=>{
 const s=regressionStart(0);s.decorations=[{id:'decoration-100',catalogId:'dirt-path',location:{kind:'outside',x:24,y:26,rotation:0}},{id:'decoration-101',catalogId:'dirt-path',location:{kind:'outside',x:25,y:26,rotation:0}},{id:'decoration-102',catalogId:'dirt-path',location:{kind:'outside',x:27,y:26,rotation:0}}];s.nextId=103;
 // Use the existing initial land geometry; choose a valid translation programmatically.
 let delta:{dx:number;dy:number}|undefined;
 for(let dx=-3;dx<=3&&!delta;dx++)for(let dy=-3;dy<=3;dy++)if(!translatedDecorations(s,['decoration-100','decoration-101'],dx,dy).reason){delta={dx,dy};break;}
 expect(delta).toBeDefined();if(!delta)return;
 const before=structuredClone(s);const moved=act(s,{type:'translateDecorations',ids:['decoration-100','decoration-101'],...delta},0);expect(moved.ok).toBe(true);expect(s).toEqual(before);
 if(moved.ok)expect(moved.state.pattes).toBe(s.pattes);
 const refused=act(s,{type:'translateDecorations',ids:['decoration-100','decoration-101'],dx:2,dy:0},0);expect(refused.ok).toBe(false);expect(refused.state).toBe(s);
 expect(translatedDecorations(s,['decoration-100','decoration-100'],1,0).reason).toBe('INVALID_CHOICE');
});
