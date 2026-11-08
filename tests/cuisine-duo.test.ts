// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {KitchenEngine} from '../cooktap-prototype/engine';
import {commisMood, dressedRabbit} from '../src/ui/CuisineActivity';
import {createKitchenTalk, HINT_DELAY_MS, HINT_REPEAT_MS} from '../src/ui/cuisineTalk';
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
  it('shows a rabbit’s evolved drawing only after its evolution was confirmed', () => {
    const classic = dressedRabbit({id: 'rabbit-1', species: 'paille', affection: 30}, 'commis', true);
    const evolved = dressedRabbit({id: 'rabbit-1', species: 'paille', affection: 30, evolution: {done: true}}, 'commis', true);
    const returnedToClassic = dressedRabbit({id: 'rabbit-1', species: 'paille', affection: 30, evolution: {done: true}, classicLook: true}, 'commis', true);
    expect(classic.querySelector('img')?.getAttribute('src')).toMatch(/paille-v1\.(png|webp)/);
    expect(evolved.querySelector('img')?.getAttribute('src')).toMatch(/paille-v2\.(png|webp)/);
    expect(returnedToClassic.querySelector('img')?.getAttribute('src')).toMatch(/paille-v1\.(png|webp)/);
  });
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

describe('what the cooks say', () => {
  const start = (recipe: 'avocado-toast' | 'moelleux') => { const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: recipe}); return e; };
  it('the commis says the next step after 2 seconds without any action, without flickering, and stops as soon as the player acts', () => {
    const e = start('avocado-toast'), talk = createKitchenTalk(true);
    expect(talk.tick(e.snapshot(), 0).commis).toBeNull();
    expect(talk.tick(e.snapshot(), HINT_DELAY_MS).commis).toBeNull();
    const hint = talk.tick(e.snapshot(), HINT_DELAY_MS + 200).commis!;
    expect(hint).toMatchObject({kind: 'hint', text: 'Pose l’avocat sur la planche !'});
    // Still idle: the same line stays (same key, no flicker) until it pops again after another idle period.
    for (let t = HINT_DELAY_MS + 400; t < HINT_DELAY_MS + 200 + HINT_REPEAT_MS; t += 200) expect(talk.tick(e.snapshot(), t).commis).toBe(hint);
    const again = talk.tick(e.snapshot(), HINT_DELAY_MS + 200 + HINT_REPEAT_MS).commis!;
    expect(again.text).toBe(hint.text); expect(again.key).not.toBe(hint.key);
    expect(talk.action(9000).commis).toBeNull(); expect(talk.tick(e.snapshot(), 10_000).commis).toBeNull();
    // After the step, the hint follows the guide's next step.
    drop(e, 'avocado', 'cutting-board'); talk.success(e.snapshot(), 10_500);
    expect(talk.tick(e.snapshot(), 12_600).commis).toMatchObject({kind: 'hint', text: 'Coupe l’avocat avec le couteau !'});
  });
  it('encourages every third step and announces the oven, never hinting while it cooks', () => {
    const e = start('moelleux'), talk = createKitchenTalk(false); let now = 0;
    const steps = [['chocolate', 'saucepan'], ['butter', 'saucepan'], ['eggs', 'bowl'], ['sugar', 'bowl'], ['whisk', 'bowl'], ['saucepan', 'bowl'], ['flour', 'bowl'], ['whisk', 'bowl'], ['bowl', 'mould']];
    const said: (string | undefined)[] = [];
    for (const [id, target] of steps) { expect(drop(e, id, target).accepted).toBe(true); now += 500; said.push(talk.success(e.snapshot(), now).commis?.text); now += 2700; talk.tick(e.snapshot(), now); }
    expect(said.filter(Boolean)).toHaveLength(3); expect(said[2]).toBe('C’est parti, chef !'); expect(said[8]).toBe('Le plat est bientôt prêt !');
    expect(drop(e, 'mould', 'oven').accepted).toBe(true); talk.success(e.snapshot(), now += 100);
    expect(talk.tick(e.snapshot(), now += 200).commis).toMatchObject({kind: 'cheer', text: 'Prépare tes papilles, la masterclass arrive !'});
    e.advance(3000); expect(talk.tick(e.snapshot(), now += 4000).commis).toBeNull(); // no hint while it cooks
  });
  it('the taster sometimes reacts to a success, never while the commis talks, and stays quiet cooking alone', () => {
    const e = start('avocado-toast'), duo = createKitchenTalk(true), alone = createKitchenTalk(false); let now = 0;
    const reactions: string[] = [];
    for (const [id, target] of [['avocado', 'cutting-board'], ['knife', 'avocado'], ['avocado', 'bowl'], ['honey', 'bowl'], ['soy', 'bowl'], ['shallot', 'cutting-board'], ['knife', 'shallot']]) {
      expect(drop(e, id, target).accepted).toBe(true); now += 3000;
      const said = duo.success(e.snapshot(), now); if (said.taster) { expect(said.commis).toBeNull(); reactions.push(said.taster.text); }
      expect(alone.success(e.snapshot(), now).taster).toBeNull();
    }
    expect(reactions).toEqual(['Ça sent bon !', 'Tu cuisines vraiment bien !']);
    // A hint from the commis silences the taster.
    drop(e, 'shallot', 'bowl'); const after = duo.success(e.snapshot(), now += 3000);
    expect(duo.tick(e.snapshot(), now + 2600).commis).not.toBeNull(); expect(duo.state().taster).toBeNull(); void after;
  });
  it('every line is written with « tu », never « vous »', () => {
    const e = start('avocado-toast'), talk = createKitchenTalk(true); const lines = new Set<string>(); let now = 0;
    for (let n = 0; n < 40; n++) { const s = talk.success(e.snapshot(), now += 3000); for (const l of [s.commis, s.taster]) if (l) lines.add(l.text); }
    for (const text of lines) expect(text).not.toMatch(/\b[Vv]ous\b|\bvos\b|\bvotre\b|ez\b/);
  });
});
