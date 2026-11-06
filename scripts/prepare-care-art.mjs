// Salon de soins and picnic art (owner's choice, 2 November 2026: salon concept A, picnic concept A).
// Sources: imagegen paintings already on a transparent background (1254 x 1254 RGBA), kept outside the repository.
// Usage: node scripts/prepare-care-art.mjs "<folder holding salon-production/ and pique-nique-production/>"
import {fileURLToPath} from 'node:url';
import {prepareArt} from './prepare-food-art.mjs';

export const CARE_ART = [
  {id: 'salon', source: 'salon-production/salon-soins', master: 'assets-source/buildings/salon-soins.png', served: 'public/assets/buildings/salon-soins.png', size: 512, trim: true, transparent: true},
  {id: 'picnic', source: 'pique-nique-production/pique-nique', master: 'assets-source/effects/pique-nique.png', served: 'public/assets/effects/pique-nique.png', size: 384, trim: true, transparent: true},
];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-care-art.mjs "<folder with the paintings>"');
  prepareArt(folder, CARE_ART);
}
