import type {HabitatType} from '../config/habitats';
import {MISSION_CYCLE_DURATION} from '../config/missions';
import {createMissions} from '../simulation/missions';
import {BALANCE, HEARTS, NURSERY, type BuildingKind} from '../config/balance';
import {GIFTED_RECIPES} from '../config/recipes';
import {FINE_GRID} from '../config/decorations';
import {PARCELS, type ParcelId} from '../config/land';
import type {Building, GameState} from './types';
export function emptyBuilding(id: string, kind: BuildingKind, x: number, y: number, habitatType: HabitatType = 'universal'): Building {
  return {id, kind, x, y, incomeUnits: 0, habitat: kind === 'enclosure' ? {type: habitatType, level: 1} : null, order: null, breeding: null,
    nursery: kind === 'nursery' ? {capacity: NURSERY.initialCapacity, babies: []} : null};
}
/** The starting group (enclosure, nest, nursery) at the same place inside its start parcel, in fine cells. */
function starterBuildings(parcel: ParcelId): Building[] {
  const x = PARCELS[parcel].x * FINE_GRID, y = PARCELS[parcel].y * FINE_GRID;
  return [emptyBuilding('building-1', 'enclosure', x + 6, y + 8, 'paille'), emptyBuilding('building-4', 'nest', x + 2, y + 4), emptyBuilding('building-5', 'nursery', x + 10, y + 4)];
}
/** New games start on the southwest parcel and grow up and to the right (`purchasableParcels`). */
export function createGame(now: number = Date.now()): GameState {
  return newGame(now, 'southwest');
}
/**
 * The former centre-start island: what legacy saves and their migrations contain. Used only by
 * laboratory scenarios and fixtures reproducing those islands; never by a new game.
 */
export function createCentreStartGame(now: number = Date.now()): GameState {
  return newGame(now, 'center');
}
function newGame(now: number, start: 'southwest' | 'center'): GameState {
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + HEARTS.giftInterval) || !Number.isSafeInteger(now + MISSION_CYCLE_DURATION)) throw new RangeError('Invalid timestamp');
  const state: Omit<GameState, 'missions'> = {
    version: 17, rewardedDecorationModels: [], ...(start === 'southwest' ? {islandStart: start} : {}), cuisine: {affectionCycles: {}, heartCycle: null}, levelAccessTransition: {version: 1, rights: []}, progression: {totalXp: 0, rewardedThroughLevel: 1}, startCourse: 'paille-solo', purchaseUnlocks: [], initiation: {order:null, breeding:null, growth:null, birthId:null, closed:[], used:[]}, decorations: [], lastSimulatedAt: now, nextId: 6,
    hearts: HEARTS.initial, nextHeartGiftAt: now + HEARTS.giftInterval,
    pattes: BALANCE.initialPattes, grass: BALANCE.initialGrass, acquiredParcels: [start],
    buildings: starterBuildings(start),
    rabbits: [
      {id: 'rabbit-2', species: 'paille', affection: 1, enclosureId: 'building-1'},
    ], discovered: ['paille'], recipeBook: [...GIFTED_RECIPES], pityFailures: 0,
  };
  return {...state, missions: createMissions(state, now)};
}
