import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {Scene: function Scene() {}}}));
import {MeadowScene} from '../src/display/MeadowScene';
import type {Point} from '../src/ui/gestures';

function setup(zoom = 1) {
  const select = vi.fn();
  // Scene input without Phaser rendering, textures or a GPU.
  const scene = new MeadowScene({} as never, select, () => false) as any;
  scene.view = {zoom, world: (p: Point) => ({x:p.x / zoom,y:p.y / zoom}), screen: (p: Point) => ({x:p.x * zoom,y:p.y * zoom})};
  scene.bubbles = {visible:true,alpha:1};
  scene.decorationAt = () => null;
  scene.bodyPoint = (r: {point: Point}) => r.point;
  return {scene, select};
}
describe('meadow screen touch targets', () => {
  it.each([.3,.5,1,2])('keeps a 44 × 44 screen target at zoom %s for every bubble kind', zoom => {
    for (const kind of ['income','grass','birth','building']) {
      const {scene,select}=setup(zoom);
      scene.bubbleHits=[{point:{x:0,y:0},width:20,height:20,selection:{kind,id:'target'}}];
      for (const dx of [-22,22]) for (const dy of [-22,22]) {
        scene.tap({x:dx,y:dy}); expect(select).toHaveBeenLastCalledWith({kind,id:'target'});
      }
    }
  });
  it('chooses the nearest overlapping bubble independently of iteration order', () => {
    const {scene,select}=setup();
    const targets=[{point:{x:100,y:100},width:20,height:20,selection:{kind:'income',id:'far'}},
      {point:{x:110,y:100},width:20,height:20,selection:{kind:'birth',id:'near'}}];
    for (const hits of [targets,[...targets].reverse()]) {
      scene.bubbleHits=hits; scene.tap({x:109,y:100}); expect(select).toHaveBeenLastCalledWith({kind:'birth',id:'near'});
    }
  });
  function rabbit(id: string, x: number, alpha: number) {
    return {id,point:{x,y:100},object:{y:100},sprite:{getWorldTransformMatrix:()=>({applyInverse:()=>({x:0,y:-5})})},art:{width:10,height:10,texture:alpha}};
  }
  it('keeps an exact opaque silhouette ahead of a closer fallback target', () => {
    const {scene,select}=setup();
    scene.textures={getPixelAlpha:(_x:number,_y:number,alpha:number)=>alpha};
    scene.rabbitViews=[rabbit('opaque',120,255),rabbit('transparent',100,0)];
    scene.tap({x:100,y:100}); expect(select).toHaveBeenLastCalledWith({kind:'rabbit',id:'opaque'});
  });
  it.each([.3,1,2])('falls back to the nearest illustrated rabbit within 22 screen px at zoom %s', zoom => {
    const {scene,select}=setup(zoom); scene.textures={getPixelAlpha:()=>0};
    scene.rabbitViews=[rabbit('far',120/zoom,0),rabbit('near',100/zoom,0)];
    for (const r of scene.rabbitViews) r.point.y=100/zoom;
    scene.tap({x:101,y:100}); expect(select).toHaveBeenLastCalledWith({kind:'rabbit',id:'near'});
    scene.tap({x:77,y:100}); expect(select).toHaveBeenLastCalledWith({kind:'empty'});
  });
});
