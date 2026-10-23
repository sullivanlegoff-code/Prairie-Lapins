import {SPECIES, SPECIES_IDS, proceduralCoat, type Coat, type ProceduralSpeciesId} from './species';

/** Legacy coats for the five already illustrated species, retained ONLY for compatibility consumers.
 * Rendering does not read these; future static sprites need no entry here.
 */
const LEGACY_SPRITE_COATS = {
  paille: {body: '#ead4aa', patch: '#dcc08c'}, neige: {body: '#fffaf0', patch: '#e4eeee'},
  feu: {body: '#efb47d', patch: '#e98d71', flame: true},
  'belier-gris': {body: '#aeb5c1', patch: '#dce1e6', lop: true, metal: true},
  volant: {body: '#d1d2ee', patch: '#f9f4e2', wings: true},
} satisfies Record<string, Coat>;
/** Compatibility view over procedural entries plus the fixed legacy sprites, not an exhaustive SpeciesId catalogue. */
export const COATS = {...LEGACY_SPRITE_COATS, ...Object.fromEntries(SPECIES_IDS.flatMap(id => {
  const art = SPECIES[id].art;
  return art.kind === 'procedural' ? [[id, proceduralCoat(art)]] : [];
}))} as typeof LEGACY_SPRITE_COATS & Record<ProceduralSpeciesId, Coat>;
