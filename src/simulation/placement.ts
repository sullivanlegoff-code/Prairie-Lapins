import {DECORATIONS, type DecorationId} from '../config/decorations';
import {habitatFootprint} from '../config/habitatSizes';
import {acquiredFootprint} from '../config/land';
import {ISLAND, type IslandGeometry} from '../config/islandGeometry';
import type {Building, GameState, Refusal} from '../state/types';

/** Only positions matter: legacy saves (other building payloads) are checked with the same rules. */
export type PlacementState = Pick<GameState, 'acquiredParcels' | 'decorations'> & {buildings: readonly (Pick<Building, 'id' | 'x' | 'y'> & Partial<Pick<Building, 'footprintTier'>>)[]};
/** All rectangles use integer fine-grid coordinates; touching edges is allowed. */
export interface Footprint {x: number; y: number; width: number; height: number}
/** The single footprint of a building: its acquired tier (absent = the compact 4 × 4), anchored at its top-left cell. */
export const buildingFootprint = (position: {x: number; y: number; footprintTier?: number}): Footprint => {
  const size = habitatFootprint(position.footprintTier);
  return {x: position.x, y: position.y, width: size.width, height: size.depth};
};
export function decorationFootprint(catalogId: DecorationId, rotation: 0 | 1 = 0) {
  const d = DECORATIONS[catalogId];
  return rotation ? {width: d.height, height: d.width} : {width: d.width, height: d.height};
}
export const overlaps = (a: Footprint, b: Footprint): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function decorationsInFootprint(s: Pick<GameState, 'decorations'>, rect: Footprint): string[] {
  return s.decorations.filter(d => d.location.kind === 'outside' &&
    overlaps(rect, {...d.location, ...decorationFootprint(d.catalogId, d.location.rotation)})).map(d => d.id);
}
export function footprintPlacementReason(s: PlacementState,
  rect: Footprint, ignore: {buildingId?: string; decorationId?: string} = {}, geometry: IslandGeometry = ISLAND): Refusal | null {
  if (!acquiredFootprint(s, rect.x, rect.y, rect.width, rect.height, geometry)) return 'INVALID_CELL';
  if (s.buildings.some(b => b.id !== ignore.buildingId && overlaps(rect, buildingFootprint(b)))) return 'CELL_OCCUPIED';
  if (s.decorations.some(d => d.id !== ignore.decorationId && d.location.kind === 'outside' &&
    overlaps(rect, {...d.location, ...decorationFootprint(d.catalogId, d.location.rotation)}))) return 'DECORATION_OVERLAP';
  return null;
}
export function buildingPlacementReason(s: PlacementState,
  x: number, y: number, movingId?: string, geometry: IslandGeometry = ISLAND): Refusal | null {
  if (movingId && !s.buildings.some(b => b.id === movingId)) return 'NOT_FOUND';
  // A building keeps its own footprint when moved; a new one starts compact.
  const reason = footprintPlacementReason(s, buildingFootprint({x, y, footprintTier: s.buildings.find(b => b.id === movingId)?.footprintTier}), {buildingId: movingId}, geometry);
  return reason === 'DECORATION_OVERLAP' ? 'DECORATION_BLOCKS_BUILDING' : reason;
}
/**
 * Room for the footprint an upgrade would acquire, anchored at the same top-left cell: the whole target rectangle must be
 * owned land, free of other buildings and of decorations. Nothing is ever moved or put away to make room.
 */
export function upgradeFootprintReason(s: PlacementState, buildingId: string, tier: number, geometry: IslandGeometry = ISLAND):
  'UPGRADE_BLOCKED_LAND' | 'UPGRADE_BLOCKED_BUILDING' | 'UPGRADE_BLOCKED_DECORATION' | 'NOT_FOUND' | null {
  const b = s.buildings.find(item => item.id === buildingId); if (!b) return 'NOT_FOUND';
  const reason = footprintPlacementReason(s, buildingFootprint({x: b.x, y: b.y, footprintTier: tier}), {buildingId}, geometry);
  return reason === null ? null : reason === 'CELL_OCCUPIED' ? 'UPGRADE_BLOCKED_BUILDING' : reason === 'DECORATION_OVERLAP' ? 'UPGRADE_BLOCKED_DECORATION' : 'UPGRADE_BLOCKED_LAND';
}
export function buildingAt(s: Pick<GameState, 'buildings'>, p: {x: number; y: number}) {
  return s.buildings.find(b => { const f = buildingFootprint(b); return p.x >= f.x && p.x < f.x + f.width && p.y >= f.y && p.y < f.y + f.height; });
}
