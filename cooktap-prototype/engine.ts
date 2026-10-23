import {ITEMS, ZONES, TOOL_RULES, BOTTLE_RULES, type ItemDefinition, type ZoneDefinition} from './recipes';
export type RecipeId = 'salad' | 'chicken';
export interface KitchenItem extends ItemDefinition {location: string; zoneId: string; flags: Record<string, boolean>}
export type PauseReason = 'portrait' | 'hidden' | 'manual';
export type DropTarget = {kind: 'zone' | 'item'; id: string};
export type Intention =
  | {type: 'drop'; itemId: string; target: DropTarget | null}
  | {type: 'use-tool'; toolId: string; targetId: string}
  | {type: 'select'; itemId: string}
  | {type: 'start-recipe'; recipeId: RecipeId}
  | {type: 'choose-recipe'}
  | {type: 'reset-recipe'};
export interface ActionResult {accepted: boolean; message: string; effect?: 'cut' | 'peel' | 'pour' | 'season' | 'oven' | 'cooked'; effectTargetId?: string}
export interface KitchenSnapshot {items: KitchenItem[]; pauses: PauseReason[]; selectedId: string | null; activeTimeMs: number; invalidActions: number; recipe: RecipeId | null; phase: 'choosing' | 'playing' | 'completed'; cookingRemainingMs: number}
const SALAD_IDS = ['mozzarella', 'tomato', 'cucumber'] as const;
const CHICKEN_IDS = ['chicken', 'sweet-potato'] as const;
const isSaladFood = (id: string): boolean => (SALAD_IDS as readonly string[]).includes(id);
const isChickenFood = (id: string): boolean => (CHICKEN_IDS as readonly string[]).includes(id);
const visibleFor = (recipe: RecipeId, id: string): boolean => recipe === 'salad'
  ? isSaladFood(id) || ['knife', 'cutting-board', 'bowl', 'olive-oil'].includes(id)
  : isChickenFood(id) || ['knife', 'peeler', 'cutting-board', 'soy', 'honey', 'baking-dish', 'oven'].includes(id);

/** All validation and recipe state live here; rendering never grants progress. */
export class KitchenEngine {
  private items: KitchenItem[];
  private pauses = new Set<PauseReason>();
  private selectedId: string | null = null;
  private activeTimeMs = 0;
  private invalidActions = 0;
  private recipe: RecipeId | null = null;
  private phase: KitchenSnapshot['phase'] = 'choosing';
  private cookingRemainingMs = 0;
  constructor(definitions: readonly ItemDefinition[] = ITEMS, readonly zones: readonly ZoneDefinition[] = ZONES) {
    this.items = definitions.map(i => ({...i, anchor: {...i.anchor}, flags: {}, zoneId: i.home,
      location: zones.find(z => z.id === i.home)?.location ?? 'table'}));
    for (const item of this.items) item.visible = false;
  }
  snapshot(): KitchenSnapshot { return {items: this.items.map(i => ({...i, anchor: {...i.anchor}, flags: {...i.flags}})), pauses: [...this.pauses], selectedId: this.selectedId, activeTimeMs: this.activeTimeMs, invalidActions: this.invalidActions, recipe: this.recipe, phase: this.phase, cookingRemainingMs: this.cookingRemainingMs}; }
  get paused(): boolean { return this.pauses.size > 0; }
  setPaused(reason: PauseReason, paused: boolean): void { if (paused) this.pauses.add(reason); else this.pauses.delete(reason); }
  advance(ms: number): void {
    if (this.phase !== 'playing' || this.paused || !Number.isFinite(ms) || ms <= 0) return;
    this.activeTimeMs += ms;
    if (this.cookingRemainingMs > 0) {
      this.cookingRemainingMs = Math.max(0, this.cookingRemainingMs - ms);
      if (this.cookingRemainingMs === 0) {
        for (const id of CHICKEN_IDS) { const food = this.item(id); if (food) food.preparation = 'cooked'; }
        this.phase = 'completed';
      }
    }
  }
  canSelect(id: string): boolean { const i = this.item(id); return this.phase === 'playing' && !this.paused && !!i?.visible && i.interactive; }
  canDrag(id: string): boolean {
    const i = this.items.find(x => x.id === id);
    if (this.phase !== 'playing' || this.paused || !i?.draggable || !i.visible || !i.interactive || this.cookingRemainingMs > 0) return false;
    if (i.kind === 'tool') return i.location === 'tool-rack';
    if (i.id === 'baking-dish') return i.location === 'dish-rack' && this.dishComplete();
    return i.location !== 'bowl' && i.location !== 'baking-dish' && i.location !== 'oven';
  }
  private item(id: string): KitchenItem | undefined { return this.items.find(i => i.id === id); }
  private finish(result: ActionResult, invalid = true): ActionResult { if (!result.accepted && invalid) this.invalidActions++; return result; }
  private dishItems(): KitchenItem[] { return this.items.filter(i => i.location === 'baking-dish' && isChickenFood(i.id)); }
  private dishComplete(): boolean { return CHICKEN_IDS.every(id => this.item(id)?.location === 'baking-dish'); }
  private chickenComplete(): boolean { const c = this.item('chicken'); return !!c && c.preparation === 'cut' && c.flags.soyAdded === true && c.flags.honeyAdded === true; }
  private sweetPotatoComplete(): boolean { const p = this.item('sweet-potato'); return !!p && p.preparation === 'cut'; }
  private saladComplete(): boolean { return SALAD_IDS.every(id => this.item(id)?.location === 'bowl' && this.item(id)?.preparation === 'cut') && this.item('olive-oil')?.flags.oliveOilAdded === true; }
  private occupied(location: string, except: string): boolean { return this.items.some(i => i.id !== except && i.visible && i.kind === 'food' && i.location === location); }
  preview(itemId: string, target: DropTarget | null): ActionResult {
    const no = (message: string): ActionResult => ({accepted: false, message});
    if (this.phase !== 'playing' || this.paused || !this.canDrag(itemId)) return no('La manipulation est désactivée.');
    const item = this.item(itemId)!;
    if (!target) return no('Déposez sur une zone de préparation.');
    if (item.kind === 'bottle') {
      const rule = BOTTLE_RULES.find(r => r.recipe === this.recipe && r.bottle === item.id && r.target === target.id);
      const receiver = this.item(target.id);
      if (!rule || !receiver?.visible || (target.kind === 'zone' && receiver.kind !== 'fixture')) return no('Cette bouteille ne convient pas à cette cible.');
      if (receiver.kind === 'food' && !receiver.interactive) return no('Cet aliment est déjà dans le plat.');
      if (rule.preparation && receiver.preparation !== rule.preparation) return no(rule.preparationMessage!);
      if (rule.requiredFlag && !receiver.flags[rule.requiredFlag]) return no(rule.flagMessage!);
      if (rule.contents && !rule.contents.every(id => this.item(id)?.location === receiver.id && this.item(id)?.preparation === 'cut')) return no('Ajoute d’abord les 3 ingrédients');
      const owner = rule.flagOwner === 'bottle' ? item : receiver;
      if (owner.flags[rule.flag]) return no(rule.duplicateMessage);
      return {accepted: true, message: rule.message, effect: rule.effect, effectTargetId: receiver.id};
    }
    if (target.kind === 'item') {
      if (item.kind === 'tool') {
        const food = this.item(target.id);
        const rules = TOOL_RULES.filter(r => r.recipe === this.recipe && r.tool === item.id && (r.target === 'salad-food' ? !!food && isSaladFood(food.id) : r.target === food?.id));
        if (!food || !rules.length) return no(item.id === 'peeler' ? 'L’économe ne convient pas à cet objet.' : 'Le couteau doit toucher un aliment sur la planche.');
        if (food.location !== rules[0].requiredLocation) return no(item.id === 'peeler' ? 'Pose la patate douce sur la planche.' : 'Pose l’aliment sur la planche.');
        if (food.preparation !== rules[0].requiredPreparation) return no(rules[0].message);
        return {accepted: true, message: `${item.name} utilisé sur ${food.name.toLowerCase()}.`};
      }
      return no('Ces objets ne peuvent pas être combinés.');
    }
    const zone = this.zones.find(z => z.id === target.id);
    if (!zone || !zone.enabled) return no('Cette destination est indisponible.');
    if (item.kind === 'tool') return no('L’outil revient sur son support après usage.');
    if (item.id === 'baking-dish') {
      if (zone.id === 'dish-rack') return no('Le plat est déjà à sa place.');
      return zone.id === 'oven' && this.dishComplete() ? {accepted: true, message: 'Le plat complet part au four.'} : no('Ajoute le poulet et la patate douce dans le plat.');
    }
    if (item.kind !== 'food') return no('Cet objet ne peut pas être déplacé.');
    if (zone.id === item.home) return item.location === 'reserve' ? no('L’aliment est déjà dans sa réserve.') : {accepted: true, message: `${item.name} remis en réserve.`};
    if (zone.id === 'cutting-board') {
      if (this.recipe === 'salad' && item.preparation !== 'whole') return no('Cet ingrédient est déjà coupé.');
      if (this.recipe === 'chicken' && !['raw', 'whole', 'peeled'].includes(item.preparation)) return no('Cet aliment est déjà préparé.');
      if (this.occupied('cutting-board', itemId)) return no('La planche est occupée.');
      return {accepted: true, message: `${item.name} sur la planche.`};
    }
    if (zone.id === 'bowl' && this.recipe === 'salad' && isSaladFood(item.id)) return item.preparation === 'cut' ? {accepted: true, message: `${item.name} ajouté au saladier.`} : no('Coupe-le d’abord.');
    if (zone.id === 'baking-dish' && this.recipe === 'chicken' && isChickenFood(item.id)) {
      if (this.dishItems().length >= 2) return no('Le plat est plein.');
      if (item.id === 'chicken' && !this.chickenComplete()) return no('Assaisonne le poulet après l’avoir coupé.');
      if (item.id === 'sweet-potato' && !this.sweetPotatoComplete()) return no(item.preparation === 'whole' ? 'Épluche puis coupe la patate douce.' : 'Coupe la patate douce.');
      return {accepted: true, message: `${item.name} ajouté au plat.`};
    }
    return no('Cette destination ne convient pas à cet aliment.');
  }
  dispatch(intent: Intention): ActionResult {
    if (intent.type === 'start-recipe') {
      if (this.phase !== 'choosing' || this.paused) return this.finish({accepted: false, message: 'Cette recette n’est pas disponible.'}, false);
      this.resetState(); this.recipe = intent.recipeId; this.phase = 'playing';
      for (const i of this.items) i.visible = visibleFor(intent.recipeId, i.id);
      return {accepted: true, message: intent.recipeId === 'salad' ? 'Préparez les trois ingrédients, puis ajoutez l’huile.' : 'Prépare le poulet et la patate douce, puis enfourne le plat.'};
    }
    if (intent.type === 'choose-recipe') { this.phase = 'choosing'; this.recipe = null; for (const i of this.items) i.visible = false; return {accepted: true, message: 'Choisissez une recette.'}; }
    if (intent.type === 'reset-recipe') {
      if (!this.recipe) return this.finish({accepted: false, message: 'Aucune recette à recommencer.'}, false);
      const recipe = this.recipe; this.resetState(); this.recipe = recipe; this.phase = 'playing';
      for (const i of this.items) i.visible = visibleFor(recipe, i.id);
      return {accepted: true, message: 'Nouvelle recette : les ingrédients sont prêts.'};
    }
    if (this.phase !== 'playing' || this.paused || this.cookingRemainingMs > 0) return this.finish({accepted: false, message: 'Interaction indisponible.'}, false);
    if (intent.type === 'use-tool') {
      const result = this.preview(intent.toolId, {kind: 'item', id: intent.targetId});
      if (!result.accepted) return this.finish(result);
      const food = this.item(intent.targetId)!, tool = this.item(intent.toolId)!;
      const rule = TOOL_RULES.find(r => r.recipe === this.recipe && r.tool === tool.id && (r.target === 'salad-food' ? isSaladFood(food.id) : r.target === food.id) && r.requiredLocation === food.location && r.requiredPreparation === food.preparation)!;
      food.preparation = rule.resultPreparation;
      tool.location = 'tool-rack'; tool.zoneId = tool.home; tool.anchor = {...this.zones.find(z => z.id === tool.home)!.anchor};
      this.selectedId = food.id;
      const effect = rule.resultPreparation === 'peeled' ? 'peel' : 'cut';
      return {accepted: true, message: effect === 'peel' ? 'Patate douce épluchée. Utilise le couteau pour la couper.' : `${food.name} coupé.`, effect, effectTargetId: food.id};
    }
    if (intent.type === 'select') {
      const i = this.item(intent.itemId);
      if (!i?.visible || !i.interactive) return this.finish({accepted: false, message: 'Interaction indisponible.'}, false);
      this.selectedId = i.id;
      return {accepted: true, message: `${i.name}.`};
    }
    const result = this.preview(intent.itemId, intent.target);
    if (!result.accepted) return this.finish(result);
    const item = this.item(intent.itemId)!;
    if (item.kind === 'bottle') {
      const rule = BOTTLE_RULES.find(r => r.recipe === this.recipe && r.bottle === item.id && r.target === intent.target!.id)!;
      const owner = rule.flagOwner === 'bottle' ? item : this.item(rule.target)!;
      owner.flags[rule.flag] = true;
      if (this.saladComplete()) this.phase = 'completed';
      // Applicators never leave their logical home; scene.finish snaps the transient drag back.
      return result;
    }
    if (intent.target?.kind === 'item' && item.kind === 'tool') return this.dispatch({type: 'use-tool', toolId: item.id, targetId: intent.target.id});
    if (intent.target?.kind === 'zone') {
      const zone = this.zones.find(z => z.id === intent.target!.id)!;
      item.location = zone.location; item.zoneId = zone.id; item.anchor = {...zone.anchor};
      if (zone.id === 'bowl' || zone.id === 'baking-dish' || zone.id === 'oven') { item.draggable = false; item.interactive = false; }
      if (zone.id === 'oven' && item.id === 'baking-dish') {
        for (const id of CHICKEN_IDS) { const food = this.item(id)!; food.location = 'oven'; food.zoneId = 'oven'; }
        this.cookingRemainingMs = 5000;
        return {accepted: true, message: 'Le plat cuit au four…', effect: 'oven', effectTargetId: 'oven'};
      }
      if (zone.id === 'baking-dish' && isChickenFood(item.id)) { item.anchor = {...this.item('baking-dish')!.anchor}; item.draggable = false; item.interactive = false; }
    }
    if (this.recipe === 'salad' && this.saladComplete()) this.phase = 'completed';
    return result;
  }
  private resetState(): void {
    for (const current of this.items) {
      const def = ITEMS.find(i => i.id === current.id)!;
      Object.assign(current, {...def, anchor: {...def.anchor}, flags: {}, zoneId: def.home, location: this.zones.find(z => z.id === def.home)?.location ?? 'table'});
    }
    this.activeTimeMs = 0; this.invalidActions = 0; this.selectedId = null; this.cookingRemainingMs = 0;
  }
}
