import {ITEMS, RECIPES, recipe as recipeOf, type ItemDefinition, type Point, type RecipeDefinition, type RecipeId, type StateChanges, type StepDefinition, type StepEffect} from './recipes';
export type {RecipeId} from './recipes';
/** `location`: where the item is (`home`, `cutting-board`, `merged` once it joined a container, `heating` while cooking). */
export interface KitchenItem extends ItemDefinition {anchor: Point; home: Point; location: string; visible: boolean; interactive: boolean}
export type PauseReason = 'portrait' | 'hidden' | 'manual';
export type DropTarget = {kind: 'zone' | 'item'; id: string};
export type Intention =
  | {type: 'drop'; itemId: string; target: DropTarget | null}
  | {type: 'use-tool'; toolId: string; targetId: string}
  | {type: 'select'; itemId: string}
  | {type: 'start-recipe'; recipeId: RecipeId}
  | {type: 'choose-recipe'}
  | {type: 'reset-recipe'};
export type Effect = StepEffect | 'cooked';
export interface ActionResult {accepted: boolean; message: string; effect?: Effect; effectTargetId?: string}
/** One step as the guide shows it. */
export interface GuideStep {chip: string; hint: string; actor: string; target: string; done: boolean; next: boolean}
export interface KitchenSnapshot {
  items: KitchenItem[]; pauses: PauseReason[]; selectedId: string | null; activeTimeMs: number; invalidActions: number;
  recipe: RecipeId | null; phase: 'choosing' | 'playing' | 'completed';
  cookingRemainingMs: number; cookingTotalMs: number; cookingHeater: string | null; cookingContainer: string | null;
  steps: GuideStep[]; doneSteps: number; totalSteps: number;
  /** Index in `steps` of the instruction to show, -1 when none. */
  current: number;
}
const BOARD = 'cutting-board';

/** All validation and recipe state live here; rendering never grants progress. */
export class KitchenEngine {
  private items: KitchenItem[];
  private pauses = new Set<PauseReason>();
  private selectedId: string | null = null;
  private activeTimeMs = 0;
  private invalidActions = 0;
  private recipe: RecipeDefinition | null = null;
  private phase: KitchenSnapshot['phase'] = 'choosing';
  /** Steps done, by chain (the finale is the last entry). */
  private progress: number[] = [];
  private cooking: {remaining: number; step: StepDefinition} | null = null;
  constructor(private readonly definitions: readonly ItemDefinition[] = ITEMS) {
    this.items = definitions.map(def => this.fresh(def, null));
  }
  private fresh(def: ItemDefinition, recipe: RecipeDefinition | null): KitchenItem {
    const at = recipe?.layout[def.id];
    return {...def, anchor: {...(at ?? {x: 0, y: 0})}, home: {...(at ?? {x: 0, y: 0})}, location: 'home', visible: !!at, interactive: !!at && def.kind !== 'fixture'};
  }
  snapshot(): KitchenSnapshot {
    const next = new Set(this.available()), shown = this.nextStep();
    const lanes = this.recipe ? [...this.recipe.chains, this.recipe.finale] : [];
    const flat = lanes.flat();
    const steps = lanes.flatMap((lane, index) => lane.map((s, k) => ({chip: s.chip, hint: s.hint, actor: s.actor, target: s.target, done: k < (this.progress[index] ?? 0), next: next.has(s)})));
    return {
      items: this.items.map(i => ({...i, anchor: {...i.anchor}, home: {...i.home}})), pauses: [...this.pauses], selectedId: this.selectedId,
      activeTimeMs: this.activeTimeMs, invalidActions: this.invalidActions, recipe: this.recipe?.id ?? null, phase: this.phase,
      cookingRemainingMs: this.cooking?.remaining ?? 0, cookingTotalMs: this.cooking?.step.cook!.ms ?? 0,
      cookingHeater: this.cooking?.step.cook!.heater ?? null, cookingContainer: this.cooking?.step.cook!.container ?? null,
      steps, doneSteps: steps.filter(s => s.done).length, totalSteps: steps.length, current: shown ? flat.indexOf(shown) : -1,
    };
  }
  get paused(): boolean { return this.pauses.size > 0; }
  setPaused(reason: PauseReason, paused: boolean): void { if (paused) this.pauses.add(reason); else this.pauses.delete(reason); }
  /** Steps that can be done now: the next one of every unfinished chain, then the finale's next once every chain is done. */
  private available(): StepDefinition[] {
    if (!this.recipe || this.phase !== 'playing' || this.cooking) return [];
    const chains = this.recipe.chains.map((chain, index) => chain[this.progress[index]]).filter(Boolean);
    if (chains.length) return chains;
    const finale = this.recipe.finale[this.progress[this.recipe.chains.length]];
    return finale ? [finale] : [];
  }
  /** The instruction to show: a chain already using the board goes first, a step blocked by the busy board last. */
  nextStep(): StepDefinition | null {
    const steps = this.available(), onBoard = this.items.find(i => i.location === BOARD)?.id;
    return steps.find(s => s.actor === onBoard || s.target === onBoard) ?? steps.find(s => !(s.target === BOARD && onBoard)) ?? steps[0] ?? null;
  }
  /** Active time only; returns the end of a cooking, if this tick finished one. */
  advance(ms: number): ActionResult | null {
    if (this.phase !== 'playing' || this.paused || !Number.isFinite(ms) || ms <= 0) return null;
    this.activeTimeMs += ms;
    if (!this.cooking) return null;
    this.cooking.remaining = Math.max(0, this.cooking.remaining - ms);
    if (this.cooking.remaining > 0) return null;
    const cook = this.cooking.step.cook!; this.cooking = null;
    this.apply(cook.set);
    for (const id of cook.hide ?? []) this.merge(this.item(id)!);
    for (const id of cook.show ?? []) { const back = this.item(id)!; Object.assign(back, {visible: true, location: 'home', anchor: {...back.home}}); back.interactive = back.draggable; }
    this.completeIfDone();
    return {accepted: true, message: cook.message, effect: 'cooked', effectTargetId: cook.container};
  }
  canSelect(id: string): boolean { const i = this.item(id); return this.phase === 'playing' && !this.paused && !!i?.visible && i.interactive; }
  canDrag(id: string): boolean {
    const i = this.item(id);
    return this.phase === 'playing' && !this.paused && !this.cooking && !!i?.draggable && i.visible && i.interactive;
  }
  private item(id: string): KitchenItem | undefined { return this.items.find(i => i.id === id); }
  private finish(result: ActionResult, invalid = true): ActionResult { if (!result.accepted && invalid) this.invalidActions++; return result; }
  private apply(changes: StateChanges | undefined): void {
    for (const [id, change] of Object.entries(changes ?? {})) {
      const target = this.item(id)!;
      target.state = typeof change === 'string' ? change : change[target.state] ?? target.state;
    }
  }
  private merge(i: KitchenItem): void { i.visible = false; i.interactive = false; i.location = 'merged'; }
  private completeIfDone(): void {
    if (this.recipe && !this.cooking && this.available().length === 0) { this.phase = 'completed'; this.selectedId = null; }
  }
  /** Why a drop is refused, with the next instruction when the item is simply early or misplaced. */
  preview(itemId: string, target: DropTarget | null): ActionResult {
    const no = (message: string): ActionResult => ({accepted: false, message});
    if (this.phase !== 'playing' || this.paused || !this.canDrag(itemId)) return no('La manipulation est désactivée.');
    if (!target) return no('Dépose-le sur un ustensile de la table.');
    const receiver = this.item(target.id);
    if (!receiver?.visible || receiver.id === itemId) return no('Dépose-le sur un ustensile de la table.');
    const steps = this.available(), match = steps.find(s => s.actor === itemId && s.target === receiver.id);
    if (match) {
      const busy = this.items.find(i => i.location === BOARD && i.visible);
      if (match.target === BOARD && busy) return no(`La planche est occupée : ${busy.name.toLowerCase()} d’abord.`);
      return {accepted: true, message: match.message, effect: match.effect, effectTargetId: match.target};
    }
    const mine = steps.find(s => s.actor === itemId);
    if (mine) return no(`Pas ici : ${lower(mine.hint)}.`);
    const next = this.nextStep();
    const later = this.recipe && [...this.recipe.chains.flat(), ...this.recipe.finale].some(s => s.actor === itemId && !this.isDone(s));
    if (later && next) return no(`Pas encore : ${lower(next.hint)}.`);
    return no(next ? `Ce n’est plus utile. ${next.hint}.` : 'Ce n’est plus utile.');
  }
  private isDone(s: StepDefinition): boolean {
    const lanes = [...this.recipe!.chains, this.recipe!.finale];
    return lanes.some((lane, index) => { const k = lane.indexOf(s); return k >= 0 && k < this.progress[index]; });
  }
  dispatch(intent: Intention): ActionResult {
    if (intent.type === 'start-recipe') {
      if (this.phase !== 'choosing' || this.paused || !RECIPES.some(r => r.id === intent.recipeId)) return this.finish({accepted: false, message: 'Cette recette n’est pas disponible.'}, false);
      this.begin(recipeOf(intent.recipeId));
      return {accepted: true, message: `${this.nextStep()!.hint}.`};
    }
    if (intent.type === 'choose-recipe') {
      this.phase = 'choosing'; this.recipe = null; this.cooking = null; this.items = this.definitions.map(def => this.fresh(def, null));
      return {accepted: true, message: 'Choisis une recette.'};
    }
    if (intent.type === 'reset-recipe') {
      if (!this.recipe) return this.finish({accepted: false, message: 'Aucune recette à recommencer.'}, false);
      this.begin(this.recipe);
      return {accepted: true, message: `Nouvelle recette : ${lower(this.nextStep()!.hint)}.`};
    }
    if (this.phase !== 'playing' || this.paused || this.cooking) return this.finish({accepted: false, message: this.cooking ? 'Patiente pendant la cuisson…' : 'Interaction indisponible.'}, false);
    if (intent.type === 'select') {
      const i = this.item(intent.itemId);
      if (!i?.visible || !i.interactive) return this.finish({accepted: false, message: 'Interaction indisponible.'}, false);
      this.selectedId = i.id;
      const mine = this.available().find(s => s.actor === i.id);
      return {accepted: true, message: mine ? `${i.name} : ${lower(mine.hint)}.` : `${i.name}.`};
    }
    const itemId = intent.type === 'use-tool' ? intent.toolId : intent.itemId;
    const target: DropTarget | null = intent.type === 'use-tool' ? {kind: 'item', id: intent.targetId} : intent.target;
    const result = this.preview(itemId, target);
    if (!result.accepted) return this.finish(result);
    const lanes = [...this.recipe!.chains, this.recipe!.finale], steps = this.available();
    const s = steps.find(x => x.actor === itemId && x.target === target!.id)!;
    const lane = lanes.findIndex((l, index) => l[this.progress[index]] === s);
    this.progress[lane]++;
    const actor = this.item(itemId)!, receiver = this.item(s.target)!;
    if (s.move) { actor.location = receiver.id; actor.anchor = {...receiver.anchor, y: receiver.anchor.y - 8}; }
    if (s.hide) this.merge(actor);
    this.apply(s.set);
    this.selectedId = s.move ? actor.id : null;
    if (s.cook) {
      this.cooking = {remaining: s.cook.ms, step: s};
      // A container put in the oven waits inside it, out of sight; a pan stays on the stove.
      if (s.hide && s.cook.container === actor.id) actor.location = 'heating';
    }
    this.completeIfDone();
    return result;
  }
  private begin(r: RecipeDefinition): void {
    this.recipe = r; this.phase = 'playing'; this.cooking = null; this.progress = [...r.chains.map(() => 0), 0];
    this.items = this.definitions.map(def => this.fresh(def, r));
    this.activeTimeMs = 0; this.invalidActions = 0; this.selectedId = null;
  }
}
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
