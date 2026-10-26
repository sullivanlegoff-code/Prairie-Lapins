import {SPECIES, type SpeciesId} from '../config/balance';
import {HABITATS, habitatLevel} from '../config/habitats';
import type {Building, GameState, Refusal} from '../state/types';
import {ISLAND} from '../config/islandGeometry';
export const habitatStats = (b: Building) => habitatLevel(b.habitat!.type, b.habitat!.level);
export const habitatName = (b: Building) => HABITATS[b.habitat!.type].name;
export function removeHabitatReason(s: GameState, id: string): Refusal | null {
  if (!s.buildings.some(b => b.id === id && b.kind === 'enclosure')) return 'NOT_FOUND';
  // Parents at the nest and agency travellers keep their home reference and reserved place.
  if (s.rabbits.some(r => r.enclosureId === id)) return 'HABITAT_NOT_EMPTY';
  if (s.buildings.filter(b => b.kind === 'enclosure').length <= 1) return 'LAST_HABITAT';
  return null;
}
export const habitatAccepts = (b: Building, species: SpeciesId): boolean => b.kind === 'enclosure' && !!b.habitat &&
  (b.habitat.type === 'universal' || SPECIES[species].types.includes(b.habitat.type));
export function habitatEntryReason(s: GameState, b: Building, species: SpeciesId): Refusal | null {
  if (!habitatAccepts(b, species)) return 'TYPE_INCOMPATIBLE';
  return s.rabbits.filter(r => r.enclosureId === b.id).length >= habitatStats(b).capacity ? 'CAPACITY_FULL' : null;
}
/** Enclosures that would accept this species right now (type and capacity): the destinations `welcome` allows. */
export const welcomeDestinations = (s: GameState, species: SpeciesId): Building[] => s.buildings.filter(b => !habitatEntryReason(s, b, species));
export const terrainWidth = (_s?: unknown) => ISLAND.mapCells;
export const visibleColumns = (_s?: unknown) => ISLAND.mapCells;
