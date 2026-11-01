import {ART_URLS, artKey} from './art';
import {hitBox, type View} from './geometry';
import type {DropTarget, Effect, KitchenItem, KitchenSnapshot} from './engine';
import {ITEMS, type Point} from './recipes';

/** Food states, as the label reads them (gender and number from the item). */
function stateWord(item: KitchenItem): string {
  const e = item.feminine ? 'e' : '', s = item.plural ? 's' : '';
  const words: Record<string, string> = {
    whole: (item.feminine ? 'entière' : 'entier') + s, cut: `coupé${e}${s}`, peeled: `épluché${e}${s}`, raw: `cru${e}${s}`,
    soy: 'à la sauce soja', glazed: `glacé${e}${s} soja-miel`,
  };
  return item.kind === 'food' ? words[item.state] ?? '' : '';
}
/** What a container holds, for its accessible name. */
const CONTENTS: Record<string, string> = {
  'bowl-empty': 'vide', 'bowl-eggs': 'avec les œufs', 'bowl-sugar': 'avec les œufs et le sucre', 'bowl-whisked': 'avec les œufs et le sucre fouettés',
  'bowl-chocolate': 'avec le chocolat fondu', 'bowl-flour': 'avec la farine', 'bowl-batter': 'avec la pâte à gâteau', 'bowl-avocado': 'avec l’avocat coupé',
  'bowl-honey': 'avec l’avocat et le miel', 'bowl-soy': 'avec l’avocat au miel et au soja', 'bowl-shallot': 'avec l’avocat et l’échalote', 'bowl-mixed': 'avec l’avocat et l’échalote mélangés',
  'saucepan-empty': 'vide', 'saucepan-chocolate': 'avec le chocolat', 'saucepan-melted': 'avec le chocolat et le beurre fondus',
  'pan-empty': 'vide', 'pan-bread': 'avec les tartines qui grillent',
  'mould-empty': 'vide', 'mould-batter': 'avec la pâte', 'mould-baked': 'avec le moelleux cuit',
  'dish-empty': 'vide', 'dish-chicken': 'avec le poulet', 'dish-sweet-potato': 'avec la patate douce', 'dish-both': 'avec le poulet et la patate douce', 'dish-cooked': 'avec le poulet et la patate douce cuits',
  'plate-empty': 'vide', 'plate-toast': 'avec les tartines grillées', 'plate-avocado': 'avec les tartines à l’avocat', 'plate-salmon': 'avec l’avocado toast au saumon',
};
const EFFECT_MS = 900;

export function createScene(world: HTMLElement) {
  const nodes = new Map<string, HTMLElement>();
  const effectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let snapFrame = 0;
  let view: View;
  world.innerHTML = '<div class="table-art" aria-hidden="true"></div>';
  for (const item of ITEMS) {
    const interactive = item.kind !== 'fixture';
    const node = document.createElement(interactive ? 'button' : 'div');
    if (node instanceof HTMLButtonElement) { node.type = 'button'; node.draggable = false; } else node.setAttribute('role', 'img');
    node.className = `kitchen-object ${item.kind}`; node.dataset.item = item.id; node.hidden = true;
    node.innerHTML = `<span class="object-shadow" aria-hidden="true"></span><span class="object-art"><img class="art-img" alt="" draggable="false" decoding="async"></span><span class="object-label" aria-hidden="true"></span><span class="object-steam" aria-hidden="true"></span>${item.kind === 'fixture' ? '<span class="cook-ring" aria-hidden="true"></span>' : ''}`;
    world.append(node); nodes.set(item.id, node);
  }
  function move(id: string, point: Point): void {
    const node = nodes.get(id)!;
    node.style.transform = `translate3d(${point.x * view.scale - parseFloat(node.style.width) / 2}px,${point.y * view.scale - parseFloat(node.style.height) / 2}px,0)`;
  }
  function render(snapshot: KitchenSnapshot): void {
    if (!view) return;
    const next = snapshot.steps.filter(s => s.next);
    for (const item of snapshot.items) {
      const node = nodes.get(item.id)!, box = hitBox(item.anchor, item.width, item.height, view);
      node.hidden = !item.visible; node.dataset.location = item.location; node.dataset.state = item.state;
      node.dataset.selected = String(snapshot.selectedId === item.id);
      node.dataset.hint = next.some(s => s.actor === item.id) ? 'actor' : next.some(s => s.target === item.id) ? 'target' : '';
      node.style.width = `${box.width}px`; node.style.height = `${box.height}px`;
      node.style.setProperty('--art-width', `${item.width * view.scale}px`); node.style.setProperty('--art-height', `${item.height * view.scale}px`);
      node.style.setProperty('--label-offset', `${item.height * view.scale / 2 - 4}px`);
      // Fixtures lie under everything; containers under foods and tools; within a layer, the front of the table first.
      node.style.zIndex = String(item.kind === 'fixture' ? 1 + (item.id === 'cutting-board' ? 0 : 1) : (item.kind === 'container' ? 100 : 500) + Math.round(item.anchor.y));
      const key = artKey(item), img = node.querySelector<HTMLImageElement>('.art-img')!;
      if (node.dataset.art !== key) { node.dataset.art = key; img.src = ART_URLS[key] ?? ''; }
      const word = stateWord(item), name = `${item.name} ${word}`.trim();
      node.querySelector<HTMLElement>('.object-label')!.textContent = item.kind === 'fixture' ? '' : name;
      const contents = item.kind === 'container' ? CONTENTS[`${item.art}-${item.state}`] : '';
      const heating = snapshot.cookingHeater === item.id && snapshot.cookingRemainingMs > 0;
      const label = [name, contents, item.location === 'cutting-board' ? 'sur la planche' : '', heating ? `cuisson ${Math.ceil(snapshot.cookingRemainingMs / 1000)} secondes` : ''].filter(Boolean).join(', ');
      node.setAttribute('aria-label', label); node.dataset.accessibleName = label;
      node.dataset.cooking = String(heating || (snapshot.cookingContainer === item.id && snapshot.cookingRemainingMs > 0));
      const progress = snapshot.cookingTotalMs ? (snapshot.cookingTotalMs - snapshot.cookingRemainingMs) / snapshot.cookingTotalMs : 0;
      node.style.setProperty('--cook-progress', `${Math.round(Math.max(0, Math.min(1, progress)) * 360)}deg`);
      if (node instanceof HTMLButtonElement) { node.disabled = snapshot.pauses.length > 0 || !item.interactive; node.setAttribute('aria-pressed', String(snapshot.selectedId === item.id)); }
      if (!node.classList.contains('grabbed')) move(item.id, item.anchor);
    }
  }
  function setView(next: View): void {
    for (const node of nodes.values()) delete node.dataset.feedback;
    view = next; world.style.width = `${view.width}px`; world.style.height = `${view.height}px`; world.style.left = `${view.offsetX}px`; world.style.top = `${view.offsetY}px`;
    world.style.setProperty('--scale', String(view.scale));
  }
  function snap(snapshot: KitchenSnapshot): void {
    if (snapFrame) cancelAnimationFrame(snapFrame);
    world.classList.add('snapping'); render(snapshot);
    snapFrame = requestAnimationFrame(() => { snapFrame = 0; world.classList.remove('snapping'); });
  }
  const clearHover = () => { for (const node of nodes.values()) delete node.dataset.hover; };
  return {
    setView, render, snap, move, getView: () => view,
    playEffect(id: string, effect: Effect) {
      const node = nodes.get(id); if (!node) return;
      const previous = effectTimers.get(id); if (previous) clearTimeout(previous);
      delete node.dataset.effect; void node.offsetWidth; node.dataset.effect = effect;
      effectTimers.set(id, setTimeout(() => { delete node.dataset.effect; effectTimers.delete(id); }, EFFECT_MS));
    },
    begin(id: string) { const n = nodes.get(id)!; n.dataset.feedback = ''; n.classList.add('grabbed'); n.style.zIndex = '999'; },
    hover(target: DropTarget | null, accepted: boolean) { clearHover(); const n = target && nodes.get(target.id); if (n) n.dataset.hover = accepted ? 'valid' : 'invalid'; },
    finish(id: string, snapshot: KitchenSnapshot, result: 'accepted' | 'rejected' | 'cancelled') {
      nodes.get(id)!.classList.remove('grabbed'); nodes.get(id)!.dataset.feedback = result; clearHover(); render(snapshot);
    },
    dispose() { if (snapFrame) cancelAnimationFrame(snapFrame); snapFrame = 0; for (const timer of effectTimers.values()) clearTimeout(timer); effectTimers.clear(); world.replaceChildren(); nodes.clear(); },
  };
}
export type KitchenScene = ReturnType<typeof createScene>;
