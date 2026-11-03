import './node-typescript-loader.mjs';
const sim=await import('../src/simulation/index.ts'), prog=await import('../src/simulation/progression.ts'), missions=await import('../src/simulation/missions.ts'), land=await import('../src/config/land.ts'), placement=await import('../src/simulation/placement.ts'), hab=await import('../src/simulation/habitats.ts'), balance=await import('../src/config/balance.ts'), breeding=await import('../src/simulation/breeding.ts'), rights=await import('../src/simulation/levelRights.ts'), dec=await import('../src/config/decorations.ts'); const market=await import('../src/simulation/market.ts'); const affection=await import('../src/simulation/affection.ts'); const care=await import('../src/simulation/care.ts');
const {writeFileSync}=await import('node:fs');
const H=3600000, MIN=60000;
// First session starts at 08:00. Offsets 0, 5h, 12h then 24h give 08/13/20, including a 12h night.
// At most 45 successful commands/session (about 6 seconds/command); eight meals maximum.
// Collection first: diversify parents, keep at least one of every species, release low-affection duplicates
// when a home is full. Buy the second farm early; no Cuisine rewards or paid recipes; Hearts for permanent farm, agency and habitat upgrades.
// The normal course is retained for existing centre-start games. This option only reports its tutorial.
const normalTutorial=process.argv.includes('--normal-tutorial');
// `--no-care`: the same player without the Salon de soins and the picnic, for comparison (results are not written).
const noCare=process.argv.includes('--no-care');
// `--seed=N`: the same player with another random seed, to check that a result is not luck (results are not written).
const seedArg=process.argv.find(a=>a.startsWith('--seed='));
let salonDay=null;const reach20={},reach50={};
let s=normalTutorial?(await import('../src/state/initial.ts')).createCentreStartGame(0):sim.createGame(0),now=0,seed=seedArg?Number(seedArg.slice(7)):20261025,used=0,totalActions=0,statueDay=null,secondStatueDay=null;
if(normalTutorial){s.grass=10;delete s.startCourse;delete s.levelAccessTransition;s.buildings[0].habitat.type='universal';s.rabbits.push({id:'rabbit-3',species:'neige',affection:1,enclosureId:'building-1'});s.discovered.push('neige');s.missions=missions.createMissions(s,0);}
const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const milestones={},rows=[],counts={};
let tutorialFinalMission;
const level=()=>prog.progressionFromXp(s.progression.totalXp).level;
// Save Hearts two levels ahead for the next statue (60 Hearts at level 15, 100 at level 22), while keeping six for the next permanent purchase.
const statueReserve=()=>{const next=affection.nextAffectionStatue(s);return next&&level()>=next.level-2?next.heartPrice+6:0;};
// Economy ledger (3 November 2026): Hearts, pattes, food and XP gained or spent per source, by band of days (reported per day).
const BANDS=[[1,10],[11,20],[21,30],[31,45],[46,60],[61,70]],ledger={};
const bandOf=()=>{const d=Math.floor(now/(24*H))+1;const b=BANDS.find(([a,z])=>d>=a&&d<=z);return b?`${b[0]}-${b[1]}`:null;};
const ledgerKey=c=>c.type==='exchangeForHeart'?`exchange:${c.resource}`:c.type==='buyBuilding'?`buyBuilding:${c.kind}`:c.type==='upgradeFarm'?`upgradeFarm:${c.toLevel??2}`:c.type==='startCare'?`startCare:${c.care}`:c.type;
function book(c,before){const band=bandOf();if(!band)return;const e=ledger[band]??={pattes:{},hearts:{},grass:{},xp:{},heartsStock:[],pattesStock:[],grassStock:[]};const k=ledgerKey(c);
 for(const [res,v] of [['pattes',s.pattes-before.pattes],['hearts',s.hearts-before.hearts],['grass',s.grass-before.grass],['xp',s.progression.totalXp-before.xp]])if(v)e[res][k]=(e[res][k]??0)+v;}
// Pattes goal (3 November 2026): the player saves for the next planned coin purchase before Paille's counter takes the surplus:
// the Salon de soins, the next island extension his level allows, then each farm's level 3.
function pattesGoal(){const lv=level();
 if(!noCare&&lv>=balance.SALON.unlockLevel&&!s.buildings.some(b=>b.kind==='salon'))return balance.BALANCE.buildings.salon.price+500;
 const rank=s.acquiredParcels.length;if(rank<=8&&lv>=prog.requiredExtensionLevel(rank))return land.extensionPrice(s)+800;
 if(lv>=balance.FARM_UPGRADES[3].level&&s.buildings.some(b=>b.kind==='farm'&&b.farmLevel===2))return balance.FARM_UPGRADES[3].pattes+3000;
 return 0;}
// While Hearts are short for the next statue (statueReserve), the counter may take pattes down to 3 000: the statue comes first.
const heartsShort=()=>s.hearts<statueReserve();
// Food kept for a wall (29 → 30, 49 → 50): the most loved rabbit stopped only by food at a wall gets the food first.
function wallReserve(){const r=s.rabbits.filter(r=>balance.isAffectionWall(r.affection)&&r.affection<affection.affectionCap(s)&&!care.atSalon(s,r.id)).sort((a,b)=>b.affection-a.affection)[0];return r&&r.affection>=20?{id:r.id,cost:balance.feedCost(r.affection)}:null;}
function run(c,mandatory=false){if(used>=45)return false;const before={pattes:s.pattes,hearts:s.hearts,grass:s.grass,xp:s.progression.totalXp};const r=sim.act(s,c,now,rng);if(!r.ok){if(mandatory)throw Error(JSON.stringify({c,reason:r.reason}));return false;}s=r.state;book(c,before);used++;totalActions++;counts[c.type]=(counts[c.type]??0)+1;if(c.type==='claimMainMission'&&c.id==='first-birth')tutorialFinalMission={pattes:s.pattes,grass:s.grass,hearts:s.hearts,level:level(),xp:s.progression.totalXp};for(const n of [5,10,15,20,22,25,30])if(level()>=n&&milestones[n]===undefined)milestones[n]=Number((now/(24*H)).toFixed(3));return true;}
function claim(){for(let i=0;i<20;i++){const id=missions.activeMainMissions(s).find(id=>!s.missions.claimed.includes(id)&&s.missions.completed.includes(id));if(!id||!run({type:'claimMainMission',id}))break;}for(const id of balance.DAILY_MISSION_IDS??['collect-pattes','collect-grass','gain-affection']){if(s.missions.daily.progress[id]>0)run({type:'claimDailyMission',id,cycleStart:missions.dailyCycleStart(s)});}run({type:'claimDailyBonus',cycleStart:missions.dailyCycleStart(s)});}
function spot(){for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(!placement.buildingPlacementReason(s,x,y))return{x,y};return null;}
function build(kind,habitatType){const pos=spot();return pos&&run({type:'buyBuilding',kind,...pos,...(habitatType?{habitatType}:{})});}
const room=species=>s.buildings.find(b=>!hab.habitatEntryReason(s,b,species));
function home(species){if(room(species))return room(species);for(const b of s.buildings.filter(b=>hab.habitatAccepts(b,species)&&b.habitat.level<3&&(b.habitat.level<2||s.hearts>=statueReserve()+10)))if(run({type:'upgradeHabitat',id:b.id,fromLevel:b.habitat.level})&&room(species))return room(species);
 const duplicate=s.rabbits.filter(r=>hab.habitatAccepts(s.buildings.find(b=>b.id===r.enclosureId),species)&&s.rabbits.filter(other=>other.species===r.species).length>1).sort((a,b)=>a.affection-b.affection).find(r=>!breeding.nestForParent(s,r.id));if(duplicate)run({type:'release',id:duplicate.id});if(room(species))return room(species);
 build('enclosure',balance.SPECIES[species].types[0]);return room(species);}
// Exact Paille guide, three free one-shot aids, manual harvest/transfer/welcome and rewards.
if(!normalTutorial){build('enclosure','neige');claim();run({type:'buyRabbit',species:'neige',enclosureId:room('neige').id},true);claim();}
build('farm');claim();const farm=s.buildings.find(b=>b.kind==='farm');run({type:'startOrder',id:farm.id,recipe:'foin'},true);
run({type:'initiationAid',id:farm.id,stage:'order',jobKey:s.initiation.order},true);run({type:'collectOrder',id:farm.id},true);claim();
for(const r of [...s.rabbits]){run({type:'feed',id:r.id},true);claim();}
run({type:'breed',parents:s.rabbits.map(r=>r.id)},true);claim();
run({type:'initiationAid',id:'building-4',stage:'breeding',jobKey:s.initiation.breeding},true);run({type:'transferBirth',id:'building-4',birthId:s.initiation.birthId},true);claim();
run({type:'initiationAid',id:'building-5',stage:'growth',jobKey:s.initiation.growth,birthId:s.initiation.birthId},true);const baby=s.buildings.find(b=>b.kind==='nursery').nursery.babies[0];run({type:'welcome',birthId:baby.birth.id,enclosureId:room(baby.birth.species).id},true);claim();
const tutorial={pattes:s.pattes,grass:s.grass,hearts:s.hearts,level:level(),xp:s.progression.totalXp};
if(normalTutorial){console.log(JSON.stringify({course:'normal',tutorialFinalMission,tutorial},null,2));process.exit(0);}
function remaining(){return {commons:balance.SHOP_SPECIES.filter(id=>!s.discovered.includes(id)),extensions:8-(s.acquiredParcels.length-1),extensionCost:land.EXTENSION_PRICES.slice(s.acquiredParcels.length-1).reduce((a,b)=>a+b,0),farms:2-s.buildings.filter(b=>b.kind==='farm').length,kitchen:!s.buildings.some(b=>b.kind==='kitchen'),habitatUpgrades:s.buildings.filter(b=>b.habitat&&b.habitat.level<3).length,paidRecipes:balance.SPECIES_IDS.filter(id=>balance.SPECIES[id].acquisition.some(a=>a.kind==='recipe'&&a.knowledgePrice!==undefined)&&!s.recipeBook.includes(id)&&!s.discovered.includes(id))};}
function decorationBudget(){const missing=dec.DECORATION_IDS.filter(id=>!s.decorations.some(d=>d.catalogId===id));return {models:missing.length,pattes:missing.reduce((sum,id)=>sum+(dec.DECORATIONS[id].heartPrice?0:dec.DECORATIONS[id].price),0),hearts:missing.reduce((sum,id)=>sum+(dec.DECORATIONS[id].heartPrice??0),0)};}
const affectionSpread=v=>({'≥10':v.rabbits.filter(r=>r.affection>=10).length,'≥15':v.rabbits.filter(r=>r.affection>=15).length,'≥30':v.rabbits.filter(r=>r.affection>=30).length,max:Math.max(...v.rabbits.map(r=>r.affection)),rabbits:v.rabbits.length});
function snapshot(label,t){const v=sim.advance(s,t);rows.push({step:label,affectionById:Object.fromEntries(v.rabbits.map(r=>[r.id,r.affection])),pattes:v.pattes,grass:v.grass,hearts:v.hearts,level:level(),species:v.discovered.length,affection:affectionSpread(v),speciesIds:[...v.discovered],storedPattes:Math.floor(v.buildings.reduce((a,b)=>a+b.incomeUnits,0)/H),remaining:remaining(),decorationBudget:decorationBudget(),mainMissionsClaimed:[...s.missions.claimed]});}
snapshot('10 min',10*MIN);
for(let day=0;day<70;day++){
 for(const hour of [0,5,12]){if(day===0&&hour===0)continue;now=(day*24+hour)*H;s=sim.advance(s,now);used=0;
 for(const b of s.buildings.filter(b=>b.kind==='enclosure'))run({type:'collectIncome',id:b.id});
 for(const b of s.buildings.filter(b=>b.order&&b.order.endsAt<=now))run({type:'collectOrder',id:b.id});
 run({type:'claimHearts'});claim();
 for(const b of s.buildings.filter(b=>b.kind==='farm'&&!b.farmLevel))if(s.hearts>=statueReserve()+30)run({type:'upgradeFarm',id:b.id});
 // Farm level 3 (60 000 pattes, level 20) once the pattes reserve of Paille's counter is kept as well.
 for(const b of s.buildings.filter(b=>b.kind==='farm'&&b.farmLevel===2))if(level()>=balance.FARM_UPGRADES[3].level&&s.pattes>=balance.FARM_UPGRADES[3].pattes+3000)run({type:'upgradeFarm',id:b.id,toLevel:3});
 for(const b of s.buildings.filter(b=>b.kind==='agency'&&(b.agencyLevel??1)<3))if(s.hearts>=statueReserve()+((b.agencyLevel??1)===1?40:120))run({type:'upgradeAgency',id:b.id,fromLevel:b.agencyLevel??1});

 // Salon de soins (5 000 pattes, level 12): welcome back the rabbit in care, buy the salon once 5 500 pattes are in hand.
 if(!noCare){
  if(s.care&&s.care.endsAt<=now)run({type:'claimCare',rabbitId:s.care.rabbitId});
  if(!s.buildings.some(b=>b.kind==='salon')&&level()>=balance.SALON.unlockLevel&&s.pattes>=balance.BALANCE.buildings.salon.price+500&&build('salon')&&salonDay===null)salonDay=Number((now/(24*H)).toFixed(3));
 }
 for(const b of s.buildings.filter(b=>b.nursery))for(const baby of [...b.nursery.babies].filter(b=>b.readyAt<=now)){const dest=home(baby.birth.species);if(dest)run({type:'welcome',birthId:baby.birth.id,enclosureId:dest.id});}
 const nest=s.buildings.find(b=>b.kind==='nest');if(nest.breeding?.endsAt<=now)run({type:'transferBirth',id:nest.id,birthId:nest.breeding.birth.id});claim();
 if(s.acquiredParcels.length<9&&s.pattes>=land.extensionPrice(s)+800)run({type:'expand',parcelId:land.purchasableParcels(s)[0],expectedCost:land.extensionPrice(s)});
 for(const species of balance.SHOP_SPECIES.filter(id=>!s.discovered.includes(id)&&rights.stateLevelAccess(s,{family:'species',id,action:'purchase'}).accessible)){if(s.pattes<balance.SPECIES[species].price+500)continue;const dest=home(species);if(dest)run({type:'buyRabbit',species,enclosureId:dest.id});}
 if(s.buildings.filter(b=>b.kind==='farm').length<2&&s.pattes>200)build('farm');
 if(day>=1&&!s.buildings.some(b=>b.kind==='kitchen')&&s.pattes>1000)build('kitchen');
 // The statues open affection 15+ (60 Hearts, level 15) and 31+ (100 Hearts, level 22), with six kept in reserve, no coin payment.
 {const next=affection.nextAffectionStatue(s),first=!s.buildings.some(b=>b.kind==='statue');if(next&&affection.playerLevel(s)>=next.level&&s.hearts>=next.heartPrice+6&&build('statue')){const day=Number((now/(24*H)).toFixed(3));if(first)statueDay=day;else secondStatueDay=day;}}
 // Meals: every rabbit to affection 2 (a parent) first, then the food goes to the most loved rabbits, pushing them toward 10 and 15.
 // One care per session, before the meals: the most loved rabbit that may receive today's gift. Every care is back before the next
 // visit (5, 7 or 12 hours later); the player takes the massage (dearest, most XP) when 3 000 pattes stay in hand, else the bath.
 if(!noCare&&s.buildings.some(b=>b.kind==='salon')&&!s.care){const r=s.rabbits.filter(r=>!care.rabbitAwayReason(s,r.id)&&!care.giftReason(s,r,now)).sort((a,b)=>b.affection-a.affection)[0];const kind=r&&(s.pattes>=balance.carePrice(r.species,'massage')+3000?'massage':s.pattes>=balance.carePrice(r.species,'bath')+500?'bath':null);if(kind)run({type:'startCare',rabbitId:r.id,care:kind});}
 // One picnic a day (level 8), in the enclosure where the most rabbits gain, at the first session that can afford it.
 if(!noCare&&s.picnicCycle!==s.missions.daily.cycleIndex){const best=s.buildings.filter(b=>b.kind==='enclosure').map(b=>care.picnicQuote(s,b.id,now,level())).filter(q=>!q.reason&&s.pattes>=q.price+500).sort((a,b)=>b.winners.length-a.winners.length||a.price-b.price)[0];if(best)run({type:'picnic',enclosureId:best.guests[0].enclosureId,expectedCost:best.price});}
 for(let n=0;n<8;n++){const wall=wallReserve(),fed=s.rabbits.filter(r=>!affection.feedReason(s,r.affection)&&(!wall||r.id===wall.id||s.grass-balance.feedCost(r.affection)>=wall.cost));const rabbit=fed.filter(r=>r.affection<2)[0]??fed.sort((a,b)=>b.affection-a.affection)[0];if(!rabbit)break;run({type:'feed',id:rabbit.id});}claim();
 if(!s.buildings.some(b=>b.breeding)){const parents=s.rabbits.filter(r=>r.affection>=2);let best=null,bestScore=-Infinity;for(let a=0;a<parents.length;a++)for(let b=a+1;b<parents.length;b++){const p=breeding.breedingPool(s,parents[a].species,parents[b].species,parents[a].affection,parents[b].affection);if(!p.total)continue;const chance=Object.entries(p.weights).filter(([id])=>!s.discovered.includes(id)).reduce((a,[,v])=>a+v,0)/p.total;const score=chance+(p.eligible?0.001:0);if(score>bestScore){bestScore=score;best=[parents[a].id,parents[b].id];}}if(best)run({type:'breed',parents:best});}
 // The best-liked crop that is unlocked, affordable and ripe by the next visit (gaps of 5, 7 and 12 hours).
 const gap=({0:5,5:7,12:12})[hour]*H;
 for(const b of s.buildings.filter(b=>b.kind==='farm'&&!b.order)){const recipe=Object.keys(balance.ORDERS).filter(id=>{const c=balance.ORDERS[id];return (b.farmLevel??1)>=balance.orderFarmLevel(id)&&c.duration<=gap&&c.level<=level()&&c.cost<=s.pattes;}).at(-1);if(recipe)run({type:'startOrder',id:b.id,recipe});}
 // One optional model/day, only for the main decoration mission. Never buy/sell for XP.
 if(!s.missions.claimed.includes('first-decoration')&&s.pattes>500){const catalogId=dec.DECORATION_IDS[0];outer:for(let y=32;y<48;y++)for(let x=0;x<16;x++)if(run({type:'buyDecoration',catalogId,location:{kind:'outside',x,y,rotation:0}}))break outer;}
 // Paille's counter: exchange only the surplus for Hearts. Pattes: keep the coin goal (pattesGoal), or 3 000 while Hearts are short
 // for a statue; food: keep 6 000, plus the meal of a rabbit waiting at a wall.
 if(market.marketUnlocked(s))for(const [resource,reserve] of [['pattes',heartsShort()?3000:Math.max(3000,pattesGoal())],['grass',6000+(wallReserve()?.cost??0)]]){for(let price=market.marketPrice(s,resource);price!==null&&s[resource]-price>=reserve;price=market.marketPrice(s,resource))if(!run({type:'exchangeForHeart',resource,expectedCost:price}))break;}
 claim();
 {const band=bandOf();if(band){const e=ledger[band];if(e){e.heartsStock.push(s.hearts);e.pattesStock.push(s.pattes);e.grassStock.push(s.grass);}}}
 const today=Number((now/(24*H)).toFixed(3));for(const r of s.rabbits){if(r.affection>=20&&reach20[r.id]===undefined)reach20[r.id]=today;if(r.affection>=50&&reach50[r.id]===undefined)reach50[r.id]=today;}
 }
 if([1,3,7,20,30,50,60].includes(day+1))snapshot(`${day+1} j`,(day+1)*24*H-1);
}
const calendarMilestones=Object.fromEntries(Object.entries(milestones).map(([n,d])=>[n,Math.floor(d)+1]));
// The first rabbit to reach affection 20: how long it takes to reach 50 (or where it stands on day 60).
const focusId=Object.entries(reach20).sort((a,b)=>a[1]-b[1])[0]?.[0],focus=s.rabbits.find(r=>r.id===focusId);
const affection20to50=focus?{rabbit:focus.id,species:focus.species,day20:reach20[focusId],day50:reach50[focusId]??null,days:reach50[focusId]!==undefined?Number((reach50[focusId]-reach20[focusId]).toFixed(3)):null,affectionDay60:rows.find(r=>r.step==='60 j')?.affectionById?.[focusId]??null,finalAffection:focus.affection}:null;
const fastest50=Object.keys(reach50).map(id=>reach50[id]-(reach20[id]??0)).sort((a,b)=>a-b)[0]??null;
const round=v=>Math.round(v);
const economy=Object.fromEntries(Object.entries(ledger).map(([band,e])=>{const [a,z]=band.split('-').map(Number),days=z-a+1;
 const split=o=>{const gain={},spend={};for(const [k,v] of Object.entries(o))(v>0?gain:spend)[k]=round(Math.abs(v)/days);return {gainPerDay:gain,spendPerDay:spend,netPerDay:round(Object.values(o).reduce((x,y)=>x+y,0)/days)};};
 const avg=a=>a.length?round(a.reduce((x,y)=>x+y,0)/a.length):null;
 return [band,{pattes:split(e.pattes),hearts:split(e.hearts),grass:split(e.grass),xp:split(e.xp),counterPattesPerDay:round(-(e.pattes['exchange:pattes']??0)/days),stock:{heartsAverage:avg(e.heartsStock),heartsEnd:e.heartsStock.at(-1),pattesAverage:avg(e.pattesStock),grassAverage:avg(e.grassStock)}}];}));
const report={economy,calendarMilestones,statueDay,secondStatueDay,salonDay,affection20to50,fastest20to50:fastest50===null?null:Number(fastest50.toFixed(3)),method:'Seed 20261025; real act/advance; 3 sessions/day at 08/13/20, <=45 commands and <=8 meals/session; two farms, each sowing the best-liked unlocked crop ripe by the next visit; each farm goes to level 3 (fancy crops) from player level 20 once 63 000 pattes are in hand; pattes saved for the next coin goal (salon, next extension allowed by the level, farm level 3) before the counter, except while Hearts are short for a statue; save Hearts two levels ahead for each statue (60 Hearts at level 15, 100 at level 22) plus six in reserve; food kept for the most loved rabbit waiting at a wall (29 -> 30, 49 -> 50); collection-first parent pairs; no Cuisine or paid recipes; Salon de soins bought at level 12 with 5 500 pattes in hand, one care per session for the most loved rabbit that may receive a gift (massage with 3 000 pattes left in hand, else bath), one picnic a day in the enclosure where the most rabbits gain (500 pattes kept); Hearts for permanent farm, agency and habitat upgrades after the statue reserve. Counter reserves: the coin goal (or 3000 coins while Hearts are short for a statue) and 6000 food plus a waiting wall meal. Day snapshots just before next 08:00. Tutorial is the first session.',curve:(await import('../src/config/progression.ts')).PROGRESSION.curve,tutorialFinalMission,tutorial,milestones,rows,actions:counts,totalActions};
if(!noCare&&!seedArg)writeFileSync(new URL('./progression-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
// Owner target (25 October 2026): level 22 in about 20 days, within 15 %.
if(!Number.isFinite(calendarMilestones[22])||Math.abs(calendarMilestones[22]-20)>3)throw Error(`Pacing: level 22 on day ${calendarMilestones[22]}, target 20`);
