import type {GameState, TimedStage, Building} from '../state/types';
import {babiesBySlot, babyInNursery} from './nursery';
type Job = NonNullable<Building['order'] | Building['breeding']> | NonNullable<Building['nursery']>['babies'][number];
/** The job a key designates: growth names one nursery baby by its birth id, never "the" baby. */
function stageJob(b: Building | undefined, stage: TimedStage, birthId?: string): Job | null {
  if (!b) return null;
  return stage === 'order' ? b.order : stage === 'breeding' ? b.breeding : babyInNursery(b, birthId);
}
const keyOf = (b: Building, stage: TimedStage, job: Job) =>
  JSON.stringify([b.id, stage, job.startedAt, 'readyAt' in job ? job.readyAt : job.endsAt, 'birth' in job ? job.birth.id : job.recipe]);
/** Growth requires the targeted baby's birth id; without it there is no job. */
export function jobKey(b: Building, stage: TimedStage, birthId?: string): string | null {
  const job = stageJob(b, stage, birthId);
  return job ? keyOf(b, stage, job) : null;
}
/** Every current job of this stage with its key (one per nursery baby for growth). */
function jobs(b: Building, stage: TimedStage): {key: string; job: Job}[] {
  const list: Job[] = stage === 'growth' ? babiesBySlot(b) : [stageJob(b, stage)].filter((j): j is Job => !!j);
  return list.map(job => ({key: keyOf(b, stage, job), job}));
}
/** Close expired or replaced targets. Never retarget a right to another job. */
export function settleInitiation(s: GameState): void {
  const a = s.initiation; if (!a) return;
  for (const stage of ['order','breeding','growth'] as const) {
    if (!a[stage] || a.closed.includes(stage)) continue;
    const j = s.buildings.flatMap(b => jobs(b, stage)).find(entry => entry.key === a[stage])?.job;
    if (!j || ('readyAt' in j ? j.readyAt : j.endsAt) <= s.lastSimulatedAt) a.closed.push(stage);
  }
}
export function initiationAvailable(s: GameState, id: string, stage: TimedStage, key: string): boolean {
  const a = s.initiation;
  return !!a && !a.closed.includes(stage) && a[stage] === key &&
    s.buildings.some(b => b.id === id && jobs(b, stage).some(entry => entry.key === key));
}
