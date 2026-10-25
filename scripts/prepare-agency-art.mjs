// Travel agency art (25 October 2026): the building and Coco, the rabbit who runs it (not a collectable species).
// Sources: Codex imagegen paintings on a pure white backdrop (prompts in docs/travel-agency.md), kept outside the repository.
// Usage: node scripts/prepare-agency-art.mjs "<folder with the paintings>"
import {fileURLToPath} from 'node:url';
import {prepareArt} from './prepare-food-art.mjs';

export const AGENCY_ART = [
  {id: 'agency', source: 'agence-b', master: 'assets-source/buildings/travel-agency.png', served: 'public/assets/buildings/travel-agency.png', size: 512, trim: true},
  {id: 'host', source: 'hote-b', master: 'assets-source/agency/coco.png', served: 'public/assets/agency/coco.png', size: 320, trim: true},
];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-agency-art.mjs "<folder with the paintings>"');
  prepareArt(folder, AGENCY_ART);
}
