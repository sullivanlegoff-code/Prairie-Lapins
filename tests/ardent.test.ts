import {describe, expect, it, vi} from 'vitest';
import {SPECIES, SPECIES_ENTRIES, SPECIES_IDS} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {GUARANTEE_SPECIES, MINUTE, growthDuration} from '../src/config/balance';
import {RECIPE_PRICES, GIFTED_RECIPES} from '../src/config/recipes';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {breedingWeights, breedingOdds, breedingPool, recipeMatches} from '../src/simulation/breeding';
import {collectionView, nurseryView} from '../src/ui/models';
import {habitatEntryReason} from '../src/simulation/habitats';
import {regressionStart} from './regression-start';
import {sendToNursery} from './manual-transfer';
import {stateBaby} from './nursery-baby';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import type {GameState, Command} from '../src/state/types';
import {EXPECTED_IDS} from './rabbit-art-fixtures';

const description = 'Un lapin semblable à une torche humaine, entièrement composé de feu.';
function run(s: GameState, command: Command, now = 0) {const r = act(s, command, now, () => .99); if (!r.ok) throw Error(r.reason); return r.state;}
function reload(s: GameState) {const decoded = decodeGame(encodeGame(s)); expect(decoded).toEqual({ok: true, state: s}); if (!decoded.ok) throw Error(decoded.reason); return decoded.state;}
function parents() {
  let s = regressionStart(0); s.rabbits[1].species = 'feu'; s.discovered = ['paille', 'feu'];
  s.rabbits.forEach(r => r.affection = 2);
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20});
  return run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
}
describe('approved Ardent content', () => {
  it('keeps Ardent in its original position, with explicit recipe, Rare policies and no undecided acquisition policies or coat', () => {
    expect(SPECIES_IDS[9]).toBe('ardent'); expect(SPECIES_IDS).toEqual(EXPECTED_IDS);
    expect(validateSpeciesEntries(SPECIES_ENTRIES)).toEqual([]);
    expect(SPECIES.ardent).toEqual({name: 'Ardent', description, types: ['feu', 'paille'], rarity: 'rare', price: null,
      progression: {unlockLevel: 1}, acquisition: [{kind: 'recipe',guaranteeEligible:true, requiredTypes: ['feu', 'paille'], minAffection: 2}],
      recipe: {requiredTypes: ['feu', 'paille'], minAffection: 2}, art: {kind: 'static-sprite', file: 'assets/rabbits/ardent/ardent-v1.png', texture: 'rabbit-ardent-original-v1', width: 461, height: 421, worldWidth: 52, groundY: 13, preloadOrder: 8}});
    expect(SPECIES.feu.progression.unlockLevel).toBe(5); expect(growthDuration('ardent')).toBe(30 * MINUTE);
    expect(RECIPE_PRICES.ardent).toBeUndefined(); expect(GIFTED_RECIPES).not.toContain('ardent'); expect(GUARANTEE_SPECIES).toContain('ardent');
    expect(act(parents(), {type: 'buyRabbit', species: 'ardent', enclosureId: 'building-1'}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('uses either parent order and accepts both elements on one parent, while checking both affection thresholds', () => {
    for (const [a,b] of [['paille','feu'], ['bouee','paille'], ['ardent','neige']] as const) {
      for (const [x,y] of [[a,b],[b,a]] as const) {
        expect(recipeMatches('ardent', x, y)).toBe(true); expect(breedingWeights(x,y,2,2).ardent).toBe(30);
        expect(breedingWeights(x,y,1,2).ardent).toBeUndefined(); expect(breedingWeights(x,y,2,1).ardent).toBeUndefined();
      }
    }
    for (const [a,b] of [['paille','neige'], ['feu','volant']] as const) {
      expect(recipeMatches('ardent',a,b)).toBe(false); expect(breedingWeights(a,b,20,20).ardent).toBeUndefined();
    }
  });
  it('gives only the two Rares to two commons (owner decision of 27 October 2026), like Paille × Neige', () => {
    expect(breedingWeights('paille','feu',2,2)).toEqual({ardent:30,snk:30});
    expect(breedingOdds('feu','paille',2,2)).toEqual({ardent:50,snk:50});
    expect(breedingOdds('paille','feu',4,4)).toEqual({ardent:50,snk:50});
    const s = parents(); s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5}; s.pityFailures = 7;
    expect(breedingPool(s,'paille','feu',4,4)).toMatchObject({weights:{ardent:1,snk:1},guaranteed:true});
    expect(breedingPool(s,'paille','feu',2,2)).toMatchObject({weights:{ardent:1,snk:1},guaranteed:true});
    expect(breedingOdds('paille','neige',2,2)).toEqual({frisket:50,icy:50});
  });
  it('keeps a real Ardent birth through save/reload without redrawing, transfer, growth and compatible welcome', () => {
    const s = parents(), rng = vi.fn(() => .25), data = new Map([[SAVE_KEY, encodeGame(s)]]);
    const storage = {getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => {data.set(k,v);}};
    const controller = new GameController(storage, () => 0, rng);
    expect(controller.perform({type:'breed', parents:['rabbit-2','rabbit-3']}).ok).toBe(true);
    let born = controller.getSnapshot().state!; const birth = born.buildings.find(b => b.breeding)!.breeding!.birth;
    expect(birth).toMatchObject({species:'ardent',guaranteed:false,reservedDiscovery:true}); expect(rng).toHaveBeenCalledTimes(1); controller.dispose();
    const noDraw = vi.fn(() => 0), reloaded = new GameController(storage, () => 0, noDraw);
    expect(reloaded.getSnapshot().state).toEqual(born); expect(noDraw).not.toHaveBeenCalled(); reloaded.dispose();
    expect(JSON.stringify(collectionView(born))).not.toContain(description);
    born = reload(sendToNursery(advance(born, 20 * MINUTE)));
    expect(stateBaby(born)).toEqual({slot:0,birth,startedAt:20*MINUTE,readyAt:50*MINUTE});
    expect(nurseryView(born,20*MINUTE).babies).toEqual([{slot:0,birthId:birth.id,stage:'growing',startedAt:20*MINUTE,readyAt:50*MINUTE}]);
    born = reload(advance(born,50*MINUTE)); const home = born.buildings[0];
    for (const type of ['paille','feu','universal','neige','metal','vol'] as const) {
      home.habitat!.type = type; expect(habitatEntryReason(born,home,'ardent')).toBe(['paille','feu','universal'].includes(type) ? null : 'TYPE_INCOMPATIBLE');
    }
    home.habitat!.type = 'universal'; const xp = born.progression.totalXp;
    born = reload(run(born,{type:'welcome',enclosureId:home.id,birthId:birth.id},50*MINUTE));
    expect(born.rabbits.at(-1)).toMatchObject({species:'ardent',affection:1,enclosureId:home.id}); expect(born.progression.totalXp-xp).toBe(270);
    expect(collectionView(born).find(e => e.known && e.species === 'ardent')).toEqual({known:true,species:'ardent',name:'Ardent',description});
  });
});
