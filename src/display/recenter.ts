import {NEST_ART} from '../config/nestArt';
import {NURSERY_ART} from '../config/nurseryArt';
import {FARM_ART} from '../config/farmArt';
import {KITCHEN_ART} from '../config/kitchenArt';
import {PARCELS, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {VISUAL} from '../config/visual';
import {HABITAT_SIZE_PROPOSAL} from '../config/habitatSizes';
import {habitatArtFor, habitatArtLayout} from '../config/habitatArt';
import {buildingCenter, cellsBounds, type MeadowCamera, type ViewInsets, type WorldBounds} from '../ui/gestures';
import {screenBounds, toScreen} from '../ui/projection';
import {islandOutline} from './islandOutline';
import type {Building, GameState} from '../state/types';

/** Screen chrome over the canvas, in CSS pixels: HUD bottom, left action column, laboratory footer. */
export interface ScreenChrome {width: number; height: number; hudBottom: number; column: {right: number; bottom: number} | null; footerTop: number | null}

/** Screen-world extent of a building as drawn (upright artwork, or habitat fence, posts and residents, and its name label). */
export function buildingFrame(b: Pick<Building, 'kind' | 'x' | 'y'> & Partial<Pick<Building, 'footprintTier' | 'habitat'>>): WorldBounds {
  const c = toScreen(buildingCenter(b));
  const art = b.kind === 'nest' ? NEST_ART : b.kind === 'nursery' ? NURSERY_ART : b.kind === 'farm' ? FARM_ART : b.kind === 'kitchen' ? KITCHEN_ART : null;
  // Illustrated enclosure: picture frame around its measured anchor, including the name label.
  const illustrated = b.kind === 'enclosure' ? habitatArtFor(b.habitat ?? undefined, b.footprintTier) : null;
  if (illustrated) { const k = illustrated.worldWidth / illustrated.width; return {left: c.x - illustrated.anchor.x * k, right: c.x + (illustrated.width - illustrated.anchor.x) * k, top: c.y - illustrated.anchor.y * k, bottom: Math.max(c.y + (illustrated.height - illustrated.anchor.y) * k, c.y + habitatArtLayout(illustrated).labelOffset + 10)}; }
  // A larger enclosure's fence, rails and corner pieces grow with its tier (same table as the drawing).
  if (!art) { const g = b.kind === 'enclosure' && b.footprintTier && b.footprintTier > 1 ? HABITAT_SIZE_PROPOSAL[b.footprintTier].growth : {x: 0, top: 0, bottom: 0}; return {left: c.x - 88 - g.x, right: c.x + 88 + g.x, top: c.y - 64 - g.top, bottom: c.y + 80 + g.bottom}; }
  const height = art.worldWidth * art.height / art.width, labelY = 'labelY' in art ? art.labelY : 70;
  return {left: c.x - art.worldWidth / 2, right: c.x + art.worldWidth / 2, top: c.y - height * art.originY, bottom: Math.max(c.y + height * (1 - art.originY), c.y + labelY + 10)};
}

/** The three starting buildings: nest, nursery and the first habitat (Paille in a new game). */
export function startFrame(s: Pick<GameState, 'buildings'>): WorldBounds | null {
  const chosen = [s.buildings.find(b => b.kind === 'nest'), s.buildings.find(b => b.kind === 'nursery'), s.buildings.find(b => b.kind === 'enclosure')].filter((b): b is Building => !!b);
  if (!chosen.length) return null;
  const frames = chosen.map(buildingFrame);
  return {left: Math.min(...frames.map(f => f.left)), right: Math.max(...frames.map(f => f.right)), top: Math.min(...frames.map(f => f.top)), bottom: Math.max(...frames.map(f => f.bottom))};
}

/** Free canvas beside the action column (landscape) or below it (portrait); the better framing wins. */
export function recenterInsets(c: ScreenChrome, pad = 16): ViewInsets[] {
  const top = c.hudBottom + pad, bottom = c.footerTop === null ? pad : c.height - c.footerTop + pad;
  if (!c.column) return [{left: pad, right: pad, top, bottom}];
  return [{left: c.column.right + pad, right: pad, top, bottom}, {left: pad, right: pad, top: Math.max(top, c.column.bottom + pad), bottom}];
}

/**
 * Camera pan regions: project each owned parcel, then extend for the grassy collar and hanging rock.
 * The existing ground padding is retained to preserve camera framing.
 * Clouds never contribute to ownership bounds or interior texture allocation.
 */
export function ownedRegions(parcels: readonly ParcelId[]): WorldBounds[] {
  const n = ISLAND.parcelCells, m = VISUAL.ground.visualMargin;
  const regions = parcels.map(id => {const p = PARCELS[id], land = cellsBounds(p.x, p.y, p.x + n, p.y + n);
    const frame = screenBounds({left: land.left - m.left, right: land.right + m.right, top: land.top - m.top, bottom: land.bottom + m.bottom});
    const rim = VISUAL.ground.floatingRim;
    return {left: frame.left - rim, right: frame.right + rim, top: frame.top - rim, bottom: frame.bottom + VISUAL.ground.floatingDepth};});
  // Tapered faces can lean into a concavity. Bound each exposed face, plus the component's mist,
  // without making the entire gap between detached islands a pan region.
  for (const component of islandOutline(parcels)) {
    const points = component.loops.flatMap(l => l.points.map(toScreen));
    const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x)), bottom = Math.max(...points.map(p => p.y));
    regions.push({left, right, top: bottom, bottom: bottom + VISUAL.ground.floatingDepth});
    const center = (left + right) / 2, rim = VISUAL.ground.floatingRim;
    for (const loop of component.loops) for (const edge of loop.edges) {
      const a = toScreen(edge.a), b = toScreen(edge.b);
      if (b.x >= a.x) continue;
      const x = [a.x, b.x, center + (a.x - center) * .64, center + (b.x - center) * .64];
      regions.push({left: Math.min(...x) - rim, right: Math.max(...x) + rim, top: Math.min(a.y, b.y) - rim,
        bottom: Math.max(a.y, b.y) + VISUAL.ground.floatingDepth});
    }
  }
  return regions;
}

const union = (rects: WorldBounds[]): WorldBounds => ({left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)),
  top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom))});

/**
 * Recenter envelope: owned plateaux, grassy collar, complete screen-vertical rock and upright buildings.
 */
export function islandFrame(s: Pick<GameState, 'acquiredParcels' | 'buildings'>): {island: WorldBounds; keep: WorldBounds} | null {
  if (!s.acquiredParcels.length) return null;
  const n = ISLAND.parcelCells, rimPadding = VISUAL.camera.recenterRim;
  // Legacy presentation padding applies on the ground. Rock depth is added only after projection.
  const land = union(s.acquiredParcels.map(id => {const p = PARCELS[id]; return cellsBounds(p.x, p.y, p.x + n, p.y + n);}));
  const projected = screenBounds({left: land.left - rimPadding.left, right: land.right + rimPadding.right, top: land.top - rimPadding.top, bottom: land.bottom + rimPadding.bottom});
  const rim = VISUAL.ground.floatingRim;
  const rockFrame = {left: projected.left - rim, right: projected.right + rim, top: projected.top - rim, bottom: projected.bottom + VISUAL.ground.floatingDepth};
  const buildings = s.buildings.map(buildingFrame);
  return {island: buildings.length ? union([rockFrame, ...buildings]) : rockFrame, keep: buildings.length ? union(buildings) : screenBounds(land)};
}

/** Fit the complete island beside or below the action column, capped at the initial zoom.
 * Compact views may zoom below the former readability floor to keep the hanging rock visible.
 * Without measured chrome, retain the fixed-focus fallback and normal gesture clamp. */
export function recenterCamera(view: MeadowCamera, s: Pick<GameState, 'acquiredParcels' | 'buildings'> | null, chrome: ScreenChrome | null): void {
  const target = s ? islandFrame(s) : null;
  if (!target || !chrome) { view.setInsets(null); view.recenter(); return; }
  let best: ViewInsets | null = null, fit = -Infinity;
  for (const candidate of recenterInsets(chrome)) {
    const insets = {...candidate, bottom: chrome.footerTop === null ? 0 : candidate.bottom};
    view.setInsets(insets); const z = view.islandFitZoom(target.island); if (z > fit) { fit = z; best = insets; }
  }
  view.setInsets(best); view.frameIsland(target.island, target.keep, 0); view.setInsets(null);
}
