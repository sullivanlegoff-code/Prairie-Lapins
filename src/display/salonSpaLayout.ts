import {cuisineAnchors} from '../config/cuisineAnchors';
import type {CareKind} from '../config/balance';
import type {RabbitArt} from '../config/rabbitArt';

/**
 * Where the spa's pieces sit on the rabbit in care (owner, 10 November 2026: « qu'on voit le lapin se faire shampooigner ou qu'il
 * fasse très spa »), from the per-species anchors of the Cuisine toque (head, chest, eyes: src/config/cuisineAnchors.ts), in the
 * coordinates of a body that carries the sprite like the meadow does: origin (0.5, 1) at (0, groundY), scale worldWidth / width,
 * the picture turned so the rabbit looks towards `look` (1: right, -1: left). Shared by the meadow and the menu's scene.
 */
export interface SpaLayout {
  /** Mirror sign applied to the native picture. */
  flip: 1 | -1;
  /** Sprite size in body units. */
  width: number; height: number;
  /** The top of the skull between the ears (foam crown, turban), with the head's tilt in degrees. */
  head: {x: number; y: number; w: number; angle: number};
  /** The chest: the water line of the bath, the top of the massage blanket. */
  chest: {x: number; y: number; w: number};
  /** The eyes (the cucumber slices). */
  eyes: {x: number; y: number; w: number};
  /** Rows of the picture kept above the water in the bath (0 → 1 of its height); 1 for the other cares. */
  keep: number;
}
/** Below the chest anchor, a little more of the body shows above the water. */
export const BATH_WATER_BELOW_CHEST = .1;
/** The rabbit looks towards the middle of the spa: right on the brushing stool (left corner), left on the massage table. */
export const SPA_LOOK: Record<CareKind, 1 | -1> = {bath: 1, brush: 1, massage: -1};

export function spaLayout(art: Pick<RabbitArt, 'species' | 'width' | 'height' | 'worldWidth' | 'groundY' | 'facing' | 'evolved'>, care: CareKind): SpaLayout {
  const look = SPA_LOOK[care], flip = (art.facing === look ? 1 : -1) as 1 | -1, scale = art.worldWidth / art.width;
  const width = art.worldWidth, height = art.height * scale, a = cuisineAnchors(art.species, art.facing, !!art.evolved);
  const at = (fx: number, fy: number) => ({x: (fx - .5) * width * flip, y: art.groundY - (1 - fy) * height});
  const keep = care === 'bath' ? Math.min(1, a.bib.y + BATH_WATER_BELOW_CHEST) : 1;
  return {
    flip, width, height, keep,
    head: {...at(a.hat.x, a.hat.y), w: a.hat.w * width, angle: a.hat.r * flip},
    chest: {...at(a.bib.x, a.bib.y), w: a.bib.w * width},
    eyes: {...at(a.eyes.x, a.eyes.y), w: a.eyes.w * width},
  };
}
/** The y of the water line in body units: the lowest kept row of the picture. */
export const waterLine = (art: Pick<RabbitArt, 'groundY'>, layout: SpaLayout): number => art.groundY - (1 - layout.keep) * layout.height;

/**
 * The glow of a rabbit just welcomed back from the salon (owner, 10 November 2026: « le lapin brille au retour »): it shines for
 * `GLOW_MS`, fading out over the last `GLOW_FADE_MS`. Presentation only: it is not saved (a rabbit welcomed back on another
 * device, or before a reload, does not shine).
 */
export const GLOW_MS = 3 * 60_000, GLOW_FADE_MS = 15_000;
export const glowStrength = (until: number, now: number): number => Math.max(0, Math.min(1, (until - now) / GLOW_FADE_MS));
