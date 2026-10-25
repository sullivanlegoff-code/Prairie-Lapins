import {ORDERS, type OrderId} from '../config/balance';

/** Presentation only: the painted icon of each crop (also drawn on the farm's furrows when ripe) and the sprout. */
export const CROP_URL = (id: OrderId): string => `${import.meta.env.BASE_URL}assets/food/${id}.png`;
export const CROP_TEXTURE = (id: OrderId): string => `crop-${id}`;
export const SPROUT_URL = `${import.meta.env.BASE_URL}assets/food/pousse.png`;
export const SPROUT_TEXTURE = 'crop-sprout';
export const CROP_IDS = Object.keys(ORDERS) as OrderId[];
export function cropIcon(id: OrderId): HTMLImageElement {
  const icon = document.createElement('img'); icon.className = 'crop-icon'; icon.src = CROP_URL(id); icon.alt = ''; icon.setAttribute('aria-hidden', 'true');
  icon.width = 44; icon.height = 44; icon.draggable = false; return icon;
}
/** « 5 min », « 1 h », « 1 h 30 ». */
export function cropDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000), hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest}` : ''}` : `${minutes} min`;
}
export const STATUE_URL = `${import.meta.env.BASE_URL}assets/buildings/statue-affection.png`;
/** The Statue de l'Affection in the building shop. */
export function statueThumbnail(): HTMLImageElement {
  const image = document.createElement('img'); image.className = 'statue-thumbnail'; image.src = STATUE_URL; image.alt = ''; image.setAttribute('aria-hidden', 'true');
  image.width = 72; image.height = 77; image.draggable = false; return image;
}
