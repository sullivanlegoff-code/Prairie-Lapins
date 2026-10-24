import {FINE_GRID} from './decorations';
import {ISLAND, parcelOrigin, type IslandGeometry} from './islandGeometry';
import {ISLAND_ORDER} from './islandStages';
export const PARCEL_IDS = ['center', 'northwest', 'north', 'northeast', 'west', 'east', 'southwest', 'south', 'southeast'] as const;
export type ParcelId = typeof PARCEL_IDS[number];
type ParcelMap = Record<ParcelId, {name: string; x: number; y: number}>;
/** Same 3 × 3 arrangement for every geometry; only the parcel size differs. */
function parcelsOf(geometry: IslandGeometry): ParcelMap {
 const at = (column: number, row: number) => parcelOrigin(column, row, geometry);
 return {
  center:{name:'Centre',...at(1,1)},northwest:{name:'Nord-ouest',...at(0,0)},north:{name:'Nord',...at(1,0)},northeast:{name:'Nord-est',...at(2,0)},west:{name:'Ouest',...at(0,1)},east:{name:'Est',...at(2,1)},southwest:{name:'Sud-ouest',...at(0,2)},south:{name:'Sud',...at(1,2)},southeast:{name:'Sud-est',...at(2,2)},
 };
}
export const PARCELS: ParcelMap = parcelsOf(ISLAND);
const PARCELS_BY_GEOMETRY = new Map<IslandGeometry, ParcelMap>([[ISLAND, PARCELS]]);
const parcelsFor = (geometry: IslandGeometry) => PARCELS_BY_GEOMETRY.get(geometry) ?? PARCELS_BY_GEOMETRY.set(geometry, parcelsOf(geometry)).get(geometry)!;
export const MAP_SIZE = ISLAND.mapCells, PARCEL_SIZE = ISLAND.parcelCells;
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
 if(!s.islandStart)return unowned;
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
 const size=geometry.mapCells,parcel=geometry.parcelCells,parcels=parcelsFor(geometry);
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=size||y>=size)return null;
 return PARCEL_IDS.find(id=>{const p=parcels[id];return x>=p.x&&x<p.x+parcel&&y>=p.y&&y<p.y+parcel})!;
}
export function acquiredCell(s:LandState,x:number,y:number,geometry:IslandGeometry=ISLAND):boolean {const id=parcelAt(x,y,geometry);return id!==null&&s.acquiredParcels.includes(id)}
export const extensionPrice=(s:LandState)=>s.acquiredParcels.length*500;
export function acquiredFootprint(s:LandState,x:number,y:number,width:number,height:number,geometry:IslandGeometry=ISLAND):boolean {
 if(![x,y,width,height].every(Number.isInteger)||width<1||height<1||x<0||y<0||x+width>geometry.mapFine||y+height>geometry.mapFine)return false;
 for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++)if(!acquiredCell(s,Math.floor(col/FINE_GRID),Math.floor(row/FINE_GRID),geometry))return false;
 return true;
}
