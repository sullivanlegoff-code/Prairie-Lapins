import {describe, expect, it} from 'vitest';
import {DECORATIONS, DECORATION_IDS, RETIRED_DECORATION_IDS, decorationResalePrice} from '../src/config/decorations';
import {requiredDecorationLevel, cumulativeLevelXp, validateProgressionConfig} from '../src/simulation/progression';
import {decorationLayerDepth, decorationScale, decorationOrigin} from '../src/display/decorationArt';
import {createCentreStartGame} from '../src/state/initial';
import {act, encodeGame, decodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
const expected = [
 ['dirt-path','Chemin en terre',1,1,1,1], ['bush','Buisson',20,1,1,1], ['tree','Arbre',30,2,2,1],
 ['hay-bale','Botte de foin',50,1,1,2], ['bunny-slippers','Chaussons lapins',30,1,1,3],
 ['birthday-candle','Bougie « 1 an »',50,2,2,5], ['small-bookcase','Petite bibliothèque',600,1,1,6],
 ['coconut-palm','Cocotier',800,2,2,8], ['otter-plush','Peluche de loutre géante',1500,2,2,10],
 ['large-bookcase','Grande bibliothèque',4000,2,1,12], ['hanukkah-menorah','Ménorah de Hanoucca',2500,1,1,14],
 ['honey-pot','Pot de miel géant',70,2,2,4], ['robot-statue','Statue du robot noir et doré',15000,2,2,22],
] as const;
describe('approved painted decorations', () => {
 it('contains exactly the thirteen painted decorations', () => {
  expect(DECORATION_IDS).toEqual(expected.map(row => row[0]));
  expect(Object.keys(DECORATIONS)).toEqual(expected.map(row => row[0]));
 });
 it.each(expected)('%s has its approved price, footprint, level, and half-price resale', (id,name,price,width,height,level) => {
  expect(DECORATIONS[id]).toMatchObject({name,price,width,height,level,rotates:false,area:'outside'});
  expect(requiredDecorationLevel(id)).toBe(level);
  expect(decorationResalePrice(id)).toBe(Math.floor(price/2));
  const state=createCentreStartGame(0); state.pattes=20000; state.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};
  const bought=act(state,{type:'buyDecoration',catalogId:id},0);expect(bought.ok).toBe(true);if(!bought.ok)throw Error(bought.reason);
  const sold=act(bought.state,{type:'sellDecoration',id:bought.state.decorations[0].id},0);expect(sold.ok).toBe(true);expect(sold.state.pattes).toBe(20000-price+Math.floor(price/2));
 });
 it('cleans retired placed and inventory copies in v16 without changing any other field, and round-trips stably', () => {
  const s=createCentreStartGame(0);
  s.pattes=1234;s.nextId=100;s.progression={totalXp:cumulativeLevelXp(5),rewardedThroughLevel:5};
  s.missions.events.placeDecoration=1;
  const baseline=decodeGame(encodeGame(s));if(!baseline.ok)throw Error(baseline.reason);
  const raw=JSON.parse(encodeGame(baseline.state));
  raw.decorations=[...RETIRED_DECORATION_IDS.flatMap((catalogId,i)=>[
   {id:`decoration-${10+i*2}`,catalogId,location:{kind:'inventory'},placementXpProcessed:false},
   {id:`decoration-${11+i*2}`,catalogId,location:{kind:'outside',x:18,y:28,rotation:0},placementXpProcessed:true},
  ]),{id:'decoration-50',catalogId:'bush',location:{kind:'outside',x:18,y:28,rotation:0},placementXpProcessed:true},
   {id:'decoration-51',catalogId:'hay-bale',location:{kind:'inventory'},placementXpProcessed:false}];
  const expectedState={...baseline.state,decorations:raw.decorations.slice(-2)};
  const decoded=decodeGame(JSON.stringify(raw));
  expect(decoded).toEqual({ok:true,state:expectedState});
  expect(expectedState.version).toBe(17);
  if(!decoded.ok)throw Error(decoded.reason);
  expect(decodeGame(encodeGame(decoded.state))).toEqual(decoded);
  const data=new Map([[SAVE_KEY,JSON.stringify(raw)]]);
  const controller=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},()=>0);
  expect(controller.getSnapshot().state).toEqual(expectedState);
  const prepared=controller.prepareImport(JSON.stringify(raw));expect(prepared.ok).toBe(true);
  if(!prepared.ok)throw Error(prepared.reason);
  expect(controller.confirmImport(prepared.token,true)).toMatchObject({ok:true});
  expect(controller.getSnapshot().state).toEqual(expectedState);
  const exported=controller.exportGame();if(!exported.ok)throw Error(exported.reason);
  expect(decodeGame(exported.json)).toEqual(decoded);controller.dispose();
 });
 it('still refuses unknown IDs even beside retired copies', () => {
  const raw=JSON.parse(encodeGame(createCentreStartGame(0)));raw.nextId=100;
  raw.decorations=[{id:'decoration-10',catalogId:RETIRED_DECORATION_IDS[0],location:{kind:'inventory'}},
   {id:'decoration-11',catalogId:'unknown-decoration',location:{kind:'inventory'}}];
  expect(decodeGame(JSON.stringify(raw))).toEqual({ok:false,reason:'INVALID_STATE'});
 });
 it('still validates explicit levels against the configured maximum', () => {
  const definition=DECORATIONS['hay-bale'], old=definition.level;
  try {definition.level=0;expect(()=>validateProgressionConfig()).toThrow();definition.level=31;expect(()=>validateProgressionConfig()).toThrow();}
  finally {definition.level=old;}
 });
 it('uses the ground layer below standing decorations, with a shared ghost scale and centred tile anchor', () => {
  expect(decorationLayerDepth('dirt-path')).toBeLessThan(.1); // buildings
  for(const id of DECORATION_IDS.filter(id=>id!=='dirt-path')) expect(decorationLayerDepth('dirt-path')).toBeLessThan(decorationLayerDepth(id));
  expect(decorationOrigin('dirt-path')).toEqual({x:.5,y:.5});
  expect(decorationScale('dirt-path',320)*320).toBeGreaterThan(44); // overlapping edges
 });
});
