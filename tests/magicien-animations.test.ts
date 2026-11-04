import {describe, expect, it} from 'vitest';
import {MAGICIEN_ACTS, MAGICIEN_DURATION, MAGICIEN_GAP, MagicienClock, magicienLevitation, magicienSparks} from '../src/display/magicienTimeline';

describe('animations du Magicien évolué',()=>{
  it('tire une animation déterministe par identifiant dans l’intervalle demandé',()=>{
    const a=new MagicienClock('rabbit-magicien-42'), b=new MagicienClock('rabbit-magicien-42');
    expect(a.step(1000,true,false)).toEqual(b.step(1000,true,false));
    const c=new MagicienClock('rabbit-magicien-42'); let started=null; let elapsed=0;
    while(!started&&elapsed<31_000){started=c.step(1000,true,false);elapsed+=1000;}
    expect(elapsed).toBeGreaterThanOrEqual(MAGICIEN_GAP.first[0]); expect(elapsed).toBeLessThanOrEqual(MAGICIEN_GAP.first[1]);
    expect(MAGICIEN_ACTS).toContain(started?.act);
  });
  it('ne démarre rien sans dessin évolué ni avec mouvement réduit, et ne chevauche pas',()=>{
    const clock=new MagicienClock('rabbit-x');
    for(let i=0;i<40;i++){expect(clock.step(1000,false,false)).toBeNull();expect(clock.step(1000,true,true)).toBeNull();}
    const forced=clock.play('circle')!; expect(forced.duration).toBe(2000); expect(clock.play('sparks')).toBeNull();
    expect(clock.step(1000,true,false)).toBeNull(); expect(clock.step(1000,true,false)).toBeNull(); expect(clock.act).toBeNull();
    expect(MAGICIEN_DURATION).toEqual({sparks:1400,circle:2000,levitation:2000});
  });
  it('place les étincelles à la baguette et borne leur trajectoire et la lévitation',()=>{
    expect(magicienSparks(0,0,5)).toMatchObject({y:0,alpha:1});
    expect(magicienSparks(1400,0,5).alpha).toBe(0);
    expect(magicienLevitation(1000)).toBeCloseTo(1);
    expect(magicienLevitation(2000)).toBeCloseTo(0);
  });
});
