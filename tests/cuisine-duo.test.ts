import {describe, expect, it} from 'vitest';
import {KitchenEngine} from '../cooktap-prototype/engine';
import {commisMood} from '../src/ui/CuisineActivity';
import {CUISINE_ANCHORS, DEFAULT_ANCHORS, cuisineAnchors} from '../src/config/cuisineAnchors';
import {SPECIES_IDS} from '../src/config/species';

const drop = (e: KitchenEngine, id: string, target: string) => e.dispatch({type: 'drop', itemId: id, target: {kind: 'item', id: target}});

describe('commis mood, read from the kitchen state', () => {
  it('covers its eyes while the shallot is on the board, then calms down', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'avocado-toast'});
    expect(commisMood(e.snapshot())).toBe('idle');
    drop(e, 'avocado', 'cutting-board'); e.dispatch({type: 'use-tool', toolId: 'knife', targetId: 'avocado'});
    for (const [id, target] of [['avocado', 'bowl'], ['honey', 'bowl'], ['soy', 'bowl'], ['shallot', 'cutting-board']]) expect(drop(e, id, target).accepted).toBe(true);
    expect(commisMood(e.snapshot())).toBe('teary');
    e.dispatch({type: 'use-tool', toolId: 'knife', targetId: 'shallot'}); expect(commisMood(e.snapshot())).toBe('teary');
    expect(drop(e, 'shallot', 'bowl').accepted).toBe(true); expect(commisMood(e.snapshot())).toBe('idle');
    drop(e, 'spoon', 'bowl'); expect(drop(e, 'bread', 'pan').accepted).toBe(true);
    expect(commisMood(e.snapshot())).toBe('sniff'); // toast in the pan
  });
  it('sniffs the chocolate and waits impatiently at the oven', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'moelleux'});
    expect(commisMood(e.snapshot())).toBe('sniff');
    for (const [id, target] of [['chocolate', 'saucepan'], ['butter', 'saucepan'], ['eggs', 'bowl'], ['sugar', 'bowl'], ['whisk', 'bowl'], ['saucepan', 'bowl'], ['flour', 'bowl'], ['whisk', 'bowl'], ['bowl', 'mould']])
      expect(drop(e, id, target).accepted).toBe(true);
    expect(commisMood(e.snapshot())).toBe('idle');
    expect(drop(e, 'mould', 'oven').accepted).toBe(true); expect(commisMood(e.snapshot())).toBe('impatient');
    e.advance(5000); expect(commisMood(e.snapshot())).toBe('idle');
  });
});

describe('Cuisine accessory anchors', () => {
  it('place the toque, the bib and the paws inside every current sprite', () => {
    for (const species of SPECIES_IDS) {
      const anchors = CUISINE_ANCHORS[species]; expect(anchors, species).toBeDefined();
      for (const point of [anchors!.hat, anchors!.bib, anchors!.eyes]) for (const value of [point.x, point.y, point.w]) expect(value).toBeGreaterThan(0), expect(value).toBeLessThan(1);
      // The toque sits above the eyes, the bib below them.
      expect(anchors!.hat.y).toBeLessThan(anchors!.eyes.y); expect(anchors!.bib.y).toBeGreaterThan(anchors!.eyes.y);
    }
  });
  it('give a new rabbit a default placement that follows its facing', () => {
    const unknown = 'nouveau' as (typeof SPECIES_IDS)[number];
    expect(cuisineAnchors(unknown, 1)).toBe(DEFAULT_ANCHORS);
    const left = cuisineAnchors(unknown, -1);
    expect(left.hat.x).toBeCloseTo(1 - DEFAULT_ANCHORS.hat.x); expect(left.hat.r).toBe(-DEFAULT_ANCHORS.hat.r);
    expect(left.bib.x).toBeCloseTo(1 - DEFAULT_ANCHORS.bib.x); expect(left.eyes.y).toBe(DEFAULT_ANCHORS.eyes.y);
  });
});
