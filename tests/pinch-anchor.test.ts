import {expect, it} from 'vitest';
import {Gestures, MeadowCamera, type Point} from '../src/ui/gestures';

for (const [width,height] of [[390,844],[844,390]]) {
  it(`keeps the midpoint world point stable all the way down to minimum zoom at ${width}x${height}`, () => {
    const c=new MeadowCamera();c.resize(width,height);c.recenter();
    c.setVisibleRegions([{left:648,right:1176,top:564,bottom:1008}]);
    const at={x:width/2,y:height/2}, anchor=c.world(at);
    for(let i=0;i<40;i++) {
      c.scale(.9,at);
      expect(c.world(at).x).toBeCloseTo(anchor.x,10);
      expect(c.world(at).y).toBeCloseTo(anchor.y,10);
    }
    expect(c.zoom).toBe(c.minimumZoom);
    const position={x:c.x,y:c.y};c.scale(1,at);
    expect({x:c.x,y:c.y}).toEqual(position);
  });
  it(`keeps a real parcel visible after extreme pans at every zoom at ${width}x${height}`, () => {
    const c=new MeadowCamera();c.resize(width,height);
    c.setInsets({left:16,right:16,top:80,bottom:34});
    const land={left:648,right:1176,top:564,bottom:1008};c.setVisibleRegions([land]);
    for(const zoom of [c.minimumZoom,.4,1.05,1.65])for(const [dx,dy] of [[1e6,0],[-1e6,0],[0,1e6],[0,-1e6],[1e6,1e6]]) {
      c.zoom=zoom;c.pan(dx,dy);
      const a=c.screen({x:land.left,y:land.top}),b=c.screen({x:land.right,y:land.bottom});
      expect(Math.min(width-16,b.x)-Math.max(16,a.x)).toBeGreaterThanOrEqual(Math.min(80,(land.right-land.left)*zoom)-1e-8);
      expect(Math.min(height-34,b.y)-Math.max(80,a.y)).toBeGreaterThanOrEqual(Math.min(80,(land.bottom-land.top)*zoom)-1e-8);
    }
  });
}
it('follows the moving midpoint at equal finger distance, including staggered pointer events', () => {
  const gestures=new Gestures(),c=new MeadowCamera();c.resize(844,390);c.recenter();
  gestures.down(1,{x:320,y:180});gestures.down(2,{x:520,y:180});
  const old=c.world({x:420,y:180});
  for(const [id,point] of [[1,{x:330,y:185}],[2,{x:530,y:185}]] as [number,Point][]) {
    const gesture=gestures.move(id,point);
    if(gesture?.type!=='zoom')throw Error('Expected pinch');
    c.scale(gesture.factor,gesture.at,gesture.dx,gesture.dy);
  }
  expect(c.zoom).toBeCloseTo(1.05,12);
  expect(c.world({x:430,y:185}).x).toBeCloseTo(old.x,10);
  expect(c.world({x:430,y:185}).y).toBeCloseTo(old.y,10);
});
it('does not jump through the sky gap between two separate owned parcels', () => {
  const c=new MeadowCamera();c.resize(390,844);c.zoom=1.65;
  const regions=[{left:120,right:648,top:120,bottom:564},{left:1176,right:1704,top:1008,bottom:1452}];
  c.setVisibleRegions(regions);c.x=912;c.y=786;c.clamp();
  expect(regions.some(r=>{const a=c.screen({x:r.left,y:r.top}),b=c.screen({x:r.right,y:r.bottom});return b.x>=96&&a.x<=294&&b.y>=218&&a.y<=748;})).toBe(true);
});
