// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import script from '../public/assets/app/standalone-zoom.js?raw';
import {GameController} from '../src/application/GameController';
import {decodeGame} from '../src/simulation';

afterEach(()=>vi.unstubAllGlobals());
function install(crypto: object) {
  // No viewport: exercise the early compatibility block independently of gestures.
  new Function('window','document',script)({crypto},document.implementation.createHTMLDocument());
}
it('preserves an existing native UUID implementation',()=>{
  const native=vi.fn(()=> 'native');const crypto={randomUUID:native};install(crypto);
  expect(crypto.randomUUID).toBe(native);expect(native).not.toHaveBeenCalled();
});
it('uses cryptographic bytes and sets RFC 4122 v4 version/variant bits',()=>{
  const getRandomValues=vi.fn((bytes:Uint8Array)=>{bytes.fill(255);return bytes;});
  const crypto:{getRandomValues:typeof getRandomValues;randomUUID?:()=>string}={getRandomValues};install(crypto);
  expect(crypto.randomUUID!()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(getRandomValues).toHaveBeenCalledOnce();
  expect(getRandomValues.mock.calls[0][0]).toHaveLength(16);
});
it('does not invent an insecure fallback without cryptographic randomness',()=>{
  const crypto:{randomUUID?:()=>string}={};install(crypto);expect(crypto.randomUUID).toBeUndefined();
});
it('allows normal controller creation, restart, export and import without native randomUUID',()=>{
  let sequence=0;
  const crypto={getRandomValues:(bytes:Uint8Array)=>{bytes.fill(++sequence);return bytes;}};
  install(crypto);vi.stubGlobal('crypto',crypto);
  const data=new Map<string,string>();
  const controller=new GameController({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}},()=>0);
  try {
    const first=controller.getSnapshot().presentationId;expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(controller.restart(true)).toEqual({ok:true});expect(controller.getSnapshot().presentationId).not.toBe(first);
    const exported=controller.exportGame();
    if(!exported.ok)throw Error('Expected a valid export');
    expect(decodeGame(exported.json).ok).toBe(true);
    const prepared=controller.prepareImport(exported.json,exported.json.length);
    if(!prepared.ok)throw Error('Expected a valid import');
    expect(controller.confirmImport(prepared.token,true)).toEqual({ok:true});
    expect(controller.getSnapshot().state?.version).toBe(18);
  } finally {controller.dispose();}
});
