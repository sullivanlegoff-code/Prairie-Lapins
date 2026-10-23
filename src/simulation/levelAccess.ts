import {PROGRESSION, type ProgressionConfig} from '../config/progression';
import type {SpeciesId} from '../config/balance';
import type {HabitatType} from '../config/habitats';
import type {DecorationId} from '../config/decorations';
import {PURCHASE_UNLOCK_IDS, type PurchaseUnlockId} from '../config/purchaseUnlocks';
import {progressionFromXp, requiredSpeciesLevel, requiredHabitatLevel, requiredHabitatUpgradeLevel, requiredDecorationLevel, requiredExtensionLevel} from './progression';

/** Operations are distinct identities, not a decision to activate breeding/welcome gates. */
export type LevelAccessTarget =
  | {family: 'species'; id: SpeciesId; action: 'purchase' | 'welcome' | 'breedingResult'}
  | {family: 'habitatPurchase'; id: HabitatType}
  | {family: 'habitatUpgrade'; id: HabitatType; toLevel: 2 | 3}
  | {family: 'decoration'; id: DecorationId}
  | {family: 'extension'; rank: number};
export interface HistoricalLevelRight {readonly target: LevelAccessTarget; readonly source: string}
export interface LevelAccess {
  readonly target: LevelAccessTarget;
  readonly currentLevel: number;
  readonly requiredLevel: number;
  readonly activated: boolean;
  readonly meetsLevel: boolean;
  /** This checks ONLY the level gate. Callers must retain all other validations. */
  readonly accessible: boolean;
  readonly locked: boolean;
  readonly historicalException: HistoricalLevelRight | null;
}
function requirement(target: LevelAccessTarget, c: ProgressionConfig): number {
  switch (target.family) {
    case 'species':
      if (!['purchase', 'welcome', 'breedingResult'].includes(target.action)) throw new RangeError('Invalid species operation');
      return requiredSpeciesLevel(target.id, c);
    case 'habitatPurchase': return requiredHabitatLevel(target.id, c);
    case 'habitatUpgrade': return requiredHabitatUpgradeLevel(target.id, target.toLevel, c);
    case 'decoration': return requiredDecorationLevel(target.id, c);
    case 'extension': return requiredExtensionLevel(target.rank, c);
    default: throw new RangeError('Unknown level access family');
  }
}
function key(target: LevelAccessTarget): string {
  switch (target.family) {
    case 'species': return `${target.family}:${target.id}:${target.action}`;
    case 'habitatUpgrade': return `${target.family}:${target.id}:${target.toLevel}`;
    case 'extension': return `${target.family}:${target.rank}`;
    default: return `${target.family}:${target.id}`;
  }
}
/** Prepare a batch against one immutable snapshot; no global cache or saved derived values. */
export function createLevelAccessChecker(totalXp: number, rights: readonly HistoricalLevelRight[] = [], c: ProgressionConfig = PROGRESSION): (target: LevelAccessTarget) => LevelAccess {
  const currentLevel = progressionFromXp(totalXp, c).level;
  for (const right of rights) {
    requirement(right.target, c);
    if (!right.source.trim()) throw new RangeError('Historical right needs a source');
  }
  return target => {
    const requiredLevel = requirement(target, c);
    const historicalException = rights.find(right => key(right.target) === key(target)) ?? null;
    const activated = c.activeLevelFamilies[target.family];
    const meetsLevel = currentLevel >= requiredLevel;
    const accessible = !activated || meetsLevel || historicalException !== null;
    return {target: {...target}, currentLevel, requiredLevel, activated, meetsLevel, accessible, locked: !accessible, historicalException};
  };
}
export function checkLevelAccess(totalXp: number, target: LevelAccessTarget, rights: readonly HistoricalLevelRight[] = [], c: ProgressionConfig = PROGRESSION): LevelAccess {
  return createLevelAccessChecker(totalXp,rights,c)(target);
}
/** Explicit read-only adapter for retained purchase rights, NOT live mission progress.
 * Caller must supply proven historical IDs. No save conversion or automatic old-game exemption. */
export function historicalPurchaseLevelRights(ids: readonly PurchaseUnlockId[]): HistoricalLevelRight[] {
  const result: HistoricalLevelRight[] = [];
  for (const id of new Set(ids)) {
    if (!PURCHASE_UNLOCK_IDS.includes(id)) throw new RangeError('Unknown historical purchase right');
    result.push({source: `purchaseUnlocks:${id}`, target: id === 'universal'
      ? {family: 'habitatPurchase', id: 'universal'}
      : {family: 'species', id, action: 'purchase'}});
  }
  return result;
}
/** Caller supplies the relevant catalogue/operations: this does not invent breeding policy.
 * Returns each newly accessible target once, across any number of crossed levels. */
export function newlyAccessibleContents(fromLevel: number, toLevel: number, targets: readonly LevelAccessTarget[], rights: readonly HistoricalLevelRight[] = [], c: ProgressionConfig = PROGRESSION): LevelAccessTarget[] {
  progressionFromXp(0, c); // Validate the same configuration even for an empty catalogue.
  if (![fromLevel, toLevel].every(level => Number.isSafeInteger(level) && level >= 1 && level <= c.curve.maximumLevel) || toLevel < fromLevel) throw new RangeError('Invalid announcement level interval');
  const seen = new Set<string>();
  const result: LevelAccessTarget[] = [];
  for (const target of targets) {
    const access = checkLevelAccess(0, target, rights, c);
    const identity = key(target);
    if (access.activated && !access.historicalException && access.requiredLevel > fromLevel && access.requiredLevel <= toLevel && !seen.has(identity)) {
      seen.add(identity); result.push({...target});
    }
  }
  return result;
}
