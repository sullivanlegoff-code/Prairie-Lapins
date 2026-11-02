import type {RabbitType} from './species';

/**
 * Painted frames of a ready baby's reception card, one per first type (owner, 2 November 2026: « pour tous les lapins je veux
 * que la fiche de réception du lapin soit stylisée en fonction du type 1 du lapin »). Concept A, prepared by
 * scripts/prepare-reception-frames.mjs. Arc-en-ciel (Benny) has none: her reception is her own show.
 * All five cards share the same layout (banner at the top, meadow in the middle, bow at the bottom) and almost the same size.
 */
export const RECEPTION_FRAME_TYPES = ['paille', 'neige', 'feu', 'metal', 'vol'] as const satisfies readonly RabbitType[];
export type ReceptionFrameType = typeof RECEPTION_FRAME_TYPES[number];

export interface ReceptionFrameArt {url: string; width: number; height: number}
const frame = (type: ReceptionFrameType, height: number): ReceptionFrameArt =>
  ({url: `${import.meta.env.BASE_URL}assets/ui/reception/${type}.webp`, width: 1200, height});

/** Sizes are the WebP pixels printed by the preparation script. */
export const RECEPTION_FRAMES: Readonly<Record<ReceptionFrameType, ReceptionFrameArt>> = {
  paille: frame('paille', 793), neige: frame('neige', 790), feu: frame('feu', 793), metal: frame('metal', 794), vol: frame('vol', 793),
};

export const receptionFrame = (type: RabbitType): ReceptionFrameArt | null =>
  (RECEPTION_FRAME_TYPES as readonly string[]).includes(type) ? RECEPTION_FRAMES[type as ReceptionFrameType] : null;

const preloaded = new Map<string, HTMLImageElement>();
/** Starts loading (and decoding) a type's frame once, so the card never opens on an empty frame. */
export function preloadReceptionFrame(type: RabbitType): void {
  const art = receptionFrame(type);
  if (!art || preloaded.has(art.url) || typeof Image === 'undefined') return;
  const image = new Image(); image.decoding = 'async'; image.src = art.url; preloaded.set(art.url, image);
}
