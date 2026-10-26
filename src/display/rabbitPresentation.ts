import {TYPE_NAMES, RARITY_NAMES} from '../ui/models';
import {SPECIES, type RabbitType, type SpeciesId} from '../config/balance';

export const ELEMENT_COLORS: Record<RabbitType, string> = {paille: '#f6e9c8', neige: '#e4f1f7', feu: '#fae4d4', metal: '#e5eaed', vol: '#e7f3fa', 'arc-en-ciel': '#f2e8f5'};
export const elementUrl = (type: RabbitType) => `${import.meta.env.BASE_URL}assets/elements/${type}.png`;
export function elementIcon(type: RabbitType): HTMLElement {
  const group = document.createElement('span'); group.className = 'element-icon'; group.title = TYPE_NAMES[type];
  const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = TYPE_NAMES[type];
  if (type !== 'arc-en-ciel') {
    const image = document.createElement('img'); image.src = elementUrl(type); image.alt = ''; image.setAttribute('aria-hidden', 'true'); image.width = 22; image.height = 22; group.append(image);
  } else { const fallback = document.createElement('span'); fallback.textContent = '🌈'; fallback.setAttribute('aria-hidden', 'true'); group.append(fallback); }
  group.append(label); return group;
}
/** Keeps exact textContent and separators for plain-text consumers and assistive technology. */
export function decorateRabbitText(host: HTMLElement): void {
  for (const child of [...host.childNodes]) {
    if (child.nodeType !== 3) continue;
    const text = child.textContent ?? '';
    // Only a type list followed by its rarity is presentation metadata, never prose or names.
    const match = text.match(/^(paille|neige|feu|métal|vol|arc-en-ciel)((?: \+ (?:paille|neige|feu|métal|vol|arc-en-ciel))*) · (Commun|Rare|Épique|Légendaire|Mythique)/);
    if (!match) continue;
    const fragments: Node[] = [];
    for (const [index, name] of (match[1] + match[2]).split(' + ').entries()) {
      if (index) fragments.push(document.createTextNode(' + '));
      const type = (Object.keys(TYPE_NAMES) as RabbitType[]).find(t => TYPE_NAMES[t] === name)!; fragments.push(elementIcon(type));
    }
    fragments.push(document.createTextNode(' · '));
    const rarity = document.createElement('span'); rarity.className = 'rarity-label'; rarity.textContent = match[3];
    rarity.dataset.rarity = Object.keys(RARITY_NAMES).find(key => RARITY_NAMES[key as keyof typeof RARITY_NAMES] === match[3]);
    fragments.push(rarity, document.createTextNode(text.slice(match[0].length))); child.replaceWith(...fragments);
  }
}
export function rabbitTheme(host: HTMLElement, species: SpeciesId): void {
  const info = SPECIES[species]; host.dataset.rarity = info.rarity; host.dataset.elements = info.types.join(' ');
  host.style.setProperty('--element-from', ELEMENT_COLORS[info.types[0]]);
  host.style.setProperty('--element-to', ELEMENT_COLORS[info.types[1] ?? info.types[0]]);
}
export function clearRabbitTheme(host: HTMLElement): void {
  delete host.dataset.rarity; delete host.dataset.elements;
  host.style.removeProperty('--element-from'); host.style.removeProperty('--element-to');
}
