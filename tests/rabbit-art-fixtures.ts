/** Historical sprite metadata copied independently from rabbitArt.ts before the registry migration. */
const HISTORICAL_ART = {
  neige: {kind: 'static-sprite', file: 'assets/rabbits/neige/neige-v1.png', texture: 'rabbit-neige-original-v1', width: 518, height: 473, worldWidth: 48, groundY: 12, preloadOrder: 0},
  paille: {kind: 'static-sprite', file: 'assets/rabbits/paille/paille-v1.png', texture: 'rabbit-paille-original-v1', width: 350, height: 495, worldWidth: 40, groundY: 12, preloadOrder: 1, facing: 'left'},
  'belier-gris': {kind: 'static-sprite', file: 'assets/rabbits/belier-gris/belier-gris-v1.png', texture: 'rabbit-belier-gris-original-v1', width: 527, height: 488, worldWidth: 48, groundY: 12, preloadOrder: 3},
  feu: {kind: 'static-sprite', file: 'assets/rabbits/feu/feu-v1.png', texture: 'rabbit-feu-original-v1', width: 1004, height: 827, worldWidth: 50, groundY: 12, preloadOrder: 4},
  volant: {kind: 'static-sprite', file: 'assets/rabbits/volant/volant-v1.png', texture: 'rabbit-volant-original-v1', width: 814, height: 966, worldWidth: 50, groundY: 12, preloadOrder: 5},
  lunettes: {kind: 'procedural', coat: {body: '#d5c6ab', patch: '#b2b9c8', glasses: true}}, perroquet: {kind: 'procedural', coat: {body: '#99cbb8', patch: '#f0bc76', wings: true, plumage: true}},
  'feu-glace': {kind: 'procedural', coat: {body: '#efb47d', patch: '#a0d4e7', flame: true, frost: true}}, bouee: {kind: 'procedural', coat: {body: '#efd483', patch: '#efd483'}}, magicien: {kind: 'procedural', coat: {body: '#b7a2d6', patch: '#b7a2d6'}}, dragon: {kind: 'procedural', coat: {body: '#94b885', patch: '#94b885'}},
} as const;

/** One independent expectation sheet per approved standard Rare, written by hand from the approved designs (never read from the registry). */
export interface StaticArt {kind: 'static-sprite'; file: string; texture: string; width: number; height: number; worldWidth: number; groundY: number; preloadOrder: number; facing?: 'left'}
export type ArtExpectation = StaticArt | {kind: 'procedural'; coat: Record<string, string | boolean>};
export interface RareSheet {
  id: string; name: string; description: string;
  /** Displayed types, in order. */
  types: readonly [string, string];
  /** Elements the recipe asks for, as declared (an unordered pair). */
  requiredTypes: readonly [string, string];
  art: StaticArt;
  /** Filename of the approved, locally protected reference; its bytes are pinned by sourceSha256. */
  source: string; sourceSha256: string; foot: number;
  /** Two catalogue species whose union contains exactly this Rare's elements, with the exact pool they give at affection 2/2, in catalogue order. */
  exactUnion: {parents: readonly [string, string]; weights: readonly (readonly [string, number])[]};
}
/** `facing` is stated only for pictures that look left (checked by eye on the approved PNGs); right is the default. */
const sprite = (id: string, width: number, height: number, worldWidth: number, groundY: number, preloadOrder: number, facing?: 'left'): StaticArt =>
  ({kind: 'static-sprite', file: `assets/rabbits/${id}/${id}-v1.png`, texture: `rabbit-${id}-original-v1`, width, height, worldWidth, groundY, preloadOrder, ...(facing ? {facing} : {})});
/** Policy shared by every standard new Rare. */
export const STANDARD_RARE = {unlockLevel: 1, minAffection: 2, weight: 20, growthMinutes: 30, birthXp: 70} as const;
export const NEW_RARES: readonly RareSheet[] = [
  {id: 'frisket', name: 'Frisket', description: 'Lapin très original, uniquement en neige et en branches. Oreilles faites en branches (pas beaucoup de branches), bout des pattes en branches, visage en neige avec les yeux bleu foncé profonds, il a une petite écharpe rouge.', types: ['neige', 'paille'], requiredTypes: ['paille', 'neige'], art: sprite('frisket', 1227, 1282, 52, 12, 6), source: 'Frisket/Frisket.png', sourceSha256: '03331327a5fea79b78cd035b2b9bfa61675b54a909a98743d8ee6d4266d61f2e', foot: 1269, exactUnion: {parents: ['paille', 'neige'], weights: [['frisket', 20], ['icy', 20]]}},
  {id: 'icy', name: 'Icy', description: 'Lapin avec deux petits nœuds roses dans les cheveux. Les nœuds sont longs et fins. Lapin beige clair.', types: ['paille', 'neige'], requiredTypes: ['paille', 'neige'], art: sprite('icy', 1215, 1295, 48, 12, 7), source: 'Icy/Icy.png', sourceSha256: 'a2b6d349c52517a0c7763b6e5e26311f1d067e183bf49b028dd5929117330c64', foot: 1276, exactUnion: {parents: ['paille', 'neige'], weights: [['frisket', 20], ['icy', 20]]}},
  {id: 'ardent', name: 'Ardent', description: 'Un lapin semblable à une torche humaine, entièrement composé de feu.', types: ['feu', 'paille'], requiredTypes: ['feu', 'paille'], art: sprite('ardent', 1312, 1199, 52, 13, 8), source: 'Ardent/Ardent.png', sourceSha256: '4b59c2aead7d4b1b2954a420c1a3e8eae9144f518b9fadd92752de4b80382c4b', foot: 1164, exactUnion: {parents: ['paille', 'feu'], weights: [['paille', 40], ['feu', 40], ['ardent', 20], ['snk', 20]]}},
  {id: 'snk', name: 'SNK', description: 'Lapin habillé comme Eren de L’Attaque des Titans.', types: ['paille', 'feu'], requiredTypes: ['paille', 'feu'], art: sprite('snk', 1402, 1122, 56, 15.5, 9), source: 'SNK/SNK.png', sourceSha256: '0c9cedadecc45a61c876897ddec8039dbe466c587ff5d07e2f62ac32106c1b5e', foot: 1023, exactUnion: {parents: ['paille', 'feu'], weights: [['paille', 40], ['feu', 40], ['ardent', 20], ['snk', 20]]}},
  {id: 'pic-pic', name: 'Pic Pic', description: 'Un lapin accompagné de pointes de glace flottant autour de lui.', types: ['vol', 'neige'], requiredTypes: ['vol', 'neige'], art: sprite('pic-pic', 1254, 1254, 54, 12.5, 10), source: 'Pic Pic/Pic Pic.png', sourceSha256: '4f2c4e7309c86b5172ece8a3ad3e64ab624f6881c2cb1180a5f7db58110265ed', foot: 1231, exactUnion: {parents: ['neige', 'volant'], weights: [['neige', 40], ['volant', 40], ['pic-pic', 20]]}},
  {id: 'amethyste', name: 'Améthyste', description: 'Un lapin violet à la texture d’améthyste.', types: ['metal', 'feu'], requiredTypes: ['metal', 'feu'], art: sprite('amethyste', 1334, 1179, 56, 14.5, 11), source: 'Amnéshyte/améthyste.png', sourceSha256: '46888b82070468dc7151f6e64389e79247bca0057083b6f9d01d90c848e3e8f4', foot: 1113, exactUnion: {parents: ['belier-gris', 'feu'], weights: [['feu', 40], ['belier-gris', 40], ['amethyste', 20]]}},
  {id: 'princesse-neige', name: 'Princesse Neige', description: 'Une lapine blanche et féérique, vêtue d’une robe de princesse.', types: ['neige', 'metal'], requiredTypes: ['neige', 'metal'], art: sprite('princesse-neige', 1230, 1278, 50, 13.5, 12), source: 'Princesse neige/Princesse neige.png', sourceSha256: '3c2a1d2c579cc48d4ecf48663b663b7971b6283a4c83b2a738246eb309ad8e47', foot: 1229, exactUnion: {parents: ['neige', 'belier-gris'], weights: [['neige', 40], ['belier-gris', 40], ['princesse-neige', 20], ['fluffy', 20]]}},
  {id: 'fluffy', name: 'Fluffy', description: 'Un lapin blanc à l’allure de peluche, tenant une rose dans ses pattes.', types: ['metal', 'neige'], requiredTypes: ['metal', 'neige'], art: sprite('fluffy', 1299, 1211, 52, 13.5, 13), source: 'Fluffy/Fluffy.png', sourceSha256: '25e230a46f24e21eacc70f44fa974474ca32a216b7840456c1216d3b1829dc80', foot: 1155, exactUnion: {parents: ['neige', 'belier-gris'], weights: [['neige', 40], ['belier-gris', 40], ['princesse-neige', 20], ['fluffy', 20]]}},
  {id: 'virvoletant', name: 'Virvoletant', description: 'Un lapin tout rond, composé de brindilles comme un virevoltant du Far West.', types: ['paille', 'vol'], requiredTypes: ['paille', 'vol'], art: sprite('virvoletant', 1254, 1254, 52, 12.5, 14), source: 'Virvoletant/Virvoletant.png', sourceSha256: '39b1f36154aca7d31668405f843dbd042dc8ba98d7a89541c5142ef1280b56bc', foot: 1230, exactUnion: {parents: ['paille', 'volant'], weights: [['paille', 40], ['volant', 40], ['virvoletant', 20], ['plume', 20]]}},
  {id: 'phoenix', name: 'Phoenix', description: 'Un lapin ailé aux couleurs flamboyantes d’un phénix.', types: ['feu', 'vol'], requiredTypes: ['feu', 'vol'], art: sprite('phoenix', 1254, 1254, 54, 14.5, 15), source: 'Phoenix/Phoenix.png', sourceSha256: '5a86e7a306db514f8b05d2c2e58de385f21eaa6c83db8dd0f16e1c593bc19001', foot: 1187, exactUnion: {parents: ['feu', 'volant'], weights: [['feu', 40], ['volant', 40], ['phoenix', 20]]}},
  {id: 'roukette', name: 'Roukette', description: 'Un lapin doré à la coiffure ébouriffée, portant des accessoires noirs et métalliques.', types: ['paille', 'metal'], requiredTypes: ['paille', 'metal'], art: sprite('roukette', 1312, 1199, 52, 12, 16), source: 'Roukette/Roukette.png', sourceSha256: 'd0b7c138d1122b2cec29071b01b6a09a391d32a071c172805ebee69c916474b1', foot: 1181, exactUnion: {parents: ['paille', 'belier-gris'], weights: [['paille', 40], ['belier-gris', 40], ['roukette', 20]]}},
  {id: 'wat-wat', name: 'Wat Wat', description: 'Un lapin bleu aux motifs ondoyants, avec une touche dorée sur le poitrail.', types: ['neige', 'feu'], requiredTypes: ['neige', 'feu'], art: sprite('wat-wat', 1254, 1254, 52, 15, 17), source: 'Wat Wat.png', sourceSha256: 'bfc1c964d80dea6143fbcdc67f2fa03d34522a6352a2ecf1bd31a9a250080972', foot: 1172, exactUnion: {parents: ['neige', 'feu'], weights: [['neige', 40], ['feu', 40], ['wat-wat', 20], ['glassofeu', 20]]}},
  {id: 'glassofeu', name: 'Glassofeu', description: 'Un lapin blanc mêlant flammes et cristaux de glace, avec un œil de feu et un œil glacé.', types: ['feu', 'neige'], requiredTypes: ['feu', 'neige'], art: sprite('glassofeu', 1312, 1199, 52, 12, 18, 'left'), source: 'Glassofeu/Glassofeu.png', sourceSha256: 'bb09895718f0ca736419e8cb51f309ed9db3233298eb9f4df8c2a14c6f87ad25', foot: 1185, exactUnion: {parents: ['neige', 'feu'], weights: [['neige', 40], ['feu', 40], ['wat-wat', 20], ['glassofeu', 20]]}},
  {id: 'plume', name: 'Plume', description: 'Un lapin doré au pelage léger, avec de longues oreilles en forme de plumes.', types: ['vol', 'paille'], requiredTypes: ['vol', 'paille'], art: sprite('plume', 1312, 1199, 52, 12.5, 19), source: 'Plume/Plume.png', sourceSha256: '4ac89c5ee2fb2e6438ffe8252ab22515951c15aaf48de095e63000ba9ba01ac7', foot: 1171, exactUnion: {parents: ['paille', 'volant'], weights: [['paille', 40], ['volant', 40], ['virvoletant', 20], ['plume', 20]]}},
];
export const EXPECTED_ART: Record<string, ArtExpectation> = {...HISTORICAL_ART, ...Object.fromEntries(NEW_RARES.map(r => [r.id, r.art]))};

/** The fifteen species that existed before the approved Rares, in catalogue order, with their required levels and the recipe-only ones. */
export const HISTORICAL_IDS = ['paille', 'neige', 'feu', 'belier-gris', 'volant', 'lunettes', 'perroquet', 'feu-glace', 'bouee', 'magicien', 'dragon'] as const;
export const HISTORICAL_LEVELS = [1, 1, 5, 7, 9, 8, 9, 6, 5, 11, 14] as const;
export const HISTORICAL_RECIPE_IDS = ['lunettes', 'perroquet', 'feu-glace', 'bouee', 'magicien', 'dragon'] as const;
export const HISTORICAL_RARITIES: Record<string, string> = {paille: 'common', neige: 'common', feu: 'common', 'belier-gris': 'common', volant: 'common', lunettes: 'rare', perroquet: 'rare', 'feu-glace': 'rare', bouee: 'rare', magicien: 'epic', dragon: 'legendary'};
/** Whole catalogue in expected order, and the recipe species among it. */
export const EXPECTED_IDS: readonly string[] = [...HISTORICAL_IDS, ...NEW_RARES.map(r => r.id)];
export const EXPECTED_RECIPE_IDS: readonly string[] = [...HISTORICAL_RECIPE_IDS, ...NEW_RARES.map(r => r.id)];
export const EXPECTED_RARITIES: Record<string, string> = {...HISTORICAL_RARITIES, ...Object.fromEntries(NEW_RARES.map(r => [r.id, 'rare']))};
/** How the notebook writes a share: a whole percentage as such, otherwise the reduced fraction and the two-decimal percentage. */
export function shareLabel(weight: number, total: number): string {
  const percent = weight * 100 / total; if (Number.isInteger(percent)) return `${percent} %`;
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a, g = gcd(weight, total);
  return `${weight / g}/${total / g} (≈ ${percent.toFixed(2).replace('.', ',')} %)`;
}
/** The pool additions the standard Rares make for a union of elements and the two parents' affections (independent of the engine). */
export function rareAdditions(elements: Iterable<string>, affectionA: number, affectionB: number): Record<string, number> {
  const union = new Set(elements), low = Math.min(affectionA, affectionB);
  return Object.fromEntries(NEW_RARES.filter(r => r.requiredTypes.every(t => union.has(t)) && low >= STANDARD_RARE.minAffection).map(r => [r.id, STANDARD_RARE.weight]));
}
