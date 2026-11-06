import NIGHT_LIGHTS from './winterNightLights.json';

/**
 * Christmas nights with more light (owner, 5 November 2026): the pictures listed in winterNightLights.json (made by
 * scripts/derive-night-lights.mjs) have a glow picture of the same size under assets/noel/nuit/; src/display/nightGlows.ts
 * draws them at night.
 */
export const NIGHT_LIGHT_FILES: ReadonlySet<string> = new Set(NIGHT_LIGHTS as string[]);
/** Above the night shade and with the garlands (2.86): the glow is never darkened by the night. */
export const NIGHT_GLOW_DEPTH = 2.87;
/** How strong the windows glow at full night. */
export const NIGHT_GLOW_STRENGTH = .9;
/** The decorations that light the snow around them, and how wide that pool is (share of the picture's width). */
export const LIGHT_POOLS: Readonly<Record<string, number>> = {'lantern-post': 2.4, 'christmas-tree': 1.5, 'wreath-arch': 1.1, 'snow-globe': 1.2};

/** The glow picture of a served picture, from its URL (only the snowy pictures under assets/noel/ have one). */
export function nightGlowOf(url: string | undefined): {texture: string; url: string} | null {
  const at = url?.indexOf('assets/noel/') ?? -1; if (!url || at < 0) return null;
  const relative = url.slice(at + 'assets/noel/'.length);
  if (!NIGHT_LIGHT_FILES.has(relative)) return null;
  return {texture: `noel-nuit:${relative}`, url: `${url.slice(0, at)}assets/noel/nuit/${relative}`};
}

