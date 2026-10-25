import {describe, expect, it, vi} from 'vitest';
import {SPECIES, SPECIES_ENTRIES, SPECIES_IDS} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {GUARANTEE_SPECIES, MINUTE, growthDuration} from '../src/config/balance';
import {RECIPE_PRICES, GIFTED_RECIPES} from '../src/config/recipes';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {breedingWeights, breedingOdds, breedingPool, recipeMatches, chooseBirth} from '../src/simulation/breeding';
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

const description = 'Lapin habillé comme Eren de L’Attaque des Titans.';
function run(s: GameState, command: Command, now = 0) {const r = act(s, command, now, () => .99); if (!r.ok) throw Error(r.reason); return r.state;}
function reload(s: GameState) {const decoded = decodeGame(encodeGame(s)); expect(decoded).toEqual({ok: true, state: s}); if (!decoded.ok) throw Error(decoded.reason); return decoded.state;}
function parents() {
  let s = regressionStart(0); s.rabbits[1].species = 'feu'; s.discovered = ['paille', 'feu'];
  s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5};
  s.rabbits.forEach(r => r.affection = 2);
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20});
  return run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
}
describe('approved SNK content', () => {
  it('keeps SNK in its original position, with explicit recipe, Rare policies and no undecided acquisition policies or coat', () => {
    expect(SPECIES_IDS[14]).toBe('snk'); expect(SPECIES_IDS).toEqual(EXPECTED_IDS);
    expect(validateSpeciesEntries(SPECIES_ENTRIES)).toEqual([]);
    expect(SPECIES.snk).toEqual({name: 'SNK', description, types: ['paille', 'feu'], rarity: 'rare', price: null,
      progression: {unlockLevel: 1}, acquisition: [{kind: 'recipe', requiredTypes: ['paille', 'feu'], minAffection: 2}],
      recipe: {requiredTypes: ['paille', 'feu'], minAffection: 2}, art: {kind: 'static-sprite', file: 'assets/rabbits/snk/snk-v1.png', texture: 'rabbit-snk-original-v1', width: 461, height: 369, worldWidth: 56, groundY: 15.5, preloadOrder: 9}});
    expect(SPECIES.feu.progression.unlockLevel).toBe(5); expect(growthDuration('snk')).toBe(30 * MINUTE);
    expect(RECIPE_PRICES.snk).toBeUndefined(); expect(GIFTED_RECIPES).not.toContain('snk'); expect(GUARANTEE_SPECIES).not.toContain('snk');
    expect(act(parents(), {type: 'buyRabbit', species: 'snk', enclosureId: 'building-1'}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('uses either parent order and accepts both elements on one parent, while checking both affection thresholds', () => {
    for (const [a,b] of [['paille','feu'], ['bouee','paille'], ['snk','neige']] as const) {
      for (const [x,y] of [[a,b],[b,a]] as const) {
        expect(recipeMatches('snk', x, y)).toBe(true); expect(breedingWeights(x,y,2,2).snk).toBe(20);
        expect(breedingWeights(x,y,1,2).snk).toBeUndefined(); expect(breedingWeights(x,y,2,1).snk).toBeUndefined();
      }
    }
    for (const [a,b] of [['paille','neige'], ['feu','volant']] as const) {
      expect(recipeMatches('snk',a,b)).toBe(false); expect(breedingWeights(a,b,20,20).snk).toBeUndefined();
    }
  });
  it('preserves historical weighting and guarantee rather than extending the starting Rare-only policy', () => {
    expect(breedingWeights('paille','feu',2,2)).toEqual({paille:40,feu:40,ardent:20,snk:20});
    expect(breedingOdds('feu','paille',2,2)).toEqual({paille:100/3,feu:100/3,ardent:100/6,snk:100/6});
    expect(breedingOdds('paille','feu',4,4)).toEqual({paille:200/7,feu:200/7,bouee:100/7,ardent:100/7,snk:100/7});
    const s = parents(); s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5}; s.pityFailures = 9;
    expect(breedingPool(s,'paille','feu',4,4)).toMatchObject({weights:{bouee:1},guaranteed:true});
    expect(breedingPool(s,'paille','feu',2,2)).toMatchObject({weights:{paille:40,feu:40,ardent:20,snk:20},guaranteed:false});
    expect(breedingOdds('paille','neige',2,2)).toEqual({frisket:50,icy:50});
  });
  it('checks exact cumulative boundaries for the four ordinary candidates', () => {
    const s = parents();
    for (const [roll,id] of [[0,'paille'],[1/3-Number.EPSILON,'paille'],[1/3,'feu'],[2/3-Number.EPSILON,'feu'],[2/3,'ardent'],[5/6-Number.EPSILON,'ardent'],[5/6,'snk'],[1-Number.EPSILON,'snk']] as const) {
      expect(chooseBirth(s,'paille','feu',roll,2,2).species).toBe(id);
      expect(chooseBirth(s,'feu','paille',roll,2,2).species).toBe(id);
    }
  });
  it('keeps a real SNK birth through save/reload without redrawing, transfer, growth and compatible welcome', () => {
    const s = parents(), rng = vi.fn(() => .99), data = new Map([[SAVE_KEY, encodeGame(s)]]);
    const storage = {getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => {data.set(k,v);}};
    const controller = new GameController(storage, () => 0, rng);
    expect(controller.perform({type:'breed', parents:['rabbit-2','rabbit-3']}).ok).toBe(true);
    let born = controller.getSnapshot().state!; const birth = born.buildings.find(b => b.breeding)!.breeding!.birth;
    expect(birth).toMatchObject({species:'snk',guaranteed:false,reservedDiscovery:false}); expect(rng).toHaveBeenCalledTimes(1); controller.dispose();
    const noDraw = vi.fn(() => 0), reloaded = new GameController(storage, () => 0, noDraw);
    expect(reloaded.getSnapshot().state).toEqual(born); expect(noDraw).not.toHaveBeenCalled(); reloaded.dispose();
    expect(JSON.stringify(collectionView(born))).not.toContain(description);
    born = reload(sendToNursery(advance(born, 20 * MINUTE)));
    expect(stateBaby(born)).toEqual({slot:0,birth,startedAt:20*MINUTE,readyAt:50*MINUTE});
    expect(nurseryView(born,20*MINUTE).babies).toEqual([{slot:0,birthId:birth.id,stage:'growing',startedAt:20*MINUTE,readyAt:50*MINUTE}]);
    born = reload(advance(born,50*MINUTE)); const home = born.buildings[0];
    for (const type of ['paille','feu','universal','neige','metal','vol'] as const) {
      home.habitat!.type = type; expect(habitatEntryReason(born,home,'snk')).toBe(['paille','feu','universal'].includes(type) ? null : 'TYPE_INCOMPATIBLE');
    }
    home.habitat!.type = 'universal'; const xp = born.progression.totalXp;
    born = reload(run(born,{type:'welcome',enclosureId:home.id,birthId:birth.id},50*MINUTE));
    expect(born.rabbits.at(-1)).toMatchObject({species:'snk',affection:1,enclosureId:home.id}); expect(born.progression.totalXp-xp).toBe(70);
    expect(collectionView(born).find(e => e.known && e.species === 'snk')).toEqual({known:true,species:'snk',name:'SNK',description});
  });
});
