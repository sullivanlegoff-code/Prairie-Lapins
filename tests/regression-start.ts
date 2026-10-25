import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {createCentreStartGame} from '../src/state/initial';
import {createMissions} from '../src/simulation/missions';
/** HISTORICAL fixtures only: former starts on the centre-start island (legacy saves keep its any-direction expansion). */
export function previousStart(now:number=Date.now()){const s=createCentreStartGame(now);s.grass=10;delete s.levelAccessTransition;delete s.startCourse;s.buildings[0].habitat!.type='universal';s.rabbits.push({id:'rabbit-3',species:'neige',affection:1,enclosureId:'building-1'});s.discovered.push('neige');s.missions=createMissions(s,now);return s;}
/** Legacy layout for existing placement/economy regressions; new starts are checked separately. */
export function regressionStart(now:number=Date.now()){const s=previousStart(now);delete s.initiation;s.purchaseUnlocks=['universal','feu','volant'];s.buildings=s.buildings.filter(b=>b.kind==='enclosure');s.buildings[0].x=18;s.buildings[0].y=20;s.nextId=4;s.missions=createMissions(s,now);establishHistoricalLevelRights(s);return s;}
