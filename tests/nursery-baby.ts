import {firstNurseryBaby, nurseryBuilding} from '../src/simulation/nursery';
import type {Building, Command, GameState, NurseryBaby} from '../src/state/types';
/** The single nursery baby of the one-cushion nursery, or null. */
export const babyOf = (b: Building): NurseryBaby | null => firstNurseryBaby(b);
export const stateBaby = (s: Pick<GameState, 'buildings'>): NurseryBaby | null => firstNurseryBaby(nurseryBuilding(s));
/** Test setup only: the one usable cushion (slot 0) holds this baby. */
export function setBaby(b: Building, baby: Omit<NurseryBaby, 'slot'> | null): void { b.nursery!.babies = baby ? [{slot: 0, ...baby}] : []; }
/**
 * Welcome of the nursery's single (lowest-slot) baby, named explicitly. With an empty nursery it names the birth still
 * waiting in the nest (refused as not ready), else `birth-0`, which names no birth.
 */
export const welcomeOf = (s: Pick<GameState, 'buildings'>, enclosureId: string): Extract<Command, {type: 'welcome'}> =>
  ({type: 'welcome', enclosureId, birthId: stateBaby(s)?.birth.id ?? s.buildings.find(b => b.breeding)?.breeding?.birth.id ?? 'birth-0'});
