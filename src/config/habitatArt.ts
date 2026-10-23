import type {HabitatLevel, HabitatType} from './habitats';

/**
 * Illustrated enclosures. Presentation only: no footprint, capacity, save or economy data.
 *
 * One table is the artistic authority of the placed building, its placement/move ghost and its shop thumbnail, and the scene
 * preloads from it. The files are loading copies of the approved 1254 × 1254 sources (output/imagegen/habitats-level1-v1/):
 * cropped to the visible part and reduced to exactly half size by scripts/derive-habitat-art.mjs, never redrawn or stretched.
 * Neige, Feu, Métal and Vol at matching levels/tiers 2 and 3 have approved art. Other enlarged or compact enclosures keep their vector fallback.
 * Paille also has matching level/tier 2 and 3 art. Compact enclosures above level 1 keep their vector fallback.
 * Universel uses the same illustrated-art registry and layout selection.
 */
export interface HabitatArt {
  type: HabitatType;
  texture: string; url: string;
  /** Loaded texture size in pixels. */
  width: number; height: number;
  /** Where the source was cut (source pixels) and the reduction applied, so every number can be traced to the approved image. */
  source: {file: string; size: number; crop: {x: number; y: number; width: number; height: number}; reduction: number};
  /** Displayed width in world units; the height follows the same uniform scale. */
  worldWidth: number;
  /** The point of the texture (loaded pixels) that sits on the building's centre, i.e. the centre of the illustrated play area. */
  anchor: {x: number; y: number};
}

/** One scale for the six: the 1254-pixel source canvas is shown 190 world units wide (the Nest's is 180, the Farm's 156). */
export const HABITAT_WORLD_WIDTH_OF_SOURCE = 190;
const REDUCTION = 2, SOURCE_SIZE = 1254, WORLD_PER_LOADED_PIXEL = HABITAT_WORLD_WIDTH_OF_SOURCE * REDUCTION / SOURCE_SIZE;

function art(type: HabitatType, crop: HabitatArt['source']['crop'], anchor: HabitatArt['anchor']): HabitatArt {
  const width = crop.width / REDUCTION, height = crop.height / REDUCTION;
  return {type, texture: `habitat-level1-${type}`, url: `${import.meta.env.BASE_URL}assets/habitats/habitat-${type}-level1.png`, width, height,
    source: {file: `habitat-${type}-level1-v1.png`, size: SOURCE_SIZE, crop, reduction: REDUCTION}, worldWidth: width * WORLD_PER_LOADED_PIXEL, anchor};
}
/**
 * Anchors (loaded pixels): horizontally the centre of the sprite (all six are drawn symmetrically about the source's column 627);
 * vertically 300 source pixels above the lowest visible row, which puts the centre in the middle of the lawn the rabbits walk on
 * (the front gate's top is ≈ 170–190 source pixels above that lowest row in every type).
 */
export const HABITAT_LEVEL1_ART: Readonly<Record<HabitatType, HabitatArt>> = {
  paille: art('paille', {x: 26, y: 164, width: 1210, height: 872}, {x: 300.5, y: 282}),
  neige: art('neige', {x: 14, y: 214, width: 1226, height: 786}, {x: 306.5, y: 239}),
  feu: art('feu', {x: 4, y: 214, width: 1246, height: 792}, {x: 311.5, y: 241.5}),
  metal: art('metal', {x: 4, y: 168, width: 1246, height: 876}, {x: 311.5, y: 284.5}),
  vol: art('vol', {x: 14, y: 138, width: 1230, height: 876}, {x: 306.5, y: 283.5}),
  universal: art('universal', {x: 10, y: 190, width: 1236, height: 832}, {x: 308.5, y: 262.5}),
};
export const HABITAT_LEVEL1_ART_LIST: readonly HabitatArt[] = Object.values(HABITAT_LEVEL1_ART);

/** Jardin des flocons: visible bounds (10,87)..(1244,1120), six pixels of air before halving.
 * The 1254-source canvas spans 280 world units (6 fine cells span 264). Uniform loaded-pixel scale: 560/1254.
 * Source anchor (627,780) is on the snow in the middle of the courtyard; loaded anchor subtracts the crop and halves.
 */
export const NEIGE_LEVEL2_ART: HabitatArt = {
  type: 'neige', texture: 'habitat-level2-neige', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-neige-level2.png`,
  width: 623, height: 524, worldWidth: 1246 * 280 / 1254, anchor: {x: 311.5, y: 350},
  source: {file: 'habitat-neige-level2-jardin-des-flocons-v1.png', size: 1254, crop: {x: 4, y: 80, width: 1246, height: 1048}, reduction: 2},
};
/** Orangerie des braises: visible bounds (12,68)..(1244,1049), transparent margins only.
 * Same uniform source scale as Neige level 2: 280/1254. Courtyard anchor in the original: (627,720).
 */
export const FEU_LEVEL2_ART: HabitatArt = {
  type: 'feu', texture: 'habitat-level2-feu', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-feu-level2.png`,
  width: 622, height: 497, worldWidth: 1244 * 280 / 1254, anchor: {x: 310.5, y: 329},
  source: {file: 'habitat-feu-level2-orangerie-des-braises-v1.png', size: 1254, crop: {x: 6, y: 62, width: 1244, height: 994}, reduction: 2},
};
/** Cour de l'horloger: visible bounds (7,144)..(1250,1038). Full source width avoids cutting the right fence.
 * Uniform source scale 280/1254, courtyard anchor (627,720) in original pixels.
 */
export const METAL_LEVEL2_ART: HabitatArt = {
  type: 'metal', texture: 'habitat-level2-metal', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-metal-level2.png`,
  width: 627, height: 454, worldWidth: 280, anchor: {x: 313.5, y: 291},
  source: {file: 'habitat-metal-level2-cour-horloger-v1.png', size: 1254, crop: {x: 0, y: 138, width: 1254, height: 908}, reduction: 2},
};
/** Escale des vents: visible bounds (1,151)..(1253,1057); keep the full width as the source reaches the right edge.
 * Uniform source scale 280/1254; measured lawn anchor (627,750) in original pixels.
 */
export const VOL_LEVEL2_ART: HabitatArt = {
  type: 'vol', texture: 'habitat-level2-vol', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-vol-level2.png`,
  width: 627, height: 460, worldWidth: 280, anchor: {x: 313.5, y: 303},
  source: {file: 'habitat-vol-level2-escale-des-vents-v1.png', size: 1254, crop: {x: 0, y: 144, width: 1254, height: 920}, reduction: 2},
};
/** Approved transparent Paille v2: visible bounds (5,180)..(1250,1108). Preserve the full original width.
 * Uniform loaded-pixel scale 560/1254; measured courtyard anchor in the source: (627,800).
 */
export const PAILLE_LEVEL2_ART: HabitatArt = {
  type: 'paille', texture: 'habitat-level2-paille', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-paille-level2.png`,
  width: 627, height: 471, worldWidth: 280, anchor: {x: 313.5, y: 313},
  source: {file: 'habitat-paille-level2-transparent-v2.png', size: 1254, crop: {x: 0, y: 174, width: 1254, height: 942}, reduction: 2},
};
/** Universal level 2: visible bounds (4,124)..(1248,1089). Full width, transparent vertical margins only.
 * Uniform loaded-pixel scale 560/1254; original lawn anchor (627,760).
 */
export const UNIVERSAL_LEVEL2_ART: HabitatArt = {
  type: 'universal', texture: 'habitat-level2-universal', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-universal-level2.png`,
  width: 627, height: 489, worldWidth: 280, anchor: {x: 313.5, y: 321},
  source: {file: 'habitat-universal-level2-v1.png', size: 1254, crop: {x: 0, y: 118, width: 1254, height: 978}, reduction: 2},
};
export const HABITAT_LEVEL2_ART: Partial<Record<HabitatType, HabitatArt>> = {neige: NEIGE_LEVEL2_ART, feu: FEU_LEVEL2_ART, metal: METAL_LEVEL2_ART, vol: VOL_LEVEL2_ART, paille: PAILLE_LEVEL2_ART, universal: UNIVERSAL_LEVEL2_ART};
/** Grand Jardin d'hiver: visible bounds (0,134)..(1253,1095); preserve the original lateral edges.
 * Source canvas width is 352 world units, exactly the 8-cell footprint width. Courtyard anchor: original (627,780).
 */
export const NEIGE_LEVEL3_ART: HabitatArt = {
  type: 'neige', texture: 'habitat-level3-neige', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-neige-level3.png`,
  width: 627, height: 487, worldWidth: 352, anchor: {x: 313.5, y: 326},
  source: {file: 'habitat-neige-level3-grand-jardin-hiver-v1.png', size: 1254, crop: {x: 0, y: 128, width: 1254, height: 974}, reduction: 2},
};
/** Grande Orangerie des braises: visible bounds (9,117)..(1244,1028); transparent margins only.
 * Same uniform source scale as Neige level 3: 352/1254. Original courtyard anchor: (627,750).
 */
export const FEU_LEVEL3_ART: HabitatArt = {
  type: 'feu', texture: 'habitat-level3-feu', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-feu-level3.png`,
  width: 624, height: 463, worldWidth: 1248 * 352 / 1254, anchor: {x: 312.5, y: 320},
  source: {file: 'habitat-feu-level3-grande-orangerie-des-braises-v1.png', size: 1254, crop: {x: 2, y: 110, width: 1248, height: 926}, reduction: 2},
};
/** Domaine des rouages: visible bounds (5,157)..(1252,1044). Full width preserves the original right edge.
 * Uniform loaded-pixel scale 704/1254; original courtyard anchor (627,750).
 */
export const METAL_LEVEL3_ART: HabitatArt = {
  type: 'metal', texture: 'habitat-level3-metal', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-metal-level3.png`,
  width: 627, height: 451, worldWidth: 352, anchor: {x: 313.5, y: 300},
  source: {file: 'habitat-metal-level3-domaine-des-rouages-v1.png', size: 1254, crop: {x: 0, y: 150, width: 1254, height: 902}, reduction: 2},
};
/** Grand Port des alizés: visible bounds (5,190)..(1252,1029). Keep the full original width.
 * Uniform loaded-pixel scale 704/1254; measured lawn anchor in the source: (627,750).
 */
export const VOL_LEVEL3_ART: HabitatArt = {
  type: 'vol', texture: 'habitat-level3-vol', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-vol-level3.png`,
  width: 627, height: 426, worldWidth: 352, anchor: {x: 313.5, y: 283},
  source: {file: 'habitat-vol-level3-grand-port-des-alizes-v1.png', size: 1254, crop: {x: 0, y: 184, width: 1254, height: 852}, reduction: 2},
};
/** Domaine des moissons: visible bounds (9,115)..(1251,1055). Preserve full width and crop transparent vertical margins.
 * Uniform loaded-pixel scale 704/1254; measured lawn anchor in the source: (627,760).
 */
export const PAILLE_LEVEL3_ART: HabitatArt = {
  type: 'paille', texture: 'habitat-level3-paille', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-paille-level3.png`,
  width: 627, height: 477, worldWidth: 352, anchor: {x: 313.5, y: 326},
  source: {file: 'habitat-paille-level3-domaine-des-moissons-v1.png', size: 1254, crop: {x: 0, y: 108, width: 1254, height: 954}, reduction: 2},
};
/** Universal level 3: visible bounds (0,143)..(1253,1123). Preserve both original lateral edges.
 * Uniform loaded-pixel scale 704/1254; original lawn anchor (627,780).
 */
export const UNIVERSAL_LEVEL3_ART: HabitatArt = {
  type: 'universal', texture: 'habitat-level3-universal', url: `${import.meta.env.BASE_URL}assets/habitats/habitat-universal-level3.png`,
  width: 627, height: 497, worldWidth: 352, anchor: {x: 313.5, y: 322},
  source: {file: 'habitat-universal-level3-v1.png', size: 1254, crop: {x: 0, y: 136, width: 1254, height: 994}, reduction: 2},
};
export const HABITAT_LEVEL3_ART: Partial<Record<HabitatType, HabitatArt>> = {neige: NEIGE_LEVEL3_ART, feu: FEU_LEVEL3_ART, metal: METAL_LEVEL3_ART, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART};
export const HABITAT_ART_LIST: readonly HabitatArt[] = [...HABITAT_LEVEL1_ART_LIST, ...Object.values(HABITAT_LEVEL2_ART), ...Object.values(HABITAT_LEVEL3_ART)];

/**
 * The illustrated drawing, or null for vector art. Exact capacity level AND acquired footprint tier must match.
 * The placed building and ghost ask this function; the shop always asks for level 1.
 */
export function habitatArtFor(habitat: {type: HabitatType; level: HabitatLevel} | undefined, footprintTier?: number): HabitatArt | null {
  if (habitat?.level === 2 && footprintTier === 2) return HABITAT_LEVEL2_ART[habitat.type] ?? null;
  if (habitat?.level === 3 && footprintTier === 3) return HABITAT_LEVEL3_ART[habitat.type] ?? null;
  return habitat && habitat.level === 1 && (footprintTier ?? 1) === 1 ? HABITAT_LEVEL1_ART[habitat.type] : null;
}

/**
 * Residents of an illustrated level-1 enclosure, local to the building's centre like `VISUAL.rabbit.offsets`. The illustrated lawn
 * is shallower than the vector one it replaces (≈ 35 world units from the shelter's doorstep to the gate instead of 103), so the
 * three resting places and the safe zone follow it: two behind, one in front of the gate's posts, feet always on the grass.
 * Rabbit size and roaming rhythm are unchanged.
 */
export const HABITAT_ART_LAYOUT = {
  slots: [{x: -34, y: -9}, {x: 34, y: -9}, {x: 0, y: 2}] as readonly {x: number; y: number}[],
  zone: {minX: -42, maxX: 42, minY: -13, maxY: 6},
  roamScale: .5,
  /** Name label below the centre, as before. */
  labelOffset: 70,
} as const;

/** Five feet positions on snow, clear of the glasshouse steps, crystals and front gate.
 * Back row at source y≈708, front row y≈852. Walking uses the existing tier-2 radius and rhythm.
 */
export const NEIGE_LEVEL2_LAYOUT = {
  slots: [{x: -52, y: -16}, {x: 0, y: -16}, {x: 52, y: -16}, {x: -30, y: 16}, {x: 30, y: 16}] as readonly {x: number; y: number}[],
  zone: {minX: -72, maxX: 72, minY: -26, maxY: 24}, roamScale: 1, labelOffset: 96,
} as const;

/** Feet on the orange courtyard, below the house steps and hearth, above the gate and flower beds. */
export const FEU_LEVEL2_LAYOUT = {
  slots: [{x: -52, y: -18}, {x: 0, y: -18}, {x: 52, y: -18}, {x: -30, y: 16}, {x: 30, y: 16}] as readonly {x: number; y: number}[],
  zone: {minX: -72, maxX: 72, minY: -30, maxY: 26}, roamScale: 1, labelOffset: 96,
} as const;

/** Front row shifted right to stay clear of the left-hand gate and its tall copper posts. */
export const METAL_LEVEL2_LAYOUT = {
  slots: [{x: -44, y: -12}, {x: 0, y: -12}, {x: 44, y: -12}, {x: 0, y: 22}, {x: 48, y: 22}] as readonly {x: number; y: number}[],
  zone: {minX: -64, maxX: 68, minY: -22, maxY: 32}, roamScale: 1, labelOffset: 96,
} as const;

/** Five feet positions on the lawn, below the shelter/gazebo and above the front gate posts. */
export const VOL_LEVEL2_LAYOUT = {
  slots: [{x: -44, y: -8}, {x: 0, y: -8}, {x: 44, y: -8}, {x: -28, y: 10}, {x: 28, y: 10}] as readonly {x: number; y: number}[],
  zone: {minX: -64, maxX: 64, minY: -22, maxY: 20}, roamScale: 1, labelOffset: 96,
} as const;

/** Three back places and four front places use the broad snow courtyard, clear of the conservatory and gate pillars. */
export const NEIGE_LEVEL3_LAYOUT = {
  slots: [{x: -72, y: -30}, {x: 0, y: -30}, {x: 72, y: -30}, {x: -96, y: 18}, {x: -32, y: 18}, {x: 32, y: 18}, {x: 96, y: 18}] as readonly {x: number; y: number}[],
  zone: {minX: -116, maxX: 116, minY: -40, maxY: 28}, roamScale: 1, labelOffset: 108,
} as const;

/** Shallower orange courtyard: three back places below the steps and ovens, four front places above the plants and gate. */
export const FEU_LEVEL3_LAYOUT = {
  slots: [{x: -64, y: -12}, {x: 0, y: -12}, {x: 64, y: -12}, {x: -84, y: 18}, {x: -28, y: 18}, {x: 28, y: 18}, {x: 84, y: 18}] as readonly {x: number; y: number}[],
  zone: {minX: -104, maxX: 104, minY: -16, maxY: 22}, roamScale: 1, labelOffset: 108,
} as const;

/** Staggered places follow the sloping courtyard: avoid the gazebo/house steps, left gate posts and central front flower pot. */
export const METAL_LEVEL3_LAYOUT = {
  slots: [{x: -66, y: -12}, {x: 0, y: -4}, {x: 66, y: 4}, {x: -92, y: 8}, {x: -36, y: 12}, {x: 48, y: 18}, {x: 104, y: 18}] as readonly {x: number; y: number}[],
  zone: {minX: -98, maxX: 118, minY: -22, maxY: 24}, roamScale: 1, labelOffset: 108,
} as const;

/** Rear places below the pavilion steps and refuge; front places above the offset gate and its tall posts. */
export const VOL_LEVEL3_LAYOUT = {
  slots: [{x: -72, y: -16}, {x: 0, y: -16}, {x: 64, y: -16}, {x: -80, y: 18}, {x: -24, y: 18}, {x: 32, y: 18}, {x: 88, y: 18}] as readonly {x: number; y: number}[],
  zone: {minX: -100, maxX: 108, minY: -26, maxY: 28}, roamScale: 1, labelOffset: 108,
} as const;

/** Seven lawn places below the farmhouse/cart, above the gate and border planting beds. */
export const PAILLE_LEVEL3_LAYOUT = {
  slots: [{x: -72, y: -18}, {x: 4, y: -18}, {x: 72, y: -26}, {x: -80, y: 18}, {x: -24, y: 18}, {x: 56, y: 18}, {x: 100, y: 18}] as readonly {x: number; y: number}[],
  zone: {minX: -100, maxX: 100, minY: -26, maxY: 28}, roamScale: 1, labelOffset: 108,
} as const;

/** Five places on the level-2 lawn, below the shelter/cart and above the front gate posts. */
export const PAILLE_LEVEL2_LAYOUT = {
  slots: [{x: -52, y: -18}, {x: 0, y: -18}, {x: 52, y: -18}, {x: -30, y: 14}, {x: 30, y: 14}] as readonly {x: number; y: number}[],
  zone: {minX: -72, maxX: 72, minY: -28, maxY: 24}, roamScale: 1, labelOffset: 96,
} as const;

/** Five lawn places below the cottage/pergola and above the front gate. */
export const UNIVERSAL_LEVEL2_LAYOUT = {
  slots: [{x: -52, y: -18}, {x: 0, y: -18}, {x: 52, y: -18}, {x: -30, y: 14}, {x: 30, y: 14}] as readonly {x: number; y: number}[],
  zone: {minX: -72, maxX: 72, minY: -28, maxY: 24}, roamScale: 1, labelOffset: 96,
} as const;

/** Seven lawn places in two spaced rows, below the cottage estate and above the front gate posts. */
export const UNIVERSAL_LEVEL3_LAYOUT = {
  slots: [{x: -72, y: -30}, {x: 0, y: -30}, {x: 72, y: -30}, {x: -90, y: 20}, {x: -30, y: 20}, {x: 30, y: 20}, {x: 90, y: 20}] as readonly {x: number; y: number}[],
  zone: {minX: -110, maxX: 110, minY: -40, maxY: 30}, roamScale: 1, labelOffset: 108,
} as const;

interface HabitatArtLayout {
  slots: readonly {x: number; y: number}[];
  zone: {minX: number; maxX: number; minY: number; maxY: number};
  roamScale: number; labelOffset: number;
}
const HABITAT_LAYOUTS = new Map<HabitatArt, HabitatArtLayout>([[NEIGE_LEVEL2_ART, NEIGE_LEVEL2_LAYOUT], [FEU_LEVEL2_ART, FEU_LEVEL2_LAYOUT], [METAL_LEVEL2_ART, METAL_LEVEL2_LAYOUT], [VOL_LEVEL2_ART, VOL_LEVEL2_LAYOUT], [PAILLE_LEVEL2_ART, PAILLE_LEVEL2_LAYOUT], [UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL2_LAYOUT], [NEIGE_LEVEL3_ART, NEIGE_LEVEL3_LAYOUT], [FEU_LEVEL3_ART, FEU_LEVEL3_LAYOUT], [METAL_LEVEL3_ART, METAL_LEVEL3_LAYOUT], [VOL_LEVEL3_ART, VOL_LEVEL3_LAYOUT], [PAILLE_LEVEL3_ART, PAILLE_LEVEL3_LAYOUT], [UNIVERSAL_LEVEL3_ART, UNIVERSAL_LEVEL3_LAYOUT]]);
export const habitatArtLayout = (art: HabitatArt): HabitatArtLayout => HABITAT_LAYOUTS.get(art) ?? HABITAT_ART_LAYOUT;
