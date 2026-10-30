// @ts-nocheck -- Phaser stand-ins exercise scene draw order without a GPU.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
// MeadowScene reads the global matchMedia and document (visible page, no open panel) in update(); this suite runs without a DOM.
beforeEach(() => {
 vi.stubGlobal('matchMedia', () => ({matches: false}));
 vi.stubGlobal('document', {hidden: false, getElementById: () => null, querySelector: () => null});
});
afterEach(() => { vi.unstubAllGlobals(); });
import {MeadowScene} from '../src/display/MeadowScene';
import {VISUAL} from '../src/config/visual';
import * as motionApi from '../src/display/rabbitMotion';
const layer = depth => ({depth, list: [], add(image) {this.list.push(image); image.parentContainer=this;}, sort() {}});
function image() {
 return {frame:{realWidth:320},setTexture(){return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setOrigin(x,y){this.originX=x;this.originY=y;return this;},setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},setDepth(d){this.depth=d;return this;},setAlpha(){return this;}};
}
describe('painted decoration scene ordering', () => {
 it('draws paths both behind and in front of an upright object underneath its layer', () => {
  const scene=new MeadowScene({},()=>{},()=>false);
  scene.add={image};scene.floorDecorationsLayer=layer(.05);scene.decorationsLayer=layer(.5);
  scene.drawDecorationSelection=()=>{};
  scene.current={decorations:[
   {id:'behind',catalogId:'dirt-path',location:{kind:'outside',x:20,y:20,rotation:0}},
   {id:'standing',catalogId:'tree',location:{kind:'outside',x:21,y:21,rotation:0}},
   {id:'front',catalogId:'dirt-path',location:{kind:'outside',x:20,y:24,rotation:0}},
  ]};
  scene.drawDecorations();
  const back=scene.decorationViews.get('behind'),front=scene.decorationViews.get('front'),standing=scene.decorationViews.get('standing');
  expect(back.y).toBeLessThan(standing.y);expect(front.y).toBeGreaterThan(standing.y);
  for(const tile of [back,front]) {
   expect(tile.parentContainer.depth).toBeLessThan(standing.parentContainer.depth);
   expect(tile.parentContainer.depth).toBeLessThan(.1); // buildings
   expect(tile.parentContainer.depth).toBeLessThan(2); // rabbits
   expect(tile.scaleY/tile.scaleX).toBeCloseTo(VISUAL.projection.q);
   expect(tile.originY).toBe(.5);
  }
  expect(scene.floorDecorationsLayer.list).toHaveLength(2);expect(scene.decorationsLayer.list).toHaveLength(1);
 });
});

it('sorts the whole layer when a neighbor crosses a stationary rabbit, then skips unchanged depths', () => {
 const scene = new MeadowScene({}, () => {}, () => false);
 scene.time = {now: 0};
 scene.scale = {width: 800, height: 600}; // Phaser scale stand-in, read by update() for the dadi bounds.
 const make = (id, y) => {
  const motion = motionApi.createRabbitMotion(id, {x:0,y:0}, 2);
  motion.local.y = y;
  const object = image(); object.setDepth(y);
  return {id, object, motion, center:{x:0,y:0}, group:'home', phase:0, ears:[]};
 };
 const stationary = make('rabbit-2', 0), neighbor = make('rabbit-3', 10);
 scene.rabbitViews = [stationary, neighbor]; scene.rabbitGroups.set('home', scene.rabbitViews);
 scene.poseBody = () => {};
 scene.animals = {list:[stationary.object, neighbor.object], sort:vi.fn(function() {this.list.sort((a,b)=>a.depth-b.depth);})};
 const step = vi.spyOn(motionApi, 'stepRabbitMotion').mockImplementation(m => { if (m === neighbor.motion) m.local.y = -10; });
 try {
  scene.update(100);
  expect(stationary.object.depth).toBe(0); expect(scene.animals.list).toEqual([neighbor.object, stationary.object]);
  expect(scene.animals.sort).toHaveBeenCalledTimes(1);
  scene.update(116); expect(scene.animals.sort).toHaveBeenCalledTimes(1);
 } finally { step.mockRestore(); }
});


