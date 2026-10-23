import {HABITAT_LEVEL1_ART} from '../config/habitatArt';
import type {HabitatType} from '../config/habitats';

const templates = new Map<HabitatType, HTMLImageElement>();
/**
 * The level-1 illustration of a habitat for its shop card: the very file and size the scene draws from (one artistic authority),
 * no habitat drawn again and no rabbit. One image element per type is made once; every refresh of the shop clones it, and the
 * browser already holds the decoded file because the scene preloads it.
 */
export function habitatThumbnail(type: HabitatType): HTMLImageElement {
  let template = templates.get(type);
  if (!template) {
    const art = HABITAT_LEVEL1_ART[type];
    template = document.createElement('img'); template.className = 'habitat-thumb'; template.src = art.url; template.alt = ''; template.decoding = 'async';
    template.width = art.width; template.height = art.height; template.dataset.habitatArt = type; template.setAttribute('draggable', 'false');
    templates.set(type, template);
  }
  return template.cloneNode() as HTMLImageElement;
}
