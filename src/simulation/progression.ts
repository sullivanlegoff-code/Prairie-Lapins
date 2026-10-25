import {BALANCE, SPECIES, SPECIES_IDS, type SpeciesId} from '../config/balance';
import {DECORATIONS, DECORATION_IDS, type DecorationId} from '../config/decorations';
import {HABITAT_TYPES, type HabitatType, type HabitatLevel} from '../config/habitats';
import {PARCEL_IDS} from '../config/land';
import {MAIN_MISSION_IDS, DAILY_MISSION_IDS, type MainMissionId, type DailyMissionId} from '../config/missions';
import {PROGRESSION, LEVEL_ACCESS_FAMILIES, type ProgressionConfig} from '../config/progression';

export interface PlayerProgression {
  readonly totalXp: number;
  readonly level: number;
  /** At the maximum this is the surplus above that level's cumulative threshold. */
  readonly xpInLevel: number;
  readonly xpRequired: number | null;
  readonly progress: number;
  readonly maximum: boolean;
}
function integer(value: number, label: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${label}: expected a safe integer >= ${minimum}`);
}
function cost(level: number, c: ProgressionConfig): number {
  const value = Math.round(c.curve.base * level ** c.curve.exponent);
  integer(value, 'Level cost', 1); return value;
}
function sum(a: number, b: number): number {
  const value = a + b; integer(value, 'XP sum'); return value;
}
function threshold(level: number, c: ProgressionConfig): number {
  // Sum equal rounded-cost ranges together. No array indexed by the configurable maximum.
  const range=(first:number,last:number):number=>{
    if(first>last)return 0;
    const low=cost(first,c),high=cost(last,c),count=last-first+1;
    integer(count*low,'Minimum cumulative XP');
    if(low===high)return count*low;
    const middle=first+Math.floor((last-first)/2);
    return sum(range(first,middle),range(middle+1,last));
  };
  return range(1,level-1);
}
function habitatRequirement(type: HabitatType, c: ProgressionConfig): number {
  return type === 'universal' ? c.requirements.universalHabitat : c.requirements.species[c.requirements.habitatCommons[type]];
}
/** Validate all curve, gain and requirement values without mutating or freezing the caller's configuration. */
export function validateProgressionConfig(c: ProgressionConfig = PROGRESSION): void {
  if (!c.activeLevelFamilies || Object.keys(c.activeLevelFamilies).length !== LEVEL_ACCESS_FAMILIES.length || LEVEL_ACCESS_FAMILIES.some(family => typeof c.activeLevelFamilies[family] !== 'boolean')) throw new RangeError('Invalid level family activation registry');
  if (c.curve.initialLevel !== 1) throw new RangeError('Initial level must be 1');
  integer(c.curve.maximumLevel, 'Maximum level', 1);
  if (!Number.isFinite(c.curve.base) || c.curve.base <= 0) throw new RangeError('Curve base must be finite and positive');
  if (!Number.isFinite(c.curve.exponent) || c.curve.exponent < 0) throw new RangeError('Curve exponent must be finite and nonnegative');
  // Every transition costs at least base. Reject certain overflow before iterating.
  integer((c.curve.maximumLevel - 1) * cost(1,c), 'Minimum cumulative XP');
  threshold(c.curve.maximumLevel, c); // Every cost > 0 and every cumulative sum safe: thresholds strictly increase.
  const x=c.xp, r=c.requirements;
  for (const amount of [c.rewards.heartsPerLevel, x.commonPurchase, x.discovery.common, x.discovery.rare, x.construction.specializedHabitat, x.construction.universalHabitat, x.construction.farm, ...[...new Set(SPECIES_IDS.map(id=>SPECIES[id].rarity))].map(rarity=>x.birth[rarity]),
    x.foodMultiplier, x.breedingLaunch, x.firstDecorationPlacement.minimum, x.claims.main, x.claims.daily, x.claims.dailyBonus]) integer(amount,'XP/reward amount');
  integer(x.foodMultiplier * BALANCE.maxAffection,'Maximum food XP');
  integer(x.firstDecorationPlacement.priceDivisor,'Decoration price divisor',1);
  for (const [exceptions, ids] of [[x.claims.mainExceptions, MAIN_MISSION_IDS], [x.claims.dailyExceptions, DAILY_MISSION_IDS]] as const) {
    for (const [id, amount] of Object.entries(exceptions)) {
      if (!(ids as readonly string[]).includes(id)) throw new RangeError(`Unknown mission exception: ${id}`);
      integer(amount,'Mission exception');
    }
  }
  const required=(level:number)=>{integer(level,'Required level',1);if(level>c.curve.maximumLevel)throw new RangeError('Required level exceeds maximum');};
  if(Object.keys(r.species).length!==SPECIES_IDS.length || Object.keys(r.species).some(id=>!(SPECIES_IDS as readonly string[]).includes(id))) throw new RangeError('Species requirements must match existing IDs');
  for(const id of SPECIES_IDS) required(r.species[id]);
  for(const kind of ['farm','nest','nursery'] as const) required(r.buildings[kind]);
  required(r.universalHabitat);
  for(const level of Object.values(r.habitatUpgradeOffsets)) integer(level,'Habitat upgrade offset');
  if(Object.keys(r.habitatCommons).length!==HABITAT_TYPES.length-1)throw new RangeError('Specialized habitat mapping is incomplete');
  for(const type of HABITAT_TYPES.filter(type=>type!=='universal')) {
    const common=r.habitatCommons[type];
    if(!SPECIES_IDS.includes(common)||SPECIES[common].rarity!=='common'||!SPECIES[common].types.includes(type))throw new RangeError('Invalid habitat/common mapping');
  }
  for(const type of HABITAT_TYPES) for(const level of [2,3] as const) required(habitatRequirement(type,c)+r.habitatUpgradeOffsets[level]);
  if(!r.decorations.length || r.decorations[0].minimumPrice!==0)throw new RangeError('Decoration tiers must start at zero');
  let previous=-1;
  for(const tier of r.decorations){integer(tier.minimumPrice,'Decoration tier');if(tier.minimumPrice<=previous)throw new RangeError('Decoration tiers must increase');previous=tier.minimumPrice;required(tier.level);}
  if(r.extensions.length!==PARCEL_IDS.length-1)throw new RangeError('Extension requirements must cover all eight purchases');
  r.extensions.forEach(required);
  for(const id of DECORATION_IDS) if(DECORATIONS[id].level !== undefined) required(DECORATIONS[id].level!);
  for(const id of DECORATION_IDS) integer(Math.max(x.firstDecorationPlacement.minimum,Math.round(DECORATIONS[id].price/x.firstDecorationPlacement.priceDivisor)),'Decoration XP');
}
// Production configuration is immutable and checked once; caller-owned test configurations remain validated per query.
function freezeConfig(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeConfig(child);
    Object.freeze(value);
  }
}
validateProgressionConfig(PROGRESSION);
freezeConfig(PROGRESSION);
function validateQueryConfig(c: ProgressionConfig): void { if (c !== PROGRESSION) validateProgressionConfig(c); }
function levelInput(level:number,c:ProgressionConfig):void {
  integer(level,'Level',1);if(level>c.curve.maximumLevel)throw new RangeError('Level exceeds maximum');
}
export function nextLevelCost(level:number,c:ProgressionConfig=PROGRESSION):number|null {
  validateQueryConfig(c);levelInput(level,c);return level===c.curve.maximumLevel?null:cost(level,c);
}
export function cumulativeLevelXp(level:number,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);levelInput(level,c);return threshold(level,c);
}
function progression(totalXp:number,c:ProgressionConfig):PlayerProgression {
  // Search cumulative thresholds, retaining all surplus; no saved/independent level.
  let low=1, high=c.curve.maximumLevel;
  while(low<high){const middle=low+Math.ceil((high-low)/2);if(threshold(middle,c)<=totalXp)low=middle;else high=middle-1;}
  const level=low, xpInLevel=totalXp-threshold(level,c), maximum=level===c.curve.maximumLevel;
  const xpRequired=maximum?null:cost(level,c);
  return {totalXp,level,xpInLevel,xpRequired,progress:xpRequired===null?1:xpInLevel/xpRequired,maximum};
}
export function progressionFromXp(totalXp:number,c:ProgressionConfig=PROGRESSION):PlayerProgression {
  integer(totalXp,'Total XP');validateQueryConfig(c);return progression(totalXp,c);
}
export function addXp(totalXp:number,amount:number,c:ProgressionConfig=PROGRESSION):{progression:PlayerProgression;crossedLevels:number[]} {
  integer(totalXp,'Total XP');integer(amount,'Added XP');const next=sum(totalXp,amount);
  validateQueryConfig(c);const before=progression(totalXp,c), after=progression(next,c), crossedLevels:number[]=[];
  for(let level=before.level+1;level<=after.level;level++)crossedLevels.push(level);
  return {progression:after,crossedLevels};
}
/** Configuration queries only: these are not purchase permissions. */
export function requiredSpeciesLevel(id:SpeciesId,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);if(!SPECIES_IDS.includes(id))throw new RangeError('Unknown species');return c.requirements.species[id];
}
export function requiredHabitatLevel(type:HabitatType,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);if(!HABITAT_TYPES.includes(type))throw new RangeError('Unknown habitat');return habitatRequirement(type,c);
}
export function requiredHabitatUpgradeLevel(type:HabitatType,to:Exclude<HabitatLevel,1>,c:ProgressionConfig=PROGRESSION):number {
  const base=requiredHabitatLevel(type,c);if(to!==2&&to!==3)throw new RangeError('Upgrade target must be 2 or 3');return base+c.requirements.habitatUpgradeOffsets[to];
}
export function requiredDecorationLevel(id:DecorationId,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);if(!DECORATION_IDS.includes(id))throw new RangeError('Unknown decoration');
  if(DECORATIONS[id].level !== undefined) return DECORATIONS[id].level!;
  const price=DECORATIONS[id].price;return c.requirements.decorations.filter(t=>price>=t.minimumPrice).at(-1)!.level;
}
export function requiredExtensionLevel(purchaseRank:number,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);integer(purchaseRank,'Extension purchase rank',1);if(purchaseRank>c.requirements.extensions.length)throw new RangeError('Extension rank out of range');return c.requirements.extensions[purchaseRank-1];
}
export function foodXp(affectionReached:number,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);integer(affectionReached,'Reached affection');if(affectionReached>BALANCE.maxAffection)throw new RangeError('Affection exceeds existing maximum');return c.xp.foodMultiplier;
}
export function firstDecorationPlacementXp(id:DecorationId,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);if(!DECORATION_IDS.includes(id))throw new RangeError('Unknown decoration');return c.xp.firstDecorationPlacement.minimum;
}
export function missionClaimXp(kind:'main'|'daily',id:MainMissionId|DailyMissionId,c:ProgressionConfig=PROGRESSION):number {
  validateQueryConfig(c);const ids=kind==='main'?MAIN_MISSION_IDS:DAILY_MISSION_IDS;
  if(!(ids as readonly string[]).includes(id))throw new RangeError('Unknown mission for this category');
  return kind==='main'?(c.xp.claims.mainExceptions[id as MainMissionId]??c.xp.claims.main):(c.xp.claims.dailyExceptions[id as DailyMissionId]??c.xp.claims.daily);
}
