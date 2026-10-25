import {cumulativeLevelXp,requiredExtensionLevel} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as createGame} from './regression-start';
import {act,advance} from '../src/simulation';
import {scenarioState} from '../src/dev/scenarios';
import {quoteAcceleration} from '../src/simulation/hearts';
import {BALANCE,HOUR} from '../src/config/balance';
import type {Command,GameState} from '../src/state/types';
const run=(s:GameState,c:Command,t=s.lastSimulatedAt)=>{const r=act(s,c,t,()=>.99);if(!r.ok)throw Error(r.reason);return r.state};
function prepared(){let s=createGame(0);s.pattes=10000;s.grass=100;s=run(s,{type:'buyBuilding',kind:'farm',x: 22, y: 20});s=run(s,{type: 'placeStarterBuilding',kind:'nest',x: 26, y: 20});s=run(s,{type: 'placeStarterBuilding',kind:'nursery',x: 18, y: 24});s=run(s,{type:'feed',id:'rabbit-2'});return run(s,{type:'feed',id:'rabbit-3'})}
export function representative(){
 let expanded=createGame(0);expanded.pattes=10000;const level=requiredExtensionLevel(2);expanded.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};expanded=run(run(expanded,{type:'expand',parcelId:'east',expectedCost:600}),{type:'expand',parcelId:'west',expectedCost:1800});
 const production=advance(run(prepared(),{type:'startOrder',id:'building-4',recipe: 'foin'}),12345);
 let reproduction=prepared();reproduction.pityFailures=9;reproduction=run(reproduction,{type:'breed',parents:['rabbit-2','rabbit-3']});
 reproduction.buildings.find(b=>b.breeding)!.breeding!.birth={...reproduction.buildings.find(b=>b.breeding)!.breeding!.birth,species:'lunettes',guaranteed:true,reservedDiscovery:true};reproduction.pityFailures=0;
 let waiting=sendToNursery(advance(reproduction,BALANCE.breedingDuration));waiting=run(waiting,{type:'breed',parents:['rabbit-2','rabbit-3']});waiting=advance(waiting,3*BALANCE.breedingDuration);
 let hearts=run(prepared(),{type:'startOrder',id:'building-4',recipe: 'foin'});const q=quoteAcceleration(hearts,'building-4','order',0);if(!q.ok)throw Error(q.reason);hearts=run(hearts,{type:'accelerate',id:'building-4',stage:'order',jobKey:q.jobKey,maxHearts:q.hearts});hearts=advance(hearts,24*HOUR);
 let missions=scenarioState('missions',0);missions=run(missions,{type:'claimMainMission',id:missions.missions.completed[0]});
 return {newGame:createGame(0),twoExtensions:expanded,level3Seven:scenarioState('habitats',0),production,reproduction,nurseryAndWaitingNest:waiting,missionsAndRewards:missions,spentHeartsGiftPending:hearts,fractionalIncome:advance(createGame(0),17)};
}
