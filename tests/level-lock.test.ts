// @vitest-environment happy-dom
import {afterEach, describe, expect, it} from 'vitest';
import {mountLevelLock} from '../src/display/LevelLock';
import {mountLevelAccessDemo} from '../src/dev/levelAccessDemo';
import {checkLevelAccess} from '../src/simulation/levelAccess';
import {PROGRESSION} from '../src/config/progression';
import {cumulativeLevelXp} from '../src/simulation/progression';
const c={...PROGRESSION,activeLevelFamilies:{...PROGRESSION.activeLevelFamilies,species:true}};
const target={family:'species',id:'feu',action:'purchase'} as const;
afterEach(()=>document.body.replaceChildren());
describe('reusable level lock',()=>{
  it('keeps information accessible, locks action and removes immediately without rebuilding controls',()=>{
    const card=document.createElement('article'), buy=document.createElement('button'), info=document.createElement('button');
    buy.setAttribute('aria-describedby','price'); card.append(info,buy); document.body.append(card);
    const lock=mountLevelLock(card,buy);
    lock.update(checkLevelAccess(0,target,[],c));
    expect(buy.disabled).toBe(true); expect(info.disabled).toBe(false);
    expect(card.textContent).toContain('Niveau 5 requis');
    expect(card.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    lock.update(checkLevelAccess(cumulativeLevelXp(5),target,[],c));
    expect(buy.disabled).toBe(false); expect(card.classList.contains('level-locked')).toBe(false);
    expect(card.querySelector<HTMLElement>('.level-lock-message')?.hidden).toBe(true);
    expect(buy.getAttribute('aria-describedby')).toBe('price');
    expect(card.contains(info)).toBe(true); lock.destroy(); expect(card.children.length).toBe(2);
  });
  it('does not override an independently unavailable action on unlock',()=>{
    const card=document.createElement('article'), buy=document.createElement('button');buy.disabled=true;
    const lock=mountLevelLock(card,buy);lock.update(checkLevelAccess(0,target,[],c));lock.update(checkLevelAccess(500,target,[],c));
    expect(buy.disabled).toBe(true);lock.destroy();
  });
  it('locks a group once and restores each action without overriding another refusal',()=>{
    const card=document.createElement('article'),buy=document.createElement('button'),inventory=document.createElement('button');inventory.disabled=true;card.append(buy,inventory);
    const lock=mountLevelLock(card,[buy,inventory]);lock.update(checkLevelAccess(0,target,[],c));expect(buy.disabled).toBe(true);expect(inventory.disabled).toBe(true);expect(card.querySelectorAll('.level-lock-message')).toHaveLength(1);
    lock.update(checkLevelAccess(cumulativeLevelXp(5),target,[],c));expect(buy.disabled).toBe(false);expect(inventory.disabled).toBe(true);lock.destroy();expect(card.children.length).toBe(2);
  });
  it('demo changes presentation only and cleans up',()=>{
    const host=document.createElement('div');document.body.append(host);
    const before=JSON.stringify(PROGRESSION), storage=localStorage.length;
    const dispose=mountLevelAccessDemo(host);
    document.querySelector<HTMLButtonElement>('#level-demo-info')!.click();
    expect(document.querySelector('#level-access-demo')?.textContent).toContain('Type Feu');
    document.querySelector<HTMLButtonElement>('#level-demo-toggle')!.click();
    expect(document.querySelector<HTMLButtonElement>('#level-demo-action')!.disabled).toBe(false);
    expect(JSON.stringify(PROGRESSION)).toBe(before);expect(localStorage.length).toBe(storage);
    dispose();expect(document.querySelector('#level-access-demo')).toBeNull();expect(host.children.length).toBe(0);
  });
});
