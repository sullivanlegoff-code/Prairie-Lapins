import type {GameState} from '../state/types';

/** The travel agency: one trip at a time, its traveller away from every other action until welcomed back. */
export const agencyBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'agency');
export const travelling = (s: Pick<GameState, 'travel'>, rabbitId: string): boolean => s.travel?.trip?.rabbitId === rabbitId;
export const tripReady = (s: Pick<GameState, 'travel'>, now: number): boolean => !!s.travel?.trip && s.travel.trip.endsAt <= now;
