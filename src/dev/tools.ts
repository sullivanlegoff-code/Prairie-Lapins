import {mountLevelAccessDemo} from './levelAccessDemo';
import type {GameController, Operation} from '../application/GameController';
import type {SaveStorage} from '../persistence/storage';
import {encodeGame} from '../simulation';
import {BUILD_REVISION} from '../config/release';
import {sessionPolicy} from '../config/runtime';
import {SCENARIOS, scenarioState, type ScenarioId} from './scenarios';
import type {GameState} from '../state/types';
import {setCurrencyText} from '../display/currency';
import {GIFTED_RECIPES} from '../config/recipes';
import {SPECIES, SPECIES_IDS, type SpeciesId} from '../config/species';
import {BALANCE} from '../config/balance';
import {HABITATS} from '../config/habitats';
import {habitatEntryReason, habitatStats} from '../simulation/habitats';

export const TEST_PREFIX = 'prairie-lapins.development.';
export const DECORATIONS_PREVIEW_PREFIX = 'prairie-lapins.preview.decorations.';
export const TEST_CLOCK_KEY = TEST_PREFIX + 'clock';
export const TIME_STEPS = [5, 20, 60, 360, 1440] as const;
export const RESOURCE_STEPS = {pattes: [1000, 10000], grass: [100, 1000], hearts: [10, 100]} as const;
type TestResult = Operation | ReturnType<GameController['grantLaboratoryXp']> | {ok: false; reason: 'INVALID_TEST_VALUE' | 'NOT_TEST_SESSION'};

/** Reuse transactional imports: validate and save before replacing any state. */
export function replaceTestState(controller: GameController, state: GameState): TestResult {
  if (controller.storageScope !== 'laboratory') return {ok: false, reason: 'NOT_TEST_SESSION'};
  let json: string;
  try { json = encodeGame(state); } catch { return {ok: false, reason: 'INVALID_TEST_VALUE'}; }
  const prepared = controller.prepareImport(json);
  return prepared.ok ? controller.confirmImport(prepared.token, true) : prepared;
}

/** Imported only by local test mode or the explicitly built laboratory. */
export function developmentEnvironment(base: SaveStorage, options: {decorationPreview?: boolean} = {}) {
  const prefix = options.decorationPreview ? DECORATIONS_PREVIEW_PREFIX : TEST_PREFIX;
  const clockKey = prefix + 'clock';
  let offset = 0;
  try {
    const saved = Number(base.getItem(clockKey));
    if (Number.isSafeInteger(saved) && saved >= 0 && saved < 8_000_000_000_000_000) offset = saved;
  } catch { /* optional test clock; normal storage is never consulted */ }
  const clock = () => Date.now() + offset;
  // Prefix EVERY controller key, including migration backups. No fallback to normal.
  const storage: SaveStorage = {scope: 'laboratory', getItem: key => base.getItem(prefix + key), setItem: (key, value) => base.setItem(prefix + key, value),
    ...(base.onChange ? {onChange: (key: string, listener: () => void) => base.onChange!(prefix + key, listener)} : {})};
  function advanceTime(controller: GameController, minutes: number): TestResult {
    if (controller.storageScope !== 'laboratory') return {ok: false, reason: 'NOT_TEST_SESSION'};
    if (!(TIME_STEPS as readonly number[]).includes(minutes)) return {ok: false, reason: 'INVALID_TEST_VALUE'};
    const next = offset + minutes * 60_000;
    if (!Number.isSafeInteger(next) || next >= 8_000_000_000_000_000) return {ok: false, reason: 'INVALID_TEST_VALUE'};
    try { base.setItem(clockKey, String(next)); } catch { return {ok: false, reason: 'WRITE_FAILED'}; }
    offset = next; controller.refresh();
    const snapshot = controller.getSnapshot();
    return snapshot.issue ? {ok: false, reason: snapshot.issue} : {ok: true};
  }
  function grant(controller: GameController, resource: keyof typeof RESOURCE_STEPS, amount: number): TestResult {
    if (!(RESOURCE_STEPS[resource] as readonly number[]).includes(amount)) return {ok: false, reason: 'INVALID_TEST_VALUE'};
    const state = controller.getSnapshot().state;
    if (!state) return {ok: false, reason: 'NO_GAME'};
    state[resource] += amount;
    return replaceTestState(controller, state);
  }
  /** Laboratory only: forget bought recipes (gifts and discoveries stay known); no refund. */
  function resetRecipes(controller: GameController): TestResult {
    const state = controller.getSnapshot().state;
    if (!state) return {ok: false, reason: 'NO_GAME'};
    state.recipeBook = [...GIFTED_RECIPES];
    return replaceTestState(controller, state);
  }
  /** Laboratory only, not an acquisition source: bypasses shop, recipe and level, keeps habitat type and capacity; nothing is paid, earned or progressed. */
  function addTestRabbit(controller: GameController, species: SpeciesId, enclosureId: string): TestResult {
    if (controller.storageScope !== 'laboratory') return {ok: false, reason: 'NOT_TEST_SESSION'};
    const state = controller.getSnapshot().state;
    if (!state) return {ok: false, reason: 'NO_GAME'};
    const home = state.buildings.find(b => b.id === enclosureId && b.kind === 'enclosure');
    if (!Object.hasOwn(SPECIES, species) || !home) return {ok: false, reason: 'INVALID_TEST_VALUE'};
    const refusal = habitatEntryReason(state, home, species);
    if (refusal) return {ok: false, state, reason: refusal};
    if (!Number.isSafeInteger(state.nextId + 1)) return {ok: false, reason: 'INVALID_TEST_VALUE'};
    state.rabbits.push({id: `rabbit-${state.nextId++}`, species, affection: BALANCE.minAffection, enclosureId});
    if (!state.discovered.includes(species)) state.discovered.push(species);
    return replaceTestState(controller, state);
  }
  function loadScenario(controller: GameController, id: ScenarioId): TestResult {
    try { return replaceTestState(controller, scenarioState(id, clock())); }
    catch { return {ok: false, reason: 'INVALID_TEST_VALUE'}; }
  }
  return {clock, storage, preferenceKey: prefix + 'ui', policy: sessionPolicy(true), advanceTime, grant, loadScenario, resetRecipes, addTestRabbit,
    mount(controller: GameController, onReplacement: (fresh?: boolean) => void = () => {}) {
      if (controller.storageScope !== 'laboratory') throw new Error('Test tools require isolated laboratory storage');
      const host = document.getElementById('devtools')!;
      host.hidden = false; host.replaceChildren();
      const intro = document.createElement('p');
      intro.textContent = 'Laboratoire public : partie, préférences, horloge et sauvegardes de secours séparées. Aucun compte ni service en ligne. Importe volontairement un export normal pour tester une copie. Les fichiers MODE-TEST peuvent contenir des ressources ajoutées et du temps avancé.';
      if (options.decorationPreview) intro.textContent = 'Prévisualisation expérimentale v8 : partie, préférences, horloge et secours distincts des trois autres versions. Aucun compte ni synchronisation. Import v4 volontaire uniquement ; les exports v8 de cette prévisualisation ne sont pas compatibles avec les versions v4.';
      host.append(intro);
      const version = document.createElement('p'); version.textContent = options.decorationPreview ? `Version expérimentale v8 · build ${BUILD_REVISION.slice(0, 7)}. Jeu normal et laboratoire en v8 ; comptes figés en v4.` : `Même révision que le jeu normal : ${BUILD_REVISION.slice(0, 7)}.`; host.append(version);
      const status = document.createElement('p'); status.setAttribute('role', 'status'); status.id = 'dev-status';
      const resultMessage = (result: TestResult, message: string) => { status.textContent = result.ok ? message : result.reason === 'NOT_CONFIRMED' ? 'Opération annulée. La partie de test est conservée.' : 'Opération de test refusée. Vérifie la sauvegarde et l’espace disponible ; la partie normale est conservée.'; };
      const section = (title: string) => { const h = document.createElement('h3'); h.textContent = title; host.append(h); };
      const button = (label: string, id: string, click: () => void) => {
        const b = document.createElement('button'); b.type = 'button'; setCurrencyText(b, label); b.id = id; b.onclick = click; host.append(b);
      };
      section('Avancer le temps de test');
      for (const minutes of TIME_STEPS) button(`+ ${minutes} min`, `dev-time-${minutes}`, () => resultMessage(advanceTime(controller, minutes), `Horloge de test avancée de ${minutes} minutes.`));
      section('Ajouter des ressources de test');
      const names = {pattes: 'pattes', grass: 'nourriture', hearts: 'cœurs'};
      for (const resource of Object.keys(RESOURCE_STEPS) as (keyof typeof RESOURCE_STEPS)[]) {
        for (const amount of RESOURCE_STEPS[resource]) button(`+ ${amount} ${names[resource]}`, `dev-grant-${resource}-${amount}`, () => resultMessage(grant(controller, resource, amount), 'Ressources ajoutées à la partie de test.'));
      }
      section('Progression de test');
      for (const amount of [50, 500]) button(`+${amount} XP`, `dev-xp-${amount}`, () => {
        const result = controller.grantLaboratoryXp(amount);
        resultMessage(result, result.ok && result.progressionGain ? `+${result.progressionGain.xpGained} XP · niveaux récompensés : ${result.progressionGain.rewardedLevels.join(', ') || 'aucun'} · +${result.progressionGain.heartsGranted} cœur(s).` : 'Progression enregistrée.');
      });
      section('Recettes de test');
      button('Réinitialiser les recettes achetées', 'dev-reset-recipes', () => resultMessage(resetRecipes(controller), 'Recettes achetées oubliées, sans remboursement. Les espèces découvertes restent connues.'));
      section('Lapins de test');
      const field = (label: string, id: string) => {
        const wrap = document.createElement('label'); wrap.textContent = label + ' '; const select = document.createElement('select'); select.id = id; wrap.append(select); host.append(wrap); return select;
      };
      const speciesSelect = field('Espèce', 'dev-rabbit-species'), homeSelect = field('Habitat', 'dev-rabbit-home');
      for (const id of SPECIES_IDS) { const o = document.createElement('option'); o.value = id; o.textContent = `${SPECIES[id].name} · ${SPECIES[id].rarity}`; speciesSelect.append(o); }
      const addButton = document.createElement('button'); addButton.type = 'button'; addButton.id = 'dev-add-rabbit'; addButton.textContent = 'Ajouter à la partie de test';
      const refreshHomes = (state: GameState | null) => {
        const species = speciesSelect.value as SpeciesId, kept = homeSelect.value;
        const homes = (state?.buildings ?? []).filter(b => b.kind === 'enclosure' && !habitatEntryReason(state!, b, species));
        homeSelect.replaceChildren(...homes.map(b => {
          const o = document.createElement('option'); o.value = b.id;
          o.textContent = `${HABITATS[b.habitat!.type].name} · niveau ${b.habitat!.level} · ${state!.rabbits.filter(r => r.enclosureId === b.id).length}/${habitatStats(b).capacity}`; return o;
        }));
        if (homes.some(b => b.id === kept)) homeSelect.value = kept;
        if (!homes.length) { const o = document.createElement('option'); o.textContent = 'Aucun habitat compatible avec une place libre'; homeSelect.append(o); }
        homeSelect.disabled = addButton.disabled = !homes.length;
      };
      speciesSelect.onchange = () => refreshHomes(controller.getSnapshot().state);
      addButton.onclick = () => {
        const species = speciesSelect.value as SpeciesId, result = addTestRabbit(controller, species, homeSelect.value);
        if (result.ok) onReplacement();
        resultMessage(result, `${SPECIES[species].name} ajouté à la partie de test (adulte, sans coût).`);
      };
      host.append(addButton);
      const stopWatchingHomes = controller.subscribe(snapshot => refreshHomes(snapshot.state));
      const disposeLevelDemo = options.decorationPreview ? () => {} : mountLevelAccessDemo(host);
      section('Scénarios préparés');
      for (const id of (Object.keys(SCENARIOS) as ScenarioId[])) button(SCENARIOS[id], `dev-scenario-${id}`, () => {
        if (!window.confirm(`Charger « ${SCENARIOS[id]} » remplace seulement la partie de test. Exporte-la pour la conserver. Continuer ?`)) return;
        const result = loadScenario(controller, id); if (result.ok) onReplacement(id === 'guidedStart' || id === 'initiationUnused' || id === 'initiationSaved'); resultMessage(result, 'Scénario chargé et enregistré dans la partie de test.');
      });
      section('Sauvegarde de test');
      button('Exporter la partie de test', 'dev-export', () => document.getElementById('export-game')!.click());
      button('Importer dans la partie de test', 'dev-import', () => document.getElementById('import-game')!.click());
      button('Remettre la partie de test à zéro', 'dev-reset', () => {
        const result = controller.restart(window.confirm('Remplacer seulement la partie de test par une nouvelle partie ? La partie normale et les autres sauvegardes sont conservées. L’horloge et les préférences de test restent en place.'));
        if (result.ok) onReplacement(); resultMessage(result, 'Nouvelle partie de test enregistrée.');
      });
      host.append(status);
      const badge = document.getElementById('dev-badge')!;
      document.body.classList.add('test-session');
      badge.hidden = false; badge.replaceChildren(document.createTextNode(options.decorationPreview ? 'PRÉVISUALISATION DÉCORATIONS v8 — PARTIE SÉPARÉE' : 'MODE TEST — PARTIE SÉPARÉE'));
      const shortcut = document.getElementById('open-preview-tools');
      if (options.decorationPreview && shortcut) { shortcut.hidden = false; shortcut.onclick = () => { document.getElementById('open-settings')!.click(); host.scrollIntoView({block: 'start'}); }; }
      const back = document.createElement('a'); back.textContent = 'Retour au jeu normal';
      back.href = options.decorationPreview ? import.meta.env.BASE_URL + '../../' : import.meta.env.MODE === 'laboratory' ? import.meta.env.BASE_URL + '../' : import.meta.env.BASE_URL;
      badge.append(back);
      return () => { stopWatchingHomes(); disposeLevelDemo(); if (shortcut) { shortcut.hidden = true; shortcut.onclick = null; } host.replaceChildren(); host.hidden = true; badge.hidden = true; document.body.classList.remove('test-session'); };
    }};
}
