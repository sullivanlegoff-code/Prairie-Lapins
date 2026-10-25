import type {Destination} from '../config/balance';

/** Presentation only: Coco, the rabbit who runs the travel agency (not a collectable species), and the building thumbnail. */
export const COCO_URL = `${import.meta.env.BASE_URL}assets/agency/coco.png`;
export const AGENCY_URL = `${import.meta.env.BASE_URL}assets/buildings/travel-agency.png`;
export const HOST_NAME = 'Coco';
function picture(url: string, className: string, width: number, height: number): HTMLImageElement {
  const image = document.createElement('img'); image.className = className; image.src = url; image.alt = ''; image.setAttribute('aria-hidden', 'true');
  image.width = width; image.height = height; image.draggable = false; return image;
}
export const cocoPortrait = () => picture(COCO_URL, 'agency-host-portrait', 226, 320);
export const agencyThumbnail = () => picture(AGENCY_URL, 'statue-thumbnail', 72, 72);
/** « à Londres », « au Caire », « au Lavandou ». */
export const toPlace = (d: Destination) => d.startsWith('Le ') ? `au ${d.slice(3)}` : `à ${d}`;
/** « de Londres », « du Caire », « d’Hammamet ». */
export const fromPlace = (d: Destination) => d.startsWith('Le ') ? `du ${d.slice(3)}` : /^[AEIOUH]/.test(d) ? `d’${d}` : `de ${d}`;
/** Coco's first welcome, one bubble at a time. */
export const COCO_WELCOME = [
  'Salut ! Moi, c’est Coco. Je tiens l’agence de voyage de l’île. Bienvenue !',
  'Ici, tes lapins partent en vacances. Choisis un voyageur : je lui trouve une destination surprise, pour un voyage de 3 à 10 heures.',
  'Pendant son voyage, il garde sa place et ses revenus à la maison, mais il ne peut ni manger, ni aller au nid, ni déménager.',
  'À son retour, il te rapporte des cœurs en souvenir : plus le voyage est long, plus il en rapporte. Bon voyage !',
] as const;
