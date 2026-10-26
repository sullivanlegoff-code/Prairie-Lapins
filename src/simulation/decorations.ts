import {stateLevelAccess} from './levelRights';
import {DECORATIONS, FINE_GRID, MAX_DECORATIONS, type DecorationId} from '../config/decorations';
import type {DecorationLocation, GameState, Refusal} from '../state/types';
import {ISLAND, type IslandGeometry} from '../config/islandGeometry';

import {decorationFootprint as footprint, buildingFootprint, decorationsInFootprint, footprintPlacementReason, type PlacementState} from './placement';
export {footprint};
/** Legacy explicit bulk command uses a coarse cell; building placement uses buildingFootprint. */
export function decorationsInCell(s: Pick<GameState, 'decorations'>, x: number, y: number): string[] {
  return decorationsInFootprint(s, buildingFootprint({x: x * FINE_GRID, y: y * FINE_GRID}));
}
export function purchaseDecorationReason(s: GameState, catalogId: DecorationId): Refusal | null {
  if (!Object.hasOwn(DECORATIONS, catalogId)) return 'INVALID_CHOICE';
  if (stateLevelAccess(s,{family:'decoration',id:catalogId}).locked) return 'LEVEL_REQUIRED';
  if (s.decorations.length >= MAX_DECORATIONS || !Number.isSafeInteger(s.nextId + 1)) return 'DECORATION_LIMIT';
  const d = DECORATIONS[catalogId];
  return d.heartPrice !== undefined ? (s.hearts < d.heartPrice ? 'NOT_ENOUGH_HEARTS' : null) : s.pattes < d.price ? 'NOT_ENOUGH_PATTES' : null;
}
/** Used by commands, imports, ghosts and fine-grid feedback. Moving excludes only itself. */
export function decorationPlacementReason(s: PlacementState, id: string, location: DecorationLocation, geometry: IslandGeometry = ISLAND): Refusal | null {
  const owned = s.decorations.find(d => d.id === id);
  if (!owned) return 'NOT_FOUND';
  return catalogDecorationPlacementReason(s, owned.catalogId, location, id, geometry);
}
/** Unowned purchase previews use exactly the same footprint checks as owned objects. */
export function catalogDecorationPlacementReason(s: PlacementState, catalogId: DecorationId, location: DecorationLocation, id?: string, geometry: IslandGeometry = ISLAND): Refusal | null {
  if (!Object.hasOwn(DECORATIONS, catalogId)) return 'INVALID_CHOICE';
  const definition = DECORATIONS[catalogId];
  if (location.kind === 'inventory') return null;
  if (location.kind !== 'outside') return 'INVALID_CHOICE';
  if (definition.area !== 'outside' || (location.rotation !== 0 && location.rotation !== 1) || (location.rotation && !definition.rotates)) return 'INVALID_CHOICE';
  const rect = {...location, ...footprint(catalogId, location.rotation)};
  return footprintPlacementReason(s, rect, {decorationId: id}, geometry);
}
