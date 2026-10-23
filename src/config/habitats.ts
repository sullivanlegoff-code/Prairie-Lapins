import {LEGACY_ISLAND} from './islandGeometry';
import {BALANCE} from './balance';
export const HABITAT_TYPES = ['universal', 'paille', 'neige', 'feu', 'metal', 'vol'] as const;
export type HabitatType = typeof HABITAT_TYPES[number];
export type HabitatLevel = 1 | 2 | 3;
export const HABITATS: Record<HabitatType, {name: string; accepted: string; ground: number; fence: number}> = {
  universal: {name: 'Enclos universel', accepted: 'Tous les types', ground: 0xc2dc9f, fence: 0xb68b60},
  paille: {name: 'Prairie de paille', accepted: 'Paille', ground: 0xe4d49b, fence: 0xb79a66},
  neige: {name: 'Jardin enneigé', accepted: 'Neige', ground: 0xe5edf0, fence: 0x9fbcc9},
  feu: {name: 'Clairière de feu', accepted: 'Feu', ground: 0xe2b899, fence: 0xb58b79},
  metal: {name: 'Atelier de métal', accepted: 'Métal', ground: 0xc7d0c8, fence: 0x8f9caa},
  vol: {name: 'Jardin des airs', accepted: 'Vol', ground: 0xc6dfce, fence: 0x9aaec3},
};
export type HabitatCurrency = 'pattes' | 'hearts';
/** `cost` is paid in `currency` when the level is reached: level 1 is bought, levels 2 and 3 are upgrades. Level 3 costs hearts, never coins. */
export const HABITAT_LEVELS = {
  universal: [{capacity: BALANCE.enclosureCapacity, cap: BALANCE.enclosureCap, cost: BALANCE.buildings.enclosure.price, currency: 'pattes'},
    {capacity: 5, cap: 900, cost: 200, currency: 'pattes'}, {capacity: 7, cap: 1200, cost: 10, currency: 'hearts'}],
  specialized: [{capacity: 3, cap: 900, cost: 200, currency: 'pattes'}, {capacity: 5, cap: 1500, cost: 300, currency: 'pattes'}, {capacity: 7, cap: 2100, cost: 10, currency: 'hearts'}],
} as const;
export const LAND = [{width: BALANCE.initialWidth, cost: 0}, {width: BALANCE.extendedWidth, cost: BALANCE.extensionCost}, {width: LEGACY_ISLAND.mapCells, cost: 1000}] as const;
export const habitatLevel = (type: HabitatType, level: HabitatLevel) => HABITAT_LEVELS[type === 'universal' ? 'universal' : 'specialized'][level - 1];
export const habitatPrice = (type: HabitatType) => habitatLevel(type, 1).cost;
