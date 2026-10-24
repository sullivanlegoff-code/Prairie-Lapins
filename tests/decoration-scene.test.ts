// @ts-nocheck -- Phaser stand-ins exercise scene draw order without a GPU.
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
import {MeadowScene} from '../src/display/MeadowScene';
import {VISUAL} from '../src/config/visual';
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


