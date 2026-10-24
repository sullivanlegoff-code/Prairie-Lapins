import {DECORATIONS, type DecorationId} from '../config/decorations';
/** Identical scale for the placed object and its ghost; tall silhouettes stay modest. */
export function decorationScale(id: DecorationId, textureWidth = 120): number {
  return DECORATIONS[id].art.worldWidth / textureWidth;
}
export const decorationTexture = (id: DecorationId, rotation: 0 | 1 = 0) => `decoration:${id}:${rotation}`;

/** Flat tiles live above the terrain and below every upright layer. */
export const decorationLayerDepth = (id: DecorationId): number => id === 'dirt-path' ? .05 : .5;
export const decorationOrigin = (id: DecorationId) => DECORATIONS[id].art.anchor;
export const decorationUrl = (id: DecorationId) => import.meta.env.BASE_URL + DECORATIONS[id].art.file;
