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
    {capacity: 5, cap: 500, cost: 175, currency: 'pattes'}, {capacity: 7, cap: 1250, cost: 10, currency: 'hearts'}],
  specialized: [{capacity: 3, cap: 100, cost: 200, currency: 'pattes'}, {capacity: 5, cap: 300, cost: 100, currency: 'pattes'}, {capacity: 7, cap: 1250, cost: 10, currency: 'hearts'}],
} as const;
export const LAND = [{width: BALANCE.initialWidth, cost: 0}, {width: BALANCE.extendedWidth, cost: BALANCE.extensionCost}, {width: LEGACY_ISLAND.mapCells, cost: 1800}] as const;
export const HABITAT_PRICES: Record<HabitatType, number> = {paille: 200, neige: 200, feu: 450, metal: 800, vol: 1200, universal: 350};
/** Owner's storage limits; the universal habitat follows Vol. */
export const HABITAT_CAPS: Record<HabitatLevel, Record<HabitatType, number>> = {
  1: {paille: 100, neige: 125, feu: 150, metal: 175, vol: 200, universal: 200},
  2: {paille: 300, neige: 350, feu: 400, metal: 450, vol: 500, universal: 500},
  3: {paille: 1250, neige: 1250, feu: 1250, metal: 1250, vol: 1250, universal: 1250},
};
export const habitatCap = (type: HabitatType, level: HabitatLevel): number => HABITAT_CAPS[level][type];
export const habitatLevel = (type: HabitatType, level: HabitatLevel) => ({...HABITAT_LEVELS[type === 'universal' ? 'universal' : 'specialized'][level - 1], cap: habitatCap(type, level), cost: level === 1 ? HABITAT_PRICES[type] : level === 2 ? HABITAT_PRICES[type] / 2 : 10});
export const habitatPrice = (type: HabitatType) => habitatLevel(type, 1).cost;
