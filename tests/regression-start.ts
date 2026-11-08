import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {createCentreStartGame} from '../src/state/initial';
import {createMissions} from '../src/simulation/missions';
/** HISTORICAL fixtures only: former starts on the centre-start island (legacy saves keep its any-direction expansion). */
export function previousStart(now:number=Date.now()){const s=createCentreStartGame(now);s.grass=10;delete s.levelAccessTransition;delete s.startCourse;s.buildings[0].habitat!.type='universal';s.rabbits.push({id:'rabbit-3',species:'neige',affection:1,enclosureId:'building-1'});s.discovered.push('neige');s.missions=createMissions(s,now);return s;}
/**
 * Legacy layout for existing placement/economy regressions; new starts are checked separately. The enclosure stands at (16, 19)
 * since the 6 × 5 enclosures (6 November 2026): x 22 and the rows from 24 stay free, as they were beside the former (17, 20).
 */
export function regressionStart(now:number=Date.now()){const s=previousStart(now);delete s.initiation;s.purchaseUnlocks=['universal','feu','volant'];s.buildings=s.buildings.filter(b=>b.kind==='enclosure');s.buildings[0].x=16;s.buildings[0].y=19;s.nextId=4;s.missions=createMissions(s,now);establishHistoricalLevelRights(s);return s;}
