import {completeLaboratory} from './labActions';
import {establishHistoricalLevelRights} from '../simulation/levelRights';
import {cumulativeLevelXp, requiredExtensionLevel, requiredDecorationLevel, requiredHabitatUpgradeLevel} from '../simulation/progression';
import {PARCEL_IDS, extensionPrice, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {MINUTE, NURSERY, growthDuration, SPECIES, SPECIES_IDS, type SpeciesId} from '../config/balance';
import {buildingPlacementReason} from '../simulation/placement';
import {HABITAT_TYPES} from '../config/habitats';
import {act, createGame, decodeGame, encodeGame} from '../simulation';
import {createMissions} from '../simulation/missions';
import {createCentreStartGame, emptyBuilding} from '../state/initial';
import {GIFTED_RECIPES} from '../config/recipes';
import type {Command, GameState} from '../state/types';
import {DECORATIONS, DECORATION_IDS, MAX_DECORATIONS} from '../config/decorations';
import {decorationPlacementReason} from '../simulation/decorations';

export const DECORATION_SCENARIOS = ['islandStart', 'islandExpanded', 'islandFull', 'islandDiagonal', 'islandL', 'parcelEdges', 'decorationStart', 'decorationDemo', 'decoratedHabitat', 'decorationDense'] as const;
export const SCENARIOS = {completeGame: 'Fin de partie complète', freshStart: 'Début de partie — tutoriel de Paille', pailleOccupancy: 'Paille — occupation de l’habitat illustré',enclosureSizes:'Enclos — comparaison des trois tailles (proposition)',amethyste:'Améthyste — découverte et reproduction',picPic:'Pic Pic — découverte et reproduction',ardent:'Ardent et SNK — découverte et reproduction',frisketIcy:'Frisket et Icy \u2014 d\u00e9couverte et reproduction',guidedLegacy:'Début guidé précédent — compatibilité',purchaseMilestones:'Niveaux — avant Feu (4 → 5), sans droits historiques',initiationUnused: "Initiation — trois aides inutilisées", initiationSaved: "Initiation — aide utilisée et croissance liée",guidedStart:'Début guidé — nouvelle partie, délais normaux',missionJourney:'Missions — parcours initial et branches',manualBreeding:'Nid — parents et transfert manuel',fineBuildings:'Bâtiments décalés — grille fine 4 × 4',islandStart: `Centre seul — ${ISLAND.parcelCells} × ${ISLAND.parcelCells}`, islandExpanded: 'Extension cardinale — Centre + Est', islandDiagonal: 'Extension diagonale — Centre + Nord-ouest', islandL: 'Forme en L — Centre + Est + Nord', islandFull: `Île complète — ${ISLAND.mapCells} × ${ISLAND.mapCells}`, parcelEdges: 'Décorations proches des frontières',decorationStart: 'Prairie de départ — acheter et placer', decorationDense: 'Prairie dense — sélection et performances', collection: 'Collection — toutes les espèces et recettes', reproduction: 'Reproduction — parents prêts', missions: 'Missions — récompenses à réclamer', habitats: 'Habitats — sept occupants par enclos', decorationDemo: 'Prairie de démonstration décorée', decoratedHabitat: 'Habitat entouré de décorations — sept occupants', recipeShop: 'Recettes — achats au niveau 14', nurseryUnlocks: 'Nurserie — déblocages', nurseryStates: 'Nurserie — quatre états'} as const;
/** Purpose-specific fixtures below are positioned on the former centre-start island (legacy expansion rule). */
function previousStart(now:number):GameState {const s=createCentreStartGame(now);s.grass=10;delete s.levelAccessTransition;delete s.startCourse;s.buildings[0].habitat!.type='universal';s.rabbits.push({id:'rabbit-3',species:'neige',affection:1,enclosureId:'building-1'});s.discovered.push('neige');s.missions=createMissions(s,now);return s;}
export type ScenarioId = keyof typeof SCENARIOS;

/** Explicit test fixtures only; ordinary play still uses act/controller.perform. */
export function scenarioState(id: ScenarioId, now: number): GameState {
  if (id === 'completeGame') return completeLaboratory(now);
  if (id === 'freshStart') return createGame(now);
  let s = createGame(now);
  if (id === 'recipeShop') return recipeShop(s, now);
  if (id === 'nurseryUnlocks' || id === 'nurseryStates') return nurseryScenario(id, s, now);
  if (id === 'decorationStart' || id === 'guidedStart' || id === 'initiationUnused') return s;
  s=previousStart(now);
  if (id === 'amethyste') {
    delete s.initiation; delete s.startCourse;
    s.progression = {totalXp: cumulativeLevelXp(7), rewardedThroughLevel: 7};
    s.buildings[0].habitat!.level = 2;
    s.rabbits = (['amethyste', 'belier-gris', 'feu'] as const).map(species => ({
      id: `rabbit-${s.nextId++}`, species, affection: 2, enclosureId: 'building-1',
    }));
    s.discovered = ['amethyste', 'belier-gris', 'feu'];
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid Améthyste scenario: ${checked.reason}`);
    return checked.state;
  }
  if (id === 'picPic') {
    delete s.initiation; delete s.startCourse;
    s.progression = {totalXp: cumulativeLevelXp(9), rewardedThroughLevel: 9};
    s.buildings[0].habitat!.level = 2;
    s.rabbits = (['pic-pic', 'neige', 'volant'] as const).map(species => ({
      id: `rabbit-${s.nextId++}`, species, affection: 2, enclosureId: 'building-1',
    }));
    s.discovered = ['pic-pic', 'neige', 'volant'];
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid Pic Pic scenario: ${checked.reason}`);
    return checked.state;
  }
  if (id === 'ardent') {
    delete s.initiation; delete s.startCourse;
    s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5};
    s.buildings[0].habitat!.level = 2;
    s.rabbits = (['ardent', 'snk', 'paille', 'feu'] as const).map(species => ({
      id: `rabbit-${s.nextId++}`, species, affection: 2, enclosureId: 'building-1',
    }));
    s.discovered = ['ardent', 'snk', 'paille', 'feu'];
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid Ardent scenario: ${checked.reason}`);
    return checked.state;
  }
  if (id === 'frisketIcy') {
    delete s.initiation; delete s.startCourse;
    s.rabbits = (['frisket', 'icy'] as const).map(species => ({
      id: `rabbit-${s.nextId++}`, species, affection: 2, enclosureId: 'building-1',
    }));
    s.discovered = ['frisket', 'icy'];
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid Frisket/Icy scenario: ${checked.reason}`);
    return checked.state;
  }
  if(id==='guidedLegacy'){establishHistoricalLevelRights(s);return s;}
  if(id==='purchaseMilestones') {
    s.levelAccessTransition={version:1,rights:[]};
    s.progression={totalXp:cumulativeLevelXp(5)-20,rewardedThroughLevel:4};
    s.pattes=5000;s.grass=1000;s.hearts=100;
    return s;
  }
  if (id === 'initiationSaved') {
    s=createCentreStartGame(now);s.grass=10;
    const run=(command:Command)=>{const result=act(s,command,now,()=>.1);if(!result.ok)throw Error(result.reason);s=result.state;};
    run({type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:18,y:24});const snow=s.buildings.at(-1)!.id;
    run({type:'buyRabbit',species:'neige',enclosureId:snow});const neige=s.rabbits.at(-1)!.id;run({type:'claimMainMission',id:'welcome-snow'});
    run({type:'feed',id:'rabbit-2'});run({type:'feed',id:neige});
    run({type:'breed',parents:['rabbit-2',neige]});
    run({type:'initiationAid',id:'building-4',stage:'breeding',jobKey:s.initiation!.breeding!});
    run({type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!});
    return s;
  }
  if (id === 'missionJourney') {
    const origin = Math.max(0, now - 55*60_000); s=previousStart(origin);
    const perform = (command: Command, at = origin) => { const result = act(s, command, at, () => .65); if (!result.ok) throw Error(result.reason); s=result.state; };
    perform({type:'feed',id:'rabbit-2'}); perform({type:'feed',id:'rabbit-3'});
    perform({type:'buyBuilding',kind:'farm',x:22,y:20}); const farm=s.buildings.at(-1)!;
    perform({type:'startOrder',id:farm.id,recipe:'foin'}); perform({type:'collectOrder',id:farm.id},origin+5*60_000);
    perform({type:'breed',parents:['rabbit-2','rabbit-3']},origin+5*60_000);
    perform({type:'transferBirth',id:'building-4',birthId:s.buildings.find(b=>b.kind==='nest')!.breeding!.birth.id},origin+25*60_000);
    perform({type:'welcome',enclosureId:'building-1',birthId:s.buildings.find(b=>b.kind==='nursery')!.nursery!.babies[0].birth.id},origin+55*60_000);
    // Real commands with initial resources; early accomplishments still await explicit claims.
    return s;
  }
  delete s.initiation;
  if(id==='collection'||id==='reproduction')s.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};
  if(['parcelEdges','decorationDemo','decoratedHabitat','decorationDense'].includes(id)){const level=Math.max(...DECORATION_IDS.map(id=>requiredDecorationLevel(id)));s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};}
  if(['fineBuildings','decorationDemo','decoratedHabitat','decorationDense'].includes(id)){const level=Math.max(requiredHabitatUpgradeLevel('universal',3),...DECORATION_IDS.map(id=>requiredDecorationLevel(id)));s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};}
  s.purchaseUnlocks=['universal','feu','volant']; // Existing purpose-specific laboratory fixtures retain unrestricted purchase rights.
  s.pattes = 2_000_000; s.grass = 1_000; s.hearts = id === 'decorationDense' ? MAX_DECORATIONS * 80 : 100;
  const run = (command: Command) => {
    const result = act(s, command, now, () => .99);
    if (!result.ok) throw new Error(`Scenario action refused: ${result.reason}`);
    s = result.state;
  };
  if(['islandExpanded','islandDiagonal','islandL','islandFull','parcelEdges','decorationDense'].includes(id)){const level=id==='islandFull'||id==='decorationDense'?requiredExtensionLevel(8):Math.max(requiredExtensionLevel(2),s.progression.rewardedThroughLevel);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};}
  const acquire=(id:ParcelId)=>run({type:'expand',parcelId:id,expectedCost:extensionPrice(s)});
  if (id === 'pailleOccupancy') {
    // Same illustrated home and species throughout; only the adult resident count changes, left to right.
    const level = requiredExtensionLevel(1);
    s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
    acquire('east');
    s.rabbits = []; s.buildings = []; s.discovered = ['paille'];
    for (const [index, count] of [1, 2, 3].entries()) {
      const home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', 18 + index * 8, 24, 'paille');
      s.buildings.push(home);
      for (let resident = 0; resident < count; resident++) {
        s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'paille', affection: 2, enclosureId: home.id});
      }
    }
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid Paille occupancy scenario: ${checked.reason}`);
    return checked.state;
  }
  if (id === 'enclosureSizes') {
    // Three universal enclosures of levels 1, 2 and 3 with 3, 5 and 7 residents, side by side, each at the footprint of its level.
    {const level=requiredExtensionLevel(PARCEL_IDS.length-1);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};}
    acquire('east'); for(const parcel of PARCEL_IDS.filter(parcel=>!s.acquiredParcels.includes(parcel)))acquire(parcel);
    s.rabbits = []; s.buildings = []; s.discovered = [];
    const rows = [
      {level: 1 as const, x: 18, species: ['paille', 'neige', 'feu'] as const},
      {level: 2 as const, x: 25, species: ['belier-gris', 'volant', 'boudinet', 'phoenix', 'amethyste'] as const},
      {level: 3 as const, x: 34, species: ['ardent', 'snk', 'glassofeu', 'phoenix', 'plume', 'pic-pic', 'fluffy'] as const},
    ];
    for (const row of rows) {
      const home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', row.x, 24, 'universal'); home.habitat!.level = row.level; if (row.level > 1) home.footprintTier = row.level; s.buildings.push(home);
      for (const species of row.species) { s.rabbits.push({id: `rabbit-${s.nextId++}`, species, affection: 2, enclosureId: home.id}); if (!s.discovered.includes(species)) s.discovered.push(species); }
    }
    s.missions = createMissions(s, now);
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error(`Invalid enclosure size scenario: ${checked.reason}`);
    return checked.state;
  }
  if(id==='fineBuildings'){
    acquire('east');acquire('north');
    run({type:'moveBuilding',id:'building-5',x:37,y:21});run({type:'moveBuilding',id:'building-4',x:24,y:14});
    run({type:'moveBuilding',id:'building-1',x:19,y:22});
    // A level-3 capacity on the compact 4 × 4 footprint, as in a save written before footprint tiers: no room is needed or paid for.
    s.buildings[0].habitat!.level=3;
    const mixed:SpeciesId[]=['paille','neige','frisket','belier-gris','feu','volant','icy'];
    s.rabbits=mixed.map(species=>({id:`rabbit-${s.nextId++}`,species,affection:4,enclosureId:'building-1'}));s.discovered=[...mixed];
    run({type:'buyBuilding',kind:'farm',x:30,y:23});
    run({type:'startOrder',id:s.buildings.at(-1)!.id,recipe:'foin'});

    run({type:'buyBuilding',kind:'enclosure',habitatType:'vol',x:24,y:26});
    run({type:'buyDecoration',catalogId:'bush'});
    run({type:'placeDecoration',id:s.decorations.at(-1)!.id,location:{kind:'outside',x:23,y:22,rotation:0}});
    const checked=decodeGame(encodeGame(s));if(!checked.ok)throw Error('Invalid fine building scenario');return checked.state;
  }
  if (id === 'islandStart' || id === 'islandExpanded' || id === 'islandDiagonal' || id === 'islandL' || id === 'islandFull' || id === 'parcelEdges') {
    if (['islandExpanded','islandL','parcelEdges'].includes(id)) acquire('east');
    if (id === 'islandDiagonal') acquire('northwest');
    if (id === 'islandL') acquire('north');
    if (id === 'islandFull') for(const id of PARCEL_IDS.filter(id=>id!=='center'))acquire(id);
    if(id==='parcelEdges'){run({type:'moveBuilding',id:'building-5',x:28,y:24});run({type:'buyDecoration',catalogId:'large-bookcase'});run({type:'placeDecoration',id:s.decorations.at(-1)!.id,location:{kind:'outside',x:31,y:16,rotation:0}});}
    // Almost empty, not an automatic reset: ordinary starting habitat and two rabbits.
    const checked = decodeGame(encodeGame(s));
    if (!checked.ok) throw new Error('Invalid island scenario');
    return checked.state;
  }
  if (id === 'decorationDemo' || id === 'decoratedHabitat' || id === 'decorationDense') {
    acquire('east');
    run({type:'moveBuilding',id:'building-4',x:34,y:20});run({type:'moveBuilding',id:'building-5',x:38,y:20});
    run({type:'moveBuilding',id:'building-1',x:18,y:20});
    // Level-3 capacity on the compact footprint (a legacy-style habitat): the surrounding fixtures are placed around it.
    s.buildings[0].habitat!.level = 3;
    const home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', 26, 20, 'metal'); home.habitat!.level = 3; s.buildings.push(home);
    if (id === 'decoratedHabitat' || id === 'decorationDense') {
      s.rabbits = SPECIES_IDS.slice(0, 7).map(species => ({id: `rabbit-${s.nextId++}`, species, affection: 3, enclosureId: 'building-1'}));
      s.discovered = s.rabbits.map(r => r.species);
    }
    const outside = DECORATION_IDS.filter(id => DECORATIONS[id].area === 'outside');
    // Spacious demonstration: every catalogue entry is actually placed.
    const positions = [[19, 25], [22, 26], [25, 25], [28, 25], [34, 25], [40, 24], [43, 25], [37, 27], [18, 28], [22, 29], [28, 29]];
    for (const [index, catalogId] of outside.entries()) {
      run({type: 'buyDecoration', catalogId});
      const decorationId = s.decorations.at(-1)!.id;
      // Entries beyond the hand-placed ones take the first free spot of the same neighbourhood.
      const free = () => {for (let y = 20; y < 40; y++) for (let x = 16; x < 46; x++) if (!decorationPlacementReason(s, decorationId, {kind: 'outside', x, y, rotation: 0})) return [x, y]; throw Error(`No room for ${catalogId}`);};
      const [x, y] = positions[index] ?? free();
      run({type: 'placeDecoration', id: decorationId, location: {kind: 'outside', x, y, rotation: 0}});
    }
    if (id === 'decorationDense') {
      for(const id of PARCEL_IDS.filter(id=>!s.acquiredParcels.includes(id)))acquire(id);
      // Fill through real commands, then keep surplus copies in the inventory.
      // This deliberately reaches the existing import/device protection bound.
      let cursor=0;
      while (s.decorations.length < MAX_DECORATIONS) {
        const catalogId = outside[s.decorations.length % outside.length];
        run({type: 'buyDecoration', catalogId});
        const id = s.decorations.at(-1)!.id;
        let installed = false;
        for (let index=cursor; index<ISLAND.mapFine**2 && !installed; index++) {
          const x=index%ISLAND.mapFine,y=Math.floor(index/ISLAND.mapFine);
          const location = {kind: 'outside' as const, x, y, rotation: 0 as const};
          if (!decorationPlacementReason(s, id, location)) { run({type: 'placeDecoration', id, location}); installed = true; cursor=index+1; }
        }
        if(!installed)cursor=ISLAND.mapFine**2;
      }
    }
  } else if (id === 'reproduction' || id==='manualBreeding') {
    run({type: 'feed', id: 'rabbit-2'}); run({type: 'feed', id: 'rabbit-3'});
    if(id==='manualBreeding') {
      run({type:'buyBuilding',kind:'enclosure',x:18,y:24});
      run({type:'moveRabbit',id:'rabbit-3',enclosureId:s.buildings.at(-1)!.id});
      const nursery=s.buildings.find(b=>b.kind==='nursery')!;
      nursery.nursery!.babies=[{slot:0,birth:{id:`birth-${s.nextId++}`,species:'paille',guaranteed:false,reservedDiscovery:false},startedAt:now-growthDuration('paille'),readyAt:now}];
      s.pattes=0;s.hearts=0;
      run({type:'breed',parents:['rabbit-2','rabbit-3']});
    }
    // Ready parents or a real running job, with an occupied nursery in the manual scenario.
  } else {
    {const level=requiredExtensionLevel(PARCEL_IDS.length-1);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};}
    acquire('east'); for(const id of PARCEL_IDS.filter(id=>!s.acquiredParcels.includes(id)))acquire(id);
    s.rabbits = []; s.buildings = []; s.discovered = [];
    const types = id === 'habitats' ? HABITAT_TYPES : id === 'collection' ? Array.from({length: Math.ceil(SPECIES_IDS.length / 7)}, () => 'universal' as const) : ['universal', 'universal'] as const;
    for (const [index, type] of types.entries()) {
      const home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', 18 + index % 3 * 4, 20 + Math.floor(index / 3) * 4, type);
      home.habitat!.level = 3; s.buildings.push(home);
      const species: SpeciesId[] = id === 'habitats' ? SPECIES_IDS.slice(0, 11).filter(species => type === 'universal' || SPECIES[species].types.includes(type)) : (id === 'collection' ? SPECIES_IDS : SPECIES_IDS.slice(0, 11)).slice(index * 7, index * 7 + 7);
      const count = id === 'habitats' ? 7 : species.length;
      for (let i = 0; i < count; i++) {
        const speciesId = species[i % species.length];
        s.rabbits.push({id: `rabbit-${s.nextId++}`, species: speciesId, affection: id === 'collection' ? 10 : 5, enclosureId: home.id});
        if (!s.discovered.includes(speciesId)) s.discovered.push(speciesId);
      }
    }
    if (id === 'missions' || id === 'collection') {
      for (const [x, kind] of ['farm', 'nest', 'nursery'].entries()) s.buildings.push(emptyBuilding(`building-${s.nextId++}`, kind as 'farm' | 'nest' | 'nursery', 2 + x * 4, 8));
    }
    s.missions = createMissions(s, now);
    if (id === 'missions') s.missions.daily.progress = {'collect-pattes': 100, 'collect-grass': 40, 'gain-affection': 3};
  }
  // Enforce exactly the same save validation used by every player import.
  const checked = decodeGame(encodeGame(s));
  if (!checked.ok) throw new Error(`Invalid scenario: ${checked.reason}`);
  return checked.state;
}
/** Level 14, coins for every recipe, no recipe known at the start; sold recipes all undiscovered. */
function recipeShop(s: GameState, now: number): GameState {
  delete s.initiation; delete s.startCourse;
  s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
  s.pattes = 5000; s.grass = 1000; s.hearts = 100;
  s.buildings[0].habitat = {type: 'universal', level: 2};
  const species: SpeciesId[] = ['paille', 'feu', 'belier-gris', 'volant'];
  s.rabbits = species.map(id => ({id: `rabbit-${s.nextId++}`, species: id, affection: 10, enclosureId: 'building-1'}));
  s.discovered = [...species]; s.recipeBook = [...GIFTED_RECIPES]; s.missions = createMissions(s, now);
  const checked = decodeGame(encodeGame(s)); if (!checked.ok) throw new Error('Invalid recipe shop scenario'); return checked.state;
}
/**
 * Nursery v2 for hands-on testing (iPhone included), on a new game: the one nursery, the nest and the Paille home, plus a Neige home with
 * its resident so the nest has usable parents and a Neige birth has a compatible home. Resources are fixture values; the habitat and the
 * rabbit come from real commands, and the babies and the nest's finished birth are set directly, as in `manualBreeding`.
 * - `nurseryUnlocks`: capacity 1, empty, with exactly the Hearts of the three unlocks (read from `NURSERY.unlockHearts`).
 * - `nurseryStates`: capacity 3 with a ready baby (slot 0), a baby incubating for two more minutes (slot 1), an empty cushion (slot 2)
 *   and a locked one (slot 3); room for both babies in the Paille home; a finished Neige birth waiting in the nest for the free slot;
 *   Hearts for the last unlock and for accelerating the incubating baby.
 */
function nurseryScenario(id: 'nurseryUnlocks' | 'nurseryStates', start: GameState, clock: number): GameState {
  // Past events need room before the clock: a real clock is far above this, only a test clock near zero is lifted.
  const now = Math.max(clock, 30 * MINUTE); let s = now === clock ? start : createGame(now); delete s.initiation; delete s.startCourse;
  s.pattes = 5000; s.grass = 500;
  const run = (command: Command) => { const result = act(s, command, now, () => .5); if (!result.ok) throw Error(`${command.type}: ${result.reason}`); s = result.state; };
  let cell: {x: number; y: number} | null = null;
  for (let y = 0; y < ISLAND.mapFine && !cell; y++) for (let x = 0; x < ISLAND.mapFine && !cell; x++) if (!buildingPlacementReason(s, x, y)) cell = {x, y};
  if (!cell) throw new Error('No free cell for the Neige home');
  run({type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', x: cell.x, y: cell.y});
  const snowHome = s.buildings.at(-1)!.id; run({type: 'buyRabbit', species: 'neige', enclosureId: snowHome}); const snow = s.rabbits.at(-1)!;
  for (const rabbit of s.rabbits) rabbit.affection = Math.max(rabbit.affection, 2);
  const nursery = s.buildings.find(b => b.kind === 'nursery')!, nest = s.buildings.find(b => b.kind === 'nest')!;
  if (id === 'nurseryUnlocks') s.hearts = Object.values(NURSERY.unlockHearts).reduce((total, price) => total + price, 0);
  else {
    const birth = (species: SpeciesId) => ({id: `birth-${s.nextId++}`, species, guaranteed: false, reservedDiscovery: false});
    const baby = (slot: 0 | 1, readyAt: number) => { const born = birth('paille'); return {slot, birth: born, startedAt: readyAt - growthDuration(born.species), readyAt}; };
    nursery.nursery = {capacity: 3, babies: [baby(0, now - MINUTE), baby(1, now + 2 * MINUTE)]};
    nest.breeding = {parents: ['rabbit-2', snow.id], startedAt: now - 5 * MINUTE - growthDuration('neige'), endsAt: now - 5 * MINUTE, birth: birth('neige')};
    s.hearts = NURSERY.unlockHearts[3] + 10;
  }
  s.missions = createMissions(s, now);
  const checked = decodeGame(encodeGame(s)); if (!checked.ok) throw new Error(`Invalid Nursery scenario: ${checked.reason}`); return checked.state;
}
