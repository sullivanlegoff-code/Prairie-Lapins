import {z} from 'zod';
import {RABBIT_TYPES} from './species';
import {RARITY_IDS} from './rarities';
import {BALANCE} from './balance';
import {PROGRESSION} from './progression';

export interface SpeciesDiagnostic {index: number; species: string; field: string; message: string}
const nonempty = z.string().refine(value => value.trim().length > 0, 'Expected a nonempty string');
const positive = z.number().finite().positive();
const elements = z.array(z.enum(RABBIT_TYPES)).min(1).refine(values => new Set(values).size === values.length, 'Duplicate elements');
// RGB hex is shared by SVG and Phaser; CSS-only colours and alpha are not supported by both renderers.
const colour = z.string().regex(/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i, 'Expected an RGB hex colour');
const coat = z.object({body: colour, patch: colour, lop: z.boolean().optional(), wings: z.boolean().optional(),
  flame: z.boolean().optional(), metal: z.boolean().optional(), glasses: z.boolean().optional(),
  plumage: z.boolean().optional(), frost: z.boolean().optional()});
const art = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('procedural'), coat}),
  z.object({kind: z.literal('static-sprite'), file: z.string().refine(file =>
    file.startsWith('assets/rabbits/') && !/[\\:%?#\s]/.test(file)
    && file.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), 'Expected a relative file inside assets/rabbits/'),
    texture: nonempty, width: positive.int(), height: positive.int(), worldWidth: positive,
    groundY: z.number().finite(), preloadOrder: z.number().int().nonnegative(), facing: z.enum(['left', 'right']).optional()}),
]);
const acquisition = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('shop'), price: z.number().int().nonnegative()}),
  z.object({kind: z.literal('historical-breeding')}),
  z.object({kind: z.literal('recipe'), requiredTypes: elements.refine(values => values.length <= 4, 'At most four required elements').optional(),
    parents: z.tuple([nonempty, nonempty]).optional(),
    minAffection: z.number().int().min(BALANCE.minAffection).max(BALANCE.maxAffection),
    probability: positive.lt(100).optional(), knowledgePrice: z.number().int().nonnegative().optional(),
    giftedAtStart: z.boolean().optional(), guaranteeEligible: z.boolean().optional()}),
]).superRefine((source, ctx) => {
  if (source.kind === 'recipe' && !source.requiredTypes?.length && !source.parents)
    ctx.addIssue({code: 'custom', path: ['requiredTypes'], message: 'Recipe requires elements or exact parents'});
  if (source.kind === 'recipe' && source.giftedAtStart === true && source.knowledgePrice !== undefined)
    ctx.addIssue({code: 'custom', path: ['knowledgePrice'], message: 'Starting gift cannot also be sold'});
  if (source.kind === 'recipe' && source.guaranteeEligible === true && source.probability !== undefined)
    ctx.addIssue({code: 'custom', path: ['guaranteeEligible'], message: 'Special probability recipes cannot join the guarantee'});
});
const rarityIds = new Set<string>(RARITY_IDS);
const entrySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Expected a stable lowercase kebab-case id'),
  name: nonempty, description: nonempty.optional(), rarity: z.string().refine(value => rarityIds.has(value), 'Unknown rarity'),
  types: elements,
  progression: z.object({unlockLevel: z.number().int().min(PROGRESSION.curve.initialLevel).max(PROGRESSION.curve.maximumLevel)}),
  acquisition: z.array(acquisition), art,
});

/** Pure catalogue check, called by tests only. Accepts raw entries, not a lookup: repeated ids must remain observable.
 * Does not mutate/normalise input, inspect files, generate candidates or analyse recipe satisfiability.
 * Loading-order values need to be unique nonnegative integers, but need not be contiguous.
 */
export function validateSpeciesEntries(entries: readonly unknown[]): SpeciesDiagnostic[] {
  const diagnostics: SpeciesDiagnostic[] = [];
  const ids = new Set<string>(), textures = new Set<string>(), orders = new Set<number>();
  const rawId = (entry: unknown): unknown => entry !== null && typeof entry === 'object' && 'id' in entry ? entry.id : undefined;
  const referencedIds = new Set(entries.map(rawId).filter((id): id is string => typeof id === 'string'));
  entries.forEach((entry, index) => {
    const id = rawId(entry), species = typeof id === 'string' && id ? id : `<entry ${index}>`;
    const issue = (field: string, message: string) => {diagnostics.push({index, species, field, message});};
    if (typeof id === 'string') {
      if (ids.has(id)) issue('id', 'Duplicate species id');
      ids.add(id);
    }
    const result = entrySchema.safeParse(entry);
    if (!result.success) {
      for (const error of result.error.issues) issue(error.path.join('.') || 'entry', error.message);
      return;
    }
    const definition = result.data, sources = new Set<string>();
    for (const [sourceIndex, source] of definition.acquisition.entries()) {
      const field = `acquisition.${sourceIndex}`;
      if (sources.has(source.kind)) issue(`${field}.kind`, 'Duplicate acquisition source');
      sources.add(source.kind);
      if (source.kind === 'recipe') for (const [parentIndex, parent] of (source.parents ?? []).entries())
        if (!referencedIds.has(parent)) issue(`${field}.parents.${parentIndex}`, `Unknown parent species: ${parent}`);
    }
    if (definition.art.kind === 'static-sprite') {
      if (textures.has(definition.art.texture)) issue('art.texture', 'Duplicate texture key');
      textures.add(definition.art.texture);
      if (orders.has(definition.art.preloadOrder)) issue('art.preloadOrder', 'Duplicate preload order');
      orders.add(definition.art.preloadOrder);
    }
  });
  return diagnostics;
}
