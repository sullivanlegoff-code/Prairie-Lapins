import {ART, CUT_ART, TABLE, bowlContents} from './art';
import {hitBox, type View} from './geometry';
import type {DropTarget, KitchenSnapshot} from './engine';
import {ITEMS, ZONES, type Point} from './recipes';

const preparation: Record<string, string> = {none: '', whole: 'entier', peeled: 'épluchée', raw: 'cru', cut: 'coupé', cooked: 'cuit'};
const locations: Record<string, string> = {reserve: 'en réserve', 'cutting-board': 'sur la planche', bowl: 'dans le saladier', 'baking-dish': 'dans le plat', oven: 'dans le four', 'tool-rack': 'sur son support', 'dish-rack': 'sur la table', table: 'sur la table'};
const FOOD_NAMES: Record<string, string> = {mozzarella: 'Mozzarella', tomato: 'Tomate', cucumber: 'Concombre', chicken: 'Poulet', 'sweet-potato': 'Patate douce'};
/** Bold glaze over cut chicken: dark soy drizzles first, then a glossy honey coat on top. */
function seasonMark(soy: boolean, honey: boolean): string {
  const drizzle = 'M30 68q22-14 44 0M88 58q20-13 38 1M142 84q16-11 32 0';
  return `<svg class="season-mark" viewBox="0 0 200 150" aria-hidden="true" fill="none" stroke-linecap="round">${soy ? `<path d="${drizzle}" stroke="#4a2c22" stroke-width="8" opacity=".85"/>` : ''}${honey ? '<path d="M28 78q24-12 48 0M86 68q22-12 42 0M140 94q18-10 36 0" stroke="#f2b13d" stroke-width="9" opacity=".9"/><path d="M36 74q8-4 16-2M94 64q8-4 16-2M148 90q7-3 14-1" stroke="#ffe8a8" stroke-width="3"/>' : ''}</svg>`;
}
/** The soy/honey glaze stays visible once the chicken is in the dish. */
function glazeInDish(flags: Record<string, boolean>): string {
  const lines = 'M30 46q14-9 30 0M82 36q14-9 30 0M134 54q14-9 30 0';
  return (flags.soyAdded ? `<path d="${lines}" fill="none" stroke="#4a2c22" stroke-width="5" stroke-linecap="round" opacity=".85"/>` : '') +
    (flags.honeyAdded ? `<path d="${lines}" transform="translate(2 6)" fill="none" stroke="#f2b13d" stroke-width="5" stroke-linecap="round" opacity=".9"/>` : '');
}
function chickenContents(items: KitchenSnapshot['items'], cooking: boolean): string {
  const chicken = items.some(i => i.id === 'chicken'); const potato = items.some(i => i.id === 'sweet-potato');
  // A finished dish keeps its cooked colours (the result overlay sits above it), not the raw ones.
  cooking ||= items.some(i => i.preparation === 'cooked');
  return `<svg viewBox="0 0 200 100" aria-hidden="true" focusable="false">${chicken ? '<path d="M34 39q15-14 29 1l-3 19-22 4-11-12zm51-12q18-10 28 4l-4 21-20 4-10-12zm53 18q15-12 28 1l-2 18-20 3-10-10z" fill="'+(cooking?'#c97b3c':'#e6b59d')+'" stroke="'+(cooking?'#6e3a22':'#9b715d')+'" stroke-width="3"/>' : ''}${chicken && !cooking ? glazeInDish(items.find(i => i.id === 'chicken')!.flags) : ''}${potato ? '<g fill="'+(cooking?'#e8893a':'#eba45d')+'" stroke="'+(cooking?'#8a4a22':'#b76e3b')+'" stroke-width="3"><path d="M85 68l15-17 20 5 2 19-18 8zM125 62l17-15 17 8-1 18-18 5zM54 69l17-13 17 7-2 18-18 5z"/></g>' : ''}${cooking ? '<path d="M53 24q-8-11 0-20m49 20q-8-11 0-20m49 20q-8-11 0-20" fill="none" stroke="#f4a65c" stroke-width="5" stroke-linecap="round" opacity=".8"/>' : ''}</svg>`;
}
export function createScene(world: HTMLElement) {
  const nodes = new Map<string, HTMLElement>(), zoneNodes = new Map<string, HTMLElement>();
  const effectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let snapFrame = 0;
  let view: View;
  world.innerHTML = `<div class="table-art">${TABLE}</div>`;
  for (const zone of ZONES) {
    const node = document.createElement('div'); node.className = 'drop-zone'; node.dataset.zone = zone.id; node.setAttribute('aria-hidden', 'true'); world.append(node); zoneNodes.set(zone.id, node);
  }
  for (const item of ITEMS) {
    const node = document.createElement(item.interactive ? 'button' : 'div');
    if (node instanceof HTMLButtonElement) { node.type = 'button'; node.draggable = false; } else node.setAttribute('role', 'img');
    node.className = `kitchen-object ${item.kind}`; node.dataset.item = item.id;
    node.innerHTML = `<span class="object-art">${ART[item.type]}</span><span class="object-label" aria-hidden="true">${item.name}</span>`;
    world.append(node); nodes.set(item.id, node);
  }
  const fill = document.createElement('div'); fill.className = 'bowl-content'; fill.setAttribute('aria-hidden', 'true'); world.append(fill);
  const dishFill = document.createElement('div'); dishFill.className = 'dish-content'; dishFill.setAttribute('aria-hidden', 'true'); world.append(dishFill);
  // Content layers follow the same transient anchor as their container.
  const contentLayers = new Map([['baking-dish', {node: dishFill, offset: {x: 68, y: 34}}]]);
  function move(id: string, point: Point): void {
    const node = nodes.get(id)!;
    node.style.transform = `translate3d(${point.x * view.scale - parseFloat(node.style.width) / 2}px,${point.y * view.scale - parseFloat(node.style.height) / 2}px,0)`;
    const content = contentLayers.get(id);
    if (content) {
      content.node.style.transform = `translate3d(${(point.x - content.offset.x) * view.scale}px,${(point.y - content.offset.y) * view.scale}px,0)`;
      content.node.style.zIndex = node.classList.contains('grabbed') ? '1000' : '';
    }
  }
  function render(snapshot: KitchenSnapshot): void {
    if (!view) return;
    for (const item of snapshot.items) {
      const node = nodes.get(item.id)!, box = hitBox(item.anchor, item.width, item.height, view);
      node.hidden = !item.visible; node.dataset.location = item.location; node.dataset.preparation = item.preparation; node.dataset.selected = String(snapshot.selectedId === item.id);
      node.dataset.inBowl = String(item.location === 'bowl'); node.dataset.inDish = String(item.kind === 'food' && (item.location === 'baking-dish' || item.location === 'oven'));
      node.dataset.flags = JSON.stringify(item.flags);
      node.style.width = `${box.width}px`; node.style.height = `${box.height}px`;
      node.style.setProperty('--art-width', `${item.width * view.scale}px`); node.style.setProperty('--art-height', `${item.height * view.scale}px`);
      node.style.setProperty('--label-offset', `${item.height * view.scale / 2 + 2}px`);
      node.style.zIndex = String(item.kind === 'fixture' ? 1 : 10 + Math.round(item.anchor.y));
      const genderedState = item.preparation === 'whole' ? (['mozzarella', 'tomato', 'sweet-potato'].includes(item.id) ? 'entière' : 'entier')
        : item.preparation === 'peeled' ? 'épluchée'
          : item.preparation === 'cut' ? (['mozzarella', 'tomato', 'sweet-potato'].includes(item.id) ? 'coupée' : 'coupé')
            : item.preparation === 'cooked' ? (item.id === 'sweet-potato' ? 'cuite' : 'cuit') : preparation[item.preparation];
      const stateName = FOOD_NAMES[item.id] ? `${FOOD_NAMES[item.id]} ${genderedState}` : `${item.name} ${genderedState}`.trim();
      node.querySelector<HTMLElement>('.object-label')!.textContent = stateName;
      const seasoning = [item.flags.soyAdded && 'sauce soja ajoutée', item.flags.honeyAdded && 'miel ajouté'].filter(Boolean).join(', ');
      const label = [stateName, item.kind === 'food' ? locations[item.location] : '', seasoning, item.id === 'olive-oil' && item.flags.oliveOilAdded ? 'huile ajoutée' : ''].filter(Boolean).join(', ');
      node.setAttribute('aria-label', label); node.dataset.accessibleName = label;
      const art = node.querySelector<HTMLElement>('.object-art')!;
      const stateArt = item.preparation === 'cut' || item.preparation === 'cooked' ? CUT_ART[`${item.id}-${item.preparation}`] ?? CUT_ART[item.id] : item.preparation === 'peeled' ? CUT_ART[`${item.id}-peeled`] : null;
      art.innerHTML = stateArt ?? ART[item.type];
      if (item.id === 'chicken' && (item.flags.soyAdded || item.flags.honeyAdded)) art.innerHTML += seasonMark(item.flags.soyAdded === true, item.flags.honeyAdded === true);
      if (node instanceof HTMLButtonElement) { node.disabled = snapshot.pauses.length > 0 || !item.interactive; node.setAttribute('aria-pressed', String(snapshot.selectedId === item.id)); }
      if (!node.classList.contains('grabbed')) move(item.id, item.anchor);
    }
    for (const [id, node] of zoneNodes) {
      const zone = ZONES.find(z => z.id === id);
      node.hidden = zone?.owner ? !snapshot.items.find(i => i.id === zone.owner)?.visible
        : id === 'bowl' ? snapshot.recipe !== 'salad'
          : ['baking-dish', 'dish-rack', 'oven'].includes(id) ? snapshot.recipe !== 'chicken' : false;
    }
    const inside = snapshot.items.filter(item => item.location === 'bowl' && FOOD_NAMES[item.id]).map(item => item.id);
    const bowl = snapshot.items.find(item => item.id === 'bowl')!;
    fill.innerHTML = bowlContents(inside, snapshot.items.find(item => item.id === 'olive-oil')?.flags.oliveOilAdded === true);
    fill.hidden = snapshot.recipe !== 'salad';
    fill.dataset.oiled = String(snapshot.items.find(item => item.id === 'olive-oil')?.flags.oliveOilAdded === true);
    fill.style.width = `${130 * view.scale}px`; fill.style.height = `${78 * view.scale}px`;
    fill.style.transform = `translate3d(${bowl.anchor.x * view.scale - 65 * view.scale}px,${bowl.anchor.y * view.scale - 50 * view.scale}px,0)`;
    fill.setAttribute('aria-label', `Saladier contenant ${inside.length ? inside.map(id => FOOD_NAMES[id]).join(' et ') : 'aucun ingrédient'}${snapshot.items.find(item => item.id === 'olive-oil')?.flags.oliveOilAdded ? ', assaisonné à l’huile d’olive' : ''}`);
    nodes.get('bowl')!.setAttribute('aria-label', fill.getAttribute('aria-label')!);
    nodes.get('bowl')!.dataset.accessibleName = fill.getAttribute('aria-label')!;
    const dishItems = snapshot.items.filter(item => (item.location === 'baking-dish' || item.location === 'oven') && item.kind === 'food');
    dishFill.hidden = snapshot.recipe !== 'chicken';
    dishFill.innerHTML = chickenContents(dishItems, snapshot.cookingRemainingMs > 0);
    const dishNode = nodes.get('baking-dish')!;
    dishNode.setAttribute('aria-label', `Plat de cuisson contenant ${dishItems.length ? dishItems.map(i => `${FOOD_NAMES[i.id] ?? i.name} ${preparation[i.preparation]}`).join(' et ') : 'aucun aliment'}${snapshot.cookingRemainingMs > 0 ? `, cuisson ${Math.ceil(snapshot.cookingRemainingMs / 1000)} secondes` : ''}`);
    dishNode.dataset.accessibleName = dishNode.getAttribute('aria-label')!;
    dishNode.dataset.cooking = String(snapshot.cookingRemainingMs > 0);
    dishNode.dataset.progress = String(snapshot.cookingRemainingMs > 0 ? (5000 - snapshot.cookingRemainingMs) / 5000 : 0);
    dishNode.style.setProperty('--cook-progress', `${Math.max(0, Math.min(1, (5000 - snapshot.cookingRemainingMs) / 5000)) * 100}%`);
    nodes.get('oven')!.dataset.cooking = String(snapshot.cookingRemainingMs > 0);
    dishFill.style.width = `${136 * view.scale}px`; dishFill.style.height = `${66 * view.scale}px`;
    dishFill.setAttribute('aria-label', dishNode.getAttribute('aria-label')!);
  }
  function setView(next: View): void {
    for (const node of nodes.values()) delete node.dataset.feedback;
    view = next; world.style.width = `${view.width}px`; world.style.height = `${view.height}px`; world.style.left = `${view.offsetX}px`; world.style.top = `${view.offsetY}px`;
    for (const zone of ZONES) {
      const box = hitBox(zone.anchor, zone.width, zone.height, view), node = zoneNodes.get(zone.id)!;
      Object.assign(node.style, {left: `${box.left - view.left}px`, top: `${box.top - view.top}px`, width: `${box.width}px`, height: `${box.height}px`});
    }
  }
  function snap(snapshot: KitchenSnapshot): void {
    if (snapFrame) cancelAnimationFrame(snapFrame);
    world.classList.add('snapping'); render(snapshot);
    snapFrame = requestAnimationFrame(() => { snapFrame = 0; world.classList.remove('snapping'); });
  }
  const clearHover = () => { for (const node of [...zoneNodes.values(), ...nodes.values()]) delete node.dataset.hover; };
  return {
    setView, render, snap, move, getView: () => view,
    playEffect(id: string, effect: 'cut' | 'peel' | 'pour' | 'dressed' | 'season' | 'oven' | 'cooked') {
      const node = effect === 'dressed' ? fill : nodes.get(id); if (!node) return;
      const key = `${id}:${effect}`, previous = effectTimers.get(key); if (previous) clearTimeout(previous);
      delete node.dataset.effect; void node.offsetWidth; node.dataset.effect = effect;
      effectTimers.set(key, setTimeout(() => { delete node.dataset.effect; effectTimers.delete(key); }, 800));
    },
    begin(id: string) { const n = nodes.get(id)!; n.dataset.feedback = ''; n.classList.add('grabbed'); n.style.zIndex = '999'; },
    hover(target: DropTarget | null, accepted: boolean) { clearHover(); const n = target && (target.kind === 'zone' ? zoneNodes : nodes).get(target.id); if (n) n.dataset.hover = accepted ? 'valid' : 'invalid'; },
    finish(id: string, snapshot: KitchenSnapshot, result: 'accepted' | 'rejected' | 'cancelled') {
      nodes.get(id)!.classList.remove('grabbed'); nodes.get(id)!.dataset.feedback = result; clearHover(); render(snapshot);
    },
    dispose() { if (snapFrame) cancelAnimationFrame(snapFrame); snapFrame = 0; for (const timer of effectTimers.values()) clearTimeout(timer); effectTimers.clear(); world.replaceChildren(); nodes.clear(); zoneNodes.clear(); },
  };
}
export type KitchenScene = ReturnType<typeof createScene>;
