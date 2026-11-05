import {expect,it} from 'vitest';
import {regressionStart} from './regression-start';
import {advance} from '../src/simulation/time';
import {bestFriend,FRIENDSHIP_TIME,recordMemory,rememberBirth,rememberTrip} from '../src/simulation/cozy';
import {decodeGame} from '../src/persistence/json';

it('earns a lasting friendship once, survives moving and clears released rabbits',()=>{
 const s=regressionStart(0);const a=s.rabbits[0].id,b=s.rabbits[1].id;
 const next=advance(s,FRIENDSHIP_TIME);expect(bestFriend(next,a)).toBe(b);expect(next.cozy!.album).toHaveLength(1);
 const again=advance(next,FRIENDSHIP_TIME*2);expect(again.cozy!.album).toHaveLength(1);expect(s.cozy).toBeUndefined();
 again.rabbits=again.rabbits.filter(r=>r.id!==b);expect(bestFriend(advance(again,FRIENDSHIP_TIME*2+1),a)).toBeNull();
});
it('does not count travelling or nest time, or repeated same clock',()=>{
 const s=regressionStart(0);s.travel={welcomed:true,trips:[{rabbitId:s.rabbits[0].id,destination:'Paris',startedAt:0,endsAt:FRIENDSHIP_TIME,hearts:1}]};
 const next=advance(s,FRIENDSHIP_TIME);expect(next.cozy!.bonds).toEqual([]);
 next.travel!.trips=[];const same=advance(next,FRIENDSHIP_TIME);expect(bestFriend(same,s.rabbits[0].id)).toBeNull();
});
it('bounds album and preserves names and durable souvenir counts',()=>{
 const s=regressionStart(0);s.rabbits[0].name='Lune';rememberBirth(s,s.rabbits[0].id,1);rememberBirth(s,s.rabbits[0].id,1);expect(s.cozy!.album).toHaveLength(1);
 s.rabbits[0].name='Soleil';expect(s.cozy!.album[0].text).toContain('Lune');
 for(let i=0;i<90;i++)rememberTrip(s,s.rabbits[0].id,'Paris',i,100+i);
 expect(s.cozy!.album).toHaveLength(80);expect(s.cozy!.souvenirs).toEqual([{destination:'Paris',visits:90}]);
});
it('migrates version20, keeps album souvenirs, and strips retired fields from legacy saves',()=>{
 const s=regressionStart(0),old={...s,version:20};const migrated=decodeGame(JSON.stringify(old));expect(migrated.ok).toBe(true);if(migrated.ok)expect(migrated.state.version).toBe(27);
 recordMemory(s,{key:'event:flowers',kind:'event',at:0,text:'La fête des fleurs'});
 const decoded=decodeGame(JSON.stringify(s));expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state.cozy).toEqual(s.cozy);
 const legacy=JSON.parse(JSON.stringify(s));legacy.cozy.discoveries=['lost-slippers'];legacy.cozy.events=[{id:'harvest',progress:2,completed:false}];
 const loaded=decodeGame(JSON.stringify(legacy));expect(loaded.ok).toBe(true);if(loaded.ok){expect(loaded.state.cozy).not.toHaveProperty('discoveries');expect(loaded.state.cozy).not.toHaveProperty('events');}
});
