import {FINE_GRID} from './decorations';
import {ISLAND, parcelOrigin, type IslandGeometry} from './islandGeometry';
import {ISLAND_ORDER} from './islandStages';
export const PARCEL_IDS = ['center', 'northwest', 'north', 'northeast', 'west', 'east', 'southwest', 'south', 'southeast',
  // The grown island (owner, 24 November 2026): two columns to the east, a row to the north (negative y).
  // In their purchase order (ISLAND_ORDER).
  'east-south', 'east-center', 'east-north', 'far-northwest', 'far-north', 'far-northeast', 'far-east-south', 'far-east-center', 'far-east-north'] as const;
/** The nine parcels of the first island (the only ones of the legacy geometry). */
export const FIRST_PARCEL_IDS = PARCEL_IDS.slice(0, 9) as readonly ParcelId[];
export type ParcelId = typeof PARCEL_IDS[number];
type ParcelMap = Record<ParcelId, {name: string; x: number; y: number}>;
/** Same arrangement for every geometry; only the parcel size differs (the legacy geometry only ever has the first nine). */
function parcelsOf(geometry: IslandGeometry): ParcelMap {
 const at = (column: number, row: number) => parcelOrigin(column, row, geometry);
 return {
  center:{name:'Centre',...at(1,1)},northwest:{name:'Nord-ouest',...at(0,0)},north:{name:'Nord',...at(1,0)},northeast:{name:'Nord-est',...at(2,0)},west:{name:'Ouest',...at(0,1)},east:{name:'Est',...at(2,1)},southwest:{name:'Sud-ouest',...at(0,2)},south:{name:'Sud',...at(1,2)},southeast:{name:'Sud-est',...at(2,2)},
  'east-south':{name:'Est, au sud',...at(3,2)},'east-center':{name:'Est, au centre',...at(3,1)},'east-north':{name:'Est, au nord',...at(3,0)},
  'far-east-south':{name:'Grand est, au sud',...at(4,2)},'far-east-center':{name:'Grand est, au centre',...at(4,1)},'far-east-north':{name:'Grand est, au nord',...at(4,0)},
  'far-northwest':{name:'Grand nord, à l’ouest',...at(0,-1)},'far-north':{name:'Grand nord',...at(1,-1)},'far-northeast':{name:'Grand nord, à l’est',...at(2,-1)},
 };
}
export const PARCELS: ParcelMap = parcelsOf(ISLAND);
const PARCELS_BY_GEOMETRY = new Map<IslandGeometry, ParcelMap>([[ISLAND, PARCELS]]);
const parcelsFor = (geometry: IslandGeometry) => PARCELS_BY_GEOMETRY.get(geometry) ?? PARCELS_BY_GEOMETRY.set(geometry, parcelsOf(geometry)).get(geometry)!;
export const PARCEL_SIZE = ISLAND.parcelCells;
/** Saved only by islands started on the southwest parcel; absent means a legacy centre-start island. */
export type IslandStart = 'southwest';
export type LandState = {acquiredParcels: ParcelId[]; islandStart?: IslandStart};
export const startParcel = (s: Pick<LandState, 'islandStart'>): ParcelId => s.islandStart ?? 'center';
/**
 * Parcels an extension may buy, before price and level gates. Legacy centre-start islands keep
 * the former rule (any unowned parcel). Southwest-start islands grow in the fixed ISLAND_ORDER, one
 * painted stage after another: only the first unowned parcel of that order is offered. It always
 * shares an edge with owned land, even on an island grown out of order before this rule.
 */
export function purchasableParcels(s: LandState): ParcelId[] {
 const unowned=PARCEL_IDS.filter(id=>!s.acquiredParcels.includes(id));
 // A legacy centre-start island buys the first nine in any order, then grows like every island (fixed order, painted stages).
 if(!s.islandStart){const first=unowned.filter(id=>FIRST_PARCEL_IDS.includes(id));if(first.length)return first;const next=ISLAND_ORDER.find(id=>!s.acquiredParcels.includes(id));return next?[next]:[];}
 const start=PARCELS[startParcel(s)];
 const neighbours=unowned.filter(id=>{
  const p=PARCELS[id];
  return p.x>=start.x&&p.y<=start.y&&s.acquiredParcels.some(owned=>{const q=PARCELS[owned];return Math.abs(q.x-p.x)+Math.abs(q.y-p.y)===PARCEL_SIZE;});
 });
 const next=ISLAND_ORDER.find(id=>!s.acquiredParcels.includes(id));
 return next&&neighbours.includes(next)?[next]:neighbours;
}
/** The parcel an expansion-mode tap on this cell selects, or null when it cannot be bought. */
export function expansionTarget(s:LandState,x:number,y:number):ParcelId|null {const id=parcelAt(x,y);return id&&purchasableParcels(s).includes(id)?id:null}
/** Rules use the current geometry; only legacy save validation passes LEGACY_ISLAND. */
export function parcelAt(x:number,y:number,geometry:IslandGeometry=ISLAND): ParcelId | null {
 const b=geometry.bounds,parcel=geometry.parcelCells,parcels=parcelsFor(geometry),ids=geometry===ISLAND?PARCEL_IDS:FIRST_PARCEL_IDS;
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<b.left||y<b.top||x>=b.right||y>=b.bottom)return null;
 // The two north-east corners of the 5 × 4 rectangle are sky, not land.
 return ids.find(id=>{const p=parcels[id];return x>=p.x&&x<p.x+parcel&&y>=p.y&&y<p.y+parcel}) ?? null;
}
export function acquiredCell(s:LandState,x:number,y:number,geometry:IslandGeometry=ISLAND):boolean {const id=parcelAt(x,y,geometry);return id!==null&&s.acquiredParcels.includes(id)}
export const EXTENSION_PRICES = [600, 2000, 6000, 12000, 25000, 45000, 75000, 100000,
  // The grown island (owner, 24 November 2026): from 120 000 to 400 000 pièces.
  120000, 140000, 160000, 190000, 220000, 255000, 295000, 345000, 400000] as const;
export const extensionPrice=(s:LandState)=>EXTENSION_PRICES[s.acquiredParcels.length-1] ?? 0;
export function acquiredFootprint(s:LandState,x:number,y:number,width:number,height:number,geometry:IslandGeometry=ISLAND):boolean {
 const b=geometry.fineBounds;
 if(![x,y,width,height].every(Number.isInteger)||width<1||height<1||x<b.left||y<b.top||x+width>b.right||y+height>b.bottom)return false;
 for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++)if(!acquiredCell(s,Math.floor(col/FINE_GRID),Math.floor(row/FINE_GRID),geometry))return false;
 return true;
}
