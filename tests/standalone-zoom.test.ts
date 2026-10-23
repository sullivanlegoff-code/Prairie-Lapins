// @vitest-environment happy-dom
import {expect, it} from 'vitest';
import script from '../public/assets/app/standalone-zoom.js?raw';

function setup(apple = false, display = false) {
  const root = document.implementation.createHTMLDocument();
  root.head.innerHTML='<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  root.body.innerHTML='<div id="game"><canvas></canvas></div><button>Menu</button><div class="panel-scroll"></div>';
  const media = Object.assign(new EventTarget(), {matches:display});
  const host = Object.assign(new EventTarget(), {navigator:{standalone:apple},matchMedia:()=>media});
  new Function('window','document',script)(host,root);
  const emit=(selector:string,type:string,touches=1)=>{
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'touches',{value:Array.from({length:touches},()=>({}))});
    root.querySelector(selector)!.dispatchEvent(event);return event;
  };
  return {root,media,host,emit,viewport:root.querySelector<HTMLMetaElement>('meta')!};
}
for (const [apple,display] of [[true,false],[false,true]]) {
  it(`locks only page zoom in standalone (Apple=${apple}, display=${display}), including resume`,()=>{
    const {root,host,emit,viewport}=setup(apple,display);
    expect(viewport.content).toContain('minimum-scale=1, maximum-scale=1, user-scalable=no');
    expect(root.documentElement.classList.contains('standalone')).toBe(true);
    for(const selector of ['canvas','button','.panel-scroll']) {
      for(const type of ['gesturestart','gesturechange'])expect(emit(selector,type).defaultPrevented).toBe(true);
      for(const type of ['touchstart','touchmove']) {
        expect(emit(selector,type,2).defaultPrevented).toBe(true);
        expect(emit(selector,type,1).defaultPrevented).toBe(false);
      }
      for(const type of ['pointerdown','pointermove','wheel'])expect(emit(selector,type).defaultPrevented).toBe(false);
    }
    viewport.content='width=device-width, initial-scale=3';host.dispatchEvent(new Event('pageshow'));
    expect(viewport.content).toContain('maximum-scale=1');
    viewport.content='width=device-width, initial-scale=3';
    Object.defineProperty(root,'visibilityState',{value:'visible'});root.dispatchEvent(new Event('visibilitychange'));
    expect(viewport.content).toContain('maximum-scale=1');
  });
}
it('preserves page zoom in Safari except native gestures on the Phaser canvas',()=>{
  const {root,emit,viewport}=setup();
  expect(viewport.content).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  expect(root.documentElement.classList.contains('standalone')).toBe(false);
  for(const type of ['gesturestart','gesturechange']) {
    expect(emit('button',type).defaultPrevented).toBe(false);
    expect(emit('canvas',type).defaultPrevented).toBe(true);
  }
  expect(emit('button','touchmove',2).defaultPrevented).toBe(false);
});
it('updates the policy when display mode changes without a reload',()=>{
  const {media,viewport,root}=setup();media.matches=true;media.dispatchEvent(new Event('change'));
  expect(viewport.content).toContain('user-scalable=no');
  media.matches=false;media.dispatchEvent(new Event('change'));
  expect(viewport.content).not.toContain('user-scalable');
  expect(root.documentElement.classList.contains('standalone')).toBe(false);
});
