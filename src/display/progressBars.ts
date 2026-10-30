import {FARM_ART} from '../config/farmArt';
import {NEST_ART} from '../config/nestArt';
import {AGENCY_ART} from '../config/agencyArt';
import {NURSERY_OVERLAY_ART, NURSERY_ROW_SCALE, NURSERY_SLOT_ANCHORS} from '../config/nurseryArt';
import {babiesBySlot} from '../simulation/nursery';
import type {GameState} from '../state/types';
import {buildingCenter} from '../ui/gestures';
import {toScreen} from '../ui/projection';
import {BASE_PIXEL, baseToWorld} from './nurseryOverlayModel';

export interface ProgressBar {
  key: string; buildingId: string;
  x: number; y: number; width: number; height: number; fraction: number;
}
export interface ProgressVisibility {photo?: boolean; movingId?: string}

/** Degenerate intervals are complete at their end; normal intervals are clamped. */
export function progressFraction(now: number, start: number, end: number): number {
  if (end <= start) return now >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

/** Pure presentation at simulation time. Coordinates are projected world units, independent of camera zoom. */
export function progressBars(state: (Pick<GameState, 'buildings' | 'lastSimulatedAt'> & Pick<Partial<GameState>, 'travel'>) | null,
  visibility: ProgressVisibility = {}, now = state?.lastSimulatedAt ?? 0): ProgressBar[] {
  if (!state || visibility.photo) return [];
  const bars: ProgressBar[] = [];
  for (const b of state.buildings) {
    if (b.id === visibility.movingId) continue;
    const c = toScreen(buildingCenter(b));
    const add = (key: string, start: number, end: number, place: {x: number; y: number; width: number; height: number}) => {
      if (now >= end) return;
      bars.push({key: `${b.id}:${key}`, buildingId: b.id, ...place, x: c.x + place.x, y: c.y + place.y,
        fraction: progressFraction(now, start, end)});
    };
    if (b.kind === 'nest' && b.breeding) add('breeding', b.breeding.startedAt, b.breeding.endsAt, NEST_ART.progress);
    if (b.kind === 'farm' && b.order) add('crop', b.order.startedAt, b.order.endsAt, FARM_ART.progress);
    if (b.kind === 'agency') {
      const art = AGENCY_ART.progress;
      for (const [row, trip] of (state.travel?.trips ?? []).entries()) {
        add(`trip-${trip.rabbitId}`, trip.startedAt, trip.endsAt,
          {x: art.x, y: art.y + row * art.gap, width: art.width, height: art.height});
      }
    }
    if (b.kind === 'nursery' && b.nursery) for (const baby of babiesBySlot(b)) {
      if (baby.slot >= b.nursery.capacity) continue;
      const anchor = NURSERY_SLOT_ANCHORS[baby.slot], row = NURSERY_ROW_SCALE[anchor.row], art = NURSERY_OVERLAY_ART.progress;
      add(`cushion-${baby.slot}`, baby.startedAt, baby.readyAt,
        {...baseToWorld(anchor.x, anchor.y + art.dy * row), width: art.width * row * BASE_PIXEL, height: art.height * row * BASE_PIXEL});
    }
  }
  return bars;
}
