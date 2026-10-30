import {expect,it} from 'vitest';
import {regressionStart} from './regression-start';
import {act} from '../src/simulation/actions';
import {advanceCozyEvent,translatedDecorations} from '../src/simulation/cozyActivities';
import {currentDiscovery} from '../src/config/cozyContent';
import {decodeGame,encodeGame} from '../src/persistence/json';

it('claims only the current surprise once, preserving resources and surviving reload',()=>{
 const s=regressionStart(0),id=currentDiscovery(0).id;
 expect(act(s,{type:'claimDiscovery',id:'unknown'},0).ok).toBe(false);
 const result=act(s,{type:'claimDiscovery',id},0);expect(result.ok).toBe(true);if(!result.ok)return;
 expect([result.state.pattes,result.state.grass,result.state.hearts]).toEqual([s.pattes,s.grass,s.hearts]);
 expect(act(result.state,{type:'claimDiscovery',id},0).ok).toBe(false);
 const loaded=decodeGame(encodeGame(result.state));expect(loaded.ok).toBe(true);if(loaded.ok)expect(act(loaded.state,{type:'claimDiscovery',id},24*3600000).ok).toBe(false);
});
it('keeps event progress between monthly returns and awards exactly one memory',()=>{
 const s=regressionStart(0);for(let i=0;i<3;i++)advanceCozyEvent(s,{type:'collectOrder',id:'farm'},Date.UTC(2026,0,1));
 advanceCozyEvent(s,{type:'collectOrder',id:'farm'},Date.UTC(2026,1,1));expect(s.cozy!.events[0].progress).toBe(3);
 for(let i=0;i<10;i++)advanceCozyEvent(s,{type:'collectOrder',id:'farm'},Date.UTC(2026,3,1));
 expect(s.cozy!.events[0]).toEqual({id:'harvest',progress:6,completed:true});expect(s.cozy!.album).toHaveLength(1);
});
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
