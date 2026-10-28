import {expect,it} from 'vitest';
import {CozyInteraction,interactionTarget} from '../src/display/cozyInteraction';
import {createRabbitMotion,motionZone,stepRabbitMotion} from '../src/display/rabbitMotion';
import {RabbitLife,type LifeResident} from '../src/display/rabbitLife';

it('keeps an object visit inside the fence and releases it on interruption or reduced motion',()=>{
 const motion=createRabbitMotion('a',{x:0,y:0},2),zone=motionZone(motion),target=interactionTarget(motion,{x:999,y:-999});
 expect(target.x).toBeLessThan(zone.maxX);expect(target.y).toBeGreaterThan(zone.minY);
 const visit=new CozyInteraction();expect(visit.start('a','toy',motion,{x:5,y:0},'cuddle')).toBe(true);
 expect(visit.start('b','other',motion,{x:0,y:0},'read')).toBe(false);
 for(let n=0;n<20;n++){stepRabbitMotion(motion,100);visit.step(100,true,true,false);}
 expect(motion.mode).toBe('kiss');visit.step(100,true,true,true);expect(visit.active).toBeNull();expect(motion.mode).not.toBe('kiss');
});
it('prefers the established friend and excludes rabbits visiting an object',()=>{
 const life=new RabbitLife({zoomGap:[1e9,1e9],sleepGap:[1e9,1e9],socialGap:[100,100]});
 const residents:LifeResident[]=['a','b','c','d'].map((id,i)=>({id,friendId:['b','a','d','c'][i],group:'home',visible:true,motion:createRabbitMotion(id,{x:i*8,y:0},4)}));
 life.step(100,residents,true,false);const meeting=residents.filter(r=>r.motion.mode==='meet');expect(meeting).toHaveLength(2);expect(meeting[0].friendId).toBe(meeting[1].id);
 life.reset();residents[0].occupied=true;life.step(100,residents,true,false);expect(residents[0].motion.mode).not.toBe('meet');
});
