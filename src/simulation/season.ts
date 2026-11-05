import {SPECIES, type SpeciesId} from '../config/balance';
import {CHRISTMAS_EVENT} from '../config/christmas';

/** A seasonal rabbit (Yetiti, Rennes, Susucre) is born only while its event is on; one already born stays (owner, 5 November 2026). */
export const seasonAllows = (id: SpeciesId): boolean => SPECIES[id].event !== 'christmas' || CHRISTMAS_EVENT.active;
