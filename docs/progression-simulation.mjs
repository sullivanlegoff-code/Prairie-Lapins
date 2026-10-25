import './node-typescript-loader.mjs';
const sim=await import('../src/simulation/index.ts'), prog=await import('../src/simulation/progression.ts'), missions=await import('../src/simulation/missions.ts'), land=await import('../src/config/land.ts'), placement=await import('../src/simulation/placement.ts'), hab=await import('../src/simulation/habitats.ts'), balance=await import('../src/config/balance.ts'), breeding=await import('../src/simulation/breeding.ts'), rights=await import('../src/simulation/levelRights.ts'), dec=await import('../src/config/decorations.ts');
const {writeFileSync}=await import('node:fs');
const H=3600000, MIN=60000;
// First session starts at 08:00. Offsets 0, 5h, 12h then 24h give 08/13/20, including a 12h night.
// At most 45 successful commands/session (about 6 seconds/command); eight meals maximum.
// Collection first: diversify parents, keep at least one of every species, release low-affection duplicates
// when a home is full. Buy the second farm early; no Cuisine rewards or paid recipes; Hearts only for permanent habitat upgrades.
let s=sim.createGame(0),now=0,seed=20261025,used=0,totalActions=0;
const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const milestones={},rows=[],counts={};
const level=()=>prog.progressionFromXp(s.progression.totalXp).level;
function run(c,mandatory=false){if(used>=45)return false;const r=sim.act(s,c,now,rng);if(!r.ok){if(mandatory)throw Error(JSON.stringify({c,reason:r.reason}));return false;}s=r.state;used++;totalActions++;counts[c.type]=(counts[c.type]??0)+1;for(const n of [5,10,15,20,22,25,30])if(level()>=n&&milestones[n]===undefined)milestones[n]=Number((now/(24*H)).toFixed(3));return true;}
function claim(){for(let i=0;i<20;i++){const id=missions.activeMainMissions(s).find(id=>s.missions.completed.includes(id));if(!id||!run({type:'claimMainMission',id}))break;}for(const id of balance.DAILY_MISSION_IDS??['collect-pattes','collect-grass','gain-affection']){if(s.missions.daily.progress[id]>0)run({type:'claimDailyMission',id,cycleStart:missions.dailyCycleStart(s)});}run({type:'claimDailyBonus',cycleStart:missions.dailyCycleStart(s)});}
function spot(){for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(!placement.buildingPlacementReason(s,x,y))return{x,y};return null;}
function build(kind,habitatType){const pos=spot();return pos&&run({type:'buyBuilding',kind,...pos,...(habitatType?{habitatType}:{})});}
const room=species=>s.buildings.find(b=>!hab.habitatEntryReason(s,b,species));
function home(species){if(room(species))return room(species);for(const b of s.buildings.filter(b=>hab.habitatAccepts(b,species)&&b.habitat.level<3))if(run({type:'upgradeHabitat',id:b.id,fromLevel:b.habitat.level})&&room(species))return room(species);
 const duplicate=s.rabbits.filter(r=>hab.habitatAccepts(s.buildings.find(b=>b.id===r.enclosureId),species)&&s.rabbits.filter(other=>other.species===r.species).length>1).sort((a,b)=>a.affection-b.affection).find(r=>!breeding.nestForParent(s,r.id));if(duplicate)run({type:'release',id:duplicate.id});if(room(species))return room(species);
 build('enclosure',balance.SPECIES[species].types[0]);return room(species);}
// Exact Paille guide, three free one-shot aids, manual harvest/transfer/welcome and rewards.
build('enclosure','neige');claim();run({type:'buyRabbit',species:'neige',enclosureId:room('neige').id},true);claim();
build('farm');claim();const farm=s.buildings.find(b=>b.kind==='farm');run({type:'startOrder',id:farm.id,recipe:'small'},true);
run({type:'initiationAid',id:farm.id,stage:'order',jobKey:s.initiation.order},true);run({type:'collectOrder',id:farm.id},true);claim();
for(const r of [...s.rabbits]){run({type:'feed',id:r.id},true);claim();}
run({type:'breed',parents:s.rabbits.map(r=>r.id)},true);claim();
run({type:'initiationAid',id:'building-4',stage:'breeding',jobKey:s.initiation.breeding},true);run({type:'transferBirth',id:'building-4',birthId:s.initiation.birthId},true);claim();
run({type:'initiationAid',id:'building-5',stage:'growth',jobKey:s.initiation.growth,birthId:s.initiation.birthId},true);const baby=s.buildings.find(b=>b.kind==='nursery').nursery.babies[0];run({type:'welcome',birthId:baby.birth.id,enclosureId:room(baby.birth.species).id},true);claim();
const tutorial={pattes:s.pattes,grass:s.grass,hearts:s.hearts,level:level(),xp:s.progression.totalXp};
function remaining(){return {commons:balance.SHOP_SPECIES.filter(id=>!s.discovered.includes(id)),extensions:8-(s.acquiredParcels.length-1),extensionCost:land.EXTENSION_PRICES.slice(s.acquiredParcels.length-1).reduce((a,b)=>a+b,0),farms:2-s.buildings.filter(b=>b.kind==='farm').length,kitchen:!s.buildings.some(b=>b.kind==='kitchen'),habitatUpgrades:s.buildings.filter(b=>b.habitat&&b.habitat.level<3).length,paidRecipes:balance.SPECIES_IDS.filter(id=>balance.SPECIES[id].acquisition.some(a=>a.kind==='recipe'&&a.knowledgePrice!==undefined)&&!s.recipeBook.includes(id)&&!s.discovered.includes(id))};}
function decorationBudget(){const missing=dec.DECORATION_IDS.filter(id=>!s.decorations.some(d=>d.catalogId===id));return {models:missing.length,pattes:missing.reduce((sum,id)=>sum+dec.DECORATIONS[id].price,0)};}
function snapshot(label,t){const v=sim.advance(s,t);rows.push({step:label,pattes:v.pattes,grass:v.grass,hearts:v.hearts,level:level(),species:v.discovered.length,speciesIds:[...v.discovered],storedPattes:Math.floor(v.buildings.reduce((a,b)=>a+b.incomeUnits,0)/H),remaining:remaining(),decorationBudget:decorationBudget(),mainMissionsClaimed:[...s.missions.claimed]});}
snapshot('10 min',10*MIN);
for(let day=0;day<70;day++){
 for(const hour of [0,5,12]){if(day===0&&hour===0)continue;now=(day*24+hour)*H;s=sim.advance(s,now);used=0;
 for(const b of s.buildings.filter(b=>b.kind==='enclosure'))run({type:'collectIncome',id:b.id});
 for(const b of s.buildings.filter(b=>b.order&&b.order.endsAt<=now))run({type:'collectOrder',id:b.id});
 run({type:'claimHearts'});claim();
 for(const b of s.buildings.filter(b=>b.nursery))for(const baby of [...b.nursery.babies].filter(b=>b.readyAt<=now)){const dest=home(baby.birth.species);if(dest)run({type:'welcome',birthId:baby.birth.id,enclosureId:dest.id});}
 const nest=s.buildings.find(b=>b.kind==='nest');if(nest.breeding?.endsAt<=now)run({type:'transferBirth',id:nest.id,birthId:nest.breeding.birth.id});claim();
 if(s.acquiredParcels.length<9&&s.pattes>=land.extensionPrice(s)+800)run({type:'expand',parcelId:land.purchasableParcels(s)[0],expectedCost:land.extensionPrice(s)});
 for(const species of balance.SHOP_SPECIES.filter(id=>!s.discovered.includes(id)&&rights.stateLevelAccess(s,{family:'species',id,action:'purchase'}).accessible)){if(s.pattes<balance.SPECIES[species].price+500)continue;const dest=home(species);if(dest)run({type:'buyRabbit',species,enclosureId:dest.id});}
 if(s.buildings.filter(b=>b.kind==='farm').length<2&&s.pattes>200)build('farm');
 if(day>=1&&!s.buildings.some(b=>b.kind==='kitchen')&&s.pattes>1000)build('kitchen');
 for(let n=0;n<8;n++){const rabbit=s.rabbits.filter(r=>r.affection<20&&s.grass>=2*r.affection).sort((a,b)=>a.affection-b.affection)[0];if(!rabbit)break;run({type:'feed',id:rabbit.id});}claim();
 if(!s.buildings.some(b=>b.breeding)){const parents=s.rabbits.filter(r=>r.affection>=2);let best=null,bestScore=-Infinity;for(let a=0;a<parents.length;a++)for(let b=a+1;b<parents.length;b++){const p=breeding.breedingPool(s,parents[a].species,parents[b].species,parents[a].affection,parents[b].affection);if(!p.total)continue;const chance=Object.entries(p.weights).filter(([id])=>!s.discovered.includes(id)).reduce((a,[,v])=>a+v,0)/p.total;const score=chance+(p.eligible?0.001:0);if(score>bestScore){bestScore=score;best=[parents[a].id,parents[b].id];}}if(best)run({type:'breed',parents:best});}
 for(const b of s.buildings.filter(b=>b.kind==='farm'&&!b.order)){const recipe=hour===12?'night':'large';run({type:'startOrder',id:b.id,recipe});}
 // One optional model/day, only for the main decoration mission. Never buy/sell for XP.
 if(!s.missions.claimed.includes('first-decoration')&&s.pattes>500){const catalogId=dec.DECORATION_IDS[0];outer:for(let y=32;y<48;y++)for(let x=0;x<16;x++)if(run({type:'buyDecoration',catalogId,location:{kind:'outside',x,y,rotation:0}}))break outer;}
 claim();
 }
 if([1,3,7,20,50].includes(day+1))snapshot(`${day+1} j`,(day+1)*24*H-1);
}
const calendarMilestones=Object.fromEntries(Object.entries(milestones).map(([n,d])=>[n,Math.floor(d)+1]));
// Owner target (25 October 2026): level 22 in about 20 days, within 15 %.
if(Math.abs(calendarMilestones[22]-20)>3)throw Error(`Pacing: level 22 on day ${calendarMilestones[22]}, target 20`);
const report={calendarMilestones,method:'Seed 20261025; real act/advance; 3 sessions/day at 08/13/20, <=45 commands and <=8 meals/session; two farms, long/long/night; collection-first parent pairs; no Cuisine or paid recipes; Hearts only for permanent habitat upgrades. Day snapshots just before next 08:00. Tutorial is the first session.',curve:(await import('../src/config/progression.ts')).PROGRESSION.curve,tutorial,milestones,rows,actions:counts,totalActions};
writeFileSync(new URL('./progression-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
