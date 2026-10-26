import type {GameState} from '../state/types';

/** The travel agency: up to three concurrent trips, its traveller away from every other action until welcomed back. */
export const agencyBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'agency');
export const travelling = (s: Pick<GameState, 'travel'>, rabbitId: string): boolean => s.travel?.trips.some(t => t.rabbitId === rabbitId) ?? false;
export const tripReady = (s: Pick<GameState, 'travel'>, now: number): boolean => s.travel?.trips.some(t => t.endsAt <= now) ?? false;
