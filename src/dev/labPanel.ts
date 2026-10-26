import type {GameController, Operation} from '../application/GameController';
import type {GameState} from '../state/types';
import {labAction, type LabAction} from './labActions';
import {SPECIES, SPECIES_IDS} from '../config/species';
import {HABITATS, HABITAT_TYPES} from '../config/habitats';
import type {BuildingKind} from '../config/balance';
import {RARITY_NAMES} from '../ui/models';
import {portrait} from '../ui/portraits';
import {rabbitTheme, elementIcon} from '../display/rabbitPresentation';

export function mountLabPanel(host: HTMLElement, controller: GameController,
  replace: (state: GameState) => Operation | {ok: false; reason: string},
  report: (ok: boolean, message: string) => void, onReplacement: (fresh?: boolean) => void): () => void {
  const section = (title: string, id: string) => {
    const d = document.createElement('details'); d.id = `dev-section-${id}`;
    const summary = document.createElement('summary'); summary.textContent = title; d.append(summary); host.append(d); return d;
  };
  const row = (parent: HTMLElement) => { const r = document.createElement('div'); r.className = 'lab-row'; parent.append(r); return r; };
  const button = (parent: HTMLElement, label: string, id: string, run: () => void) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.id = `dev-${id}`; b.onclick = run; parent.append(b); return b;
  };
  const select = (parent: HTMLElement, label: string, id: string, options: [string, string][]) => {
    const wrap = document.createElement('label'); wrap.textContent = label;
    const s = document.createElement('select'); s.id = `dev-${id}`; wrap.append(s); parent.append(wrap);
    setOptions(s, options); return s;
  };
  function setOptions(s: HTMLSelectElement, options: [string, string][]) {
    const kept = s.value;
    s.replaceChildren(...options.map(([value, text]) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; }));
    if (options.some(([id]) => id === kept)) s.value = kept;
  }
  const range = (n: number): [string, string][] => Array.from({length: n}, (_, i) => [String(i + 1), String(i + 1)]);
  const perform = (action: LabAction, message: string) => {
    try {
      if (controller.storageScope !== 'laboratory') throw new Error('Cette action exige une partie de test isolée.');
      const before = controller.getSnapshot().state;
      if (!before) throw new Error('Aucune partie de test ouverte.');
      const after = labAction(before, action), result = replace(after);
      if (!result.ok) { report(false, 'Opération refusée : la validation ou la sauvegarde a échoué.'); return; }
      const added = after.buildings.filter(b => !before.buildings.some(old => old.id === b.id));
      const extra = added.length ? ` ${added.length} bâtiment(s) créé(s) gratuitement : ${added.map(b => b.habitat ? `${HABITATS[b.habitat.type].name} niveau ${b.habitat.level}` : b.kind).join(', ')}.` : '';
      const land = after.acquiredParcels.length - before.acquiredParcels.length;
      const warning = after.rabbits.some(r => r.affection > 14) && !after.buildings.some(b => b.kind === 'statue') ? ' Affection au-delà de 14 sans statue : dérogation du laboratoire.' : '';
      onReplacement(); report(true, message + extra + (land > 0 ? ` ${land} extension(s) ajoutée(s) gratuitement.` : '') + warning);
    } catch (e) { report(false, e instanceof Error ? e.message : 'Opération refusée.'); }
  };
  const resources = section('Ressources', 'resources');
  for (const [resource, name] of [['pattes', 'Pièces'], ['grass', 'Nourriture'], ['hearts', 'Cœurs']] as const) {
    const r = row(resources), label = document.createElement('label'); label.textContent = name;
    const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = String(Number.MAX_SAFE_INTEGER); input.step = '1'; input.inputMode = 'numeric'; input.value = String(controller.getSnapshot().state?.[resource] ?? 0); input.id = `dev-resource-${resource}`; label.append(input); r.append(label);
    button(r, 'Appliquer', `set-${resource}`, () => perform({type: 'resource', resource, value: input.value === '' ? NaN : Number(input.value)}, `${name} fixé(s) exactement.`));
    for (const value of [1000, 10000, 1000000]) button(r, value === 1000000 ? 'Beaucoup (1 000 000)' : `+${value.toLocaleString('fr-FR')}`, `resource-${resource}-${value}`, () => perform({type: 'resource', resource, value, add: value !== 1000000}, `${name} ${value === 1000000 ? 'fixé(s) à 1 000 000' : 'ajouté(s)'}.`));
  }
  const levels = section('Niveau du joueur', 'level'), level = select(levels, 'Niveau', 'level', range(30));
  button(levels, 'Appliquer le niveau', 'set-level', () => perform({type: 'level', level: Number(level.value)}, `Niveau ${level.value} fixé. Récompenses considérées comme reçues, sans ajout de cœurs.`));
  for (const amount of [50, 500]) button(levels, `+${amount} XP`, `xp-${amount}`, () => {
    const result = controller.grantLaboratoryXp(amount);
    report(result.ok, result.ok && result.progressionGain ? `+${result.progressionGain.xpGained} XP · niveaux récompensés : ${result.progressionGain.rewardedLevels.join(', ') || 'aucun'} · +${result.progressionGain.heartsGranted} cœurs.` : 'Progression refusée.');
  });
  const time = section('Terminer les délais', 'timers');
  button(time, 'Terminer tous les délais maintenant', 'finish-timers', () => perform({type: 'finishTimers'}, 'Délais terminés : cultures, nid, nurserie, voyages, cadeau de cœurs et quotidienne suivante. Rien n’est encaissé.'));
  const shop = section('Lapins — Boutique de test', 'shop'), affection = select(shop, 'Affection à l’ajout', 'shop-affection', range(20));
  button(shop, 'Un exemplaire de chaque espèce', 'all-rabbits', () => perform({type: 'allRabbits', affection: Number(affection.value)}, `${SPECIES_IDS.length} lapins ajoutés et espèces découvertes.`));
  button(shop, 'Toutes les recettes connues', 'all-recipes', () => perform({type: 'recipes', known: true}, 'Toutes les recettes sont connues.'));
  button(shop, 'Oublier les recettes achetées', 'reset-recipes', () => perform({type: 'recipes', known: false}, 'Recettes achetées oubliées, sans remboursement. Cadeaux et découvertes conservés.'));
  for (const rarity of Object.keys(RARITY_NAMES) as (keyof typeof RARITY_NAMES)[]) {
    const ids = SPECIES_IDS.filter(id => SPECIES[id].rarity === rarity); if (!ids.length) continue;
    const group = document.createElement('details'), title = document.createElement('summary'); title.textContent = `${RARITY_NAMES[rarity]} · ${ids.length}`; group.append(title); shop.append(group);
    for (const species of ids) {
      const info = SPECIES[species], r = row(group); rabbitTheme(r, species);
      const art = document.createElement('span'); art.className = 'portrait'; art.innerHTML = portrait(species); rabbitTheme(art, species);
      const name = document.createElement('span'); name.textContent = `${info.name} · ${RARITY_NAMES[rarity]} `; for (const type of info.types) name.append(elementIcon(type)); r.append(art, name);
      button(r, 'Ajouter', `add-${species}`, () => perform({type: 'rabbit', species, affection: Number(affection.value)}, `${info.name} ajouté et découvert.`));
    }
  }
  const bonds = section('Affection', 'affection'), rabbit = select(bonds, 'Lapin et habitat', 'affection-rabbit', []), value = select(bonds, 'Affection', 'affection-value', range(20));
  button(bonds, 'Appliquer l’affection', 'set-affection', () => perform({type: 'affection', rabbitId: rabbit.value || 'absent', value: Number(value.value)}, 'Affection du lapin fixée.'));
  for (const value of [2, 10, 15, 20]) button(bonds, `Tous les lapins à ${value}`, `affection-all-${value}`, () => perform({type: 'affection', value}, `Tous tes lapins ont une affection de ${value}.`));
  const buildings = section('Bâtiments et île', 'buildings');
  const kinds: [string, string][] = [['farm', 'Ferme'], ['kitchen', 'Cuisine'], ['agency', 'Agence de voyage'], ['statue', 'Statue de l’Affection'], ['nest', 'Nid'], ['nursery', 'Nurserie'], ...HABITAT_TYPES.map(t => [`habitat:${t}`, HABITATS[t].name] as [string, string])];
  const kind = select(buildings, 'Bâtiment à construire', 'build-kind', kinds);
  button(buildings, 'Construire gratuitement', 'build', () => { const [k, t] = kind.value.split(':'); perform({type: 'build', kind: k === 'habitat' ? 'enclosure' : k as BuildingKind, ...(t ? {habitatType: t as typeof HABITAT_TYPES[number]} : {})}, 'Construction terminée.'); });
  const building = select(buildings, 'Bâtiment à régler', 'building-id', []), buildingLevel = select(buildings, 'Niveau du bâtiment', 'building-level', range(3));
  const refreshLevel = () => { const b = controller.getSnapshot().state?.buildings.find(b => b.id === building.value); setOptions(buildingLevel, range(b?.kind === 'farm' ? 2 : 3)); };
  building.onchange = refreshLevel;
  button(buildings, 'Appliquer au bâtiment', 'set-building-level', () => perform({type: 'buildingLevel', id: building.value, level: Number(buildingLevel.value)}, 'Niveau et empreinte du bâtiment réglés. Un habitat peut être déplacé sur une case libre si nécessaire.'));
  const cushions = select(buildings, 'Coussins de la nurserie', 'nursery-capacity', range(4));
  button(buildings, 'Appliquer les coussins', 'set-nursery', () => perform({type: 'nursery', capacity: Number(cushions.value) as 1 | 2 | 3 | 4}, 'Capacité de la nurserie réglée.'));
  button(buildings, 'Acheter toutes les extensions de l’île', 'extensions', () => perform({type: 'extensions'}, 'Toutes les extensions sont acquises gratuitement.'));
  const missions = section('Missions et guidage', 'missions');
  for (const [type, label, message] of [
    ['mainMissions', 'Rendre toutes les missions principales prêtes à réclamer', 'Missions principales prêtes, récompenses déjà réclamées conservées.'],
    ['dailyMissions', 'Rendre les quotidiennes prêtes', 'Quotidiennes prêtes. Les suivantes restent soumises au délai après chaque réclamation.'],
    ['dailyCycle', 'Nouveau cycle quotidien', 'Nouveau cycle quotidien ouvert, progression remise à zéro.'],
    ['coco', 'Revoir l’accueil de Coco', 'L’agence attend à nouveau l’accueil de Coco.'],
    ['heartGift', 'Rendre le cadeau de cœurs disponible', 'Cadeau de cœurs disponible, à réclamer.'],
    ['market', 'Réinitialiser le comptoir de Paille', 'Compteurs du comptoir de Paille réinitialisés.'],
  ] as const) button(missions, label, type, () => perform({type}, message));
  button(missions, 'Relancer le tutoriel de Paille', 'tutorial', () => { onReplacement(true); report(true, 'Tutoriel de Paille relancé dans les préférences de test. Les progrès de jeu restent acquis.'); });
  const decorations = section('Décorations', 'decorations');
  button(decorations, 'Un exemplaire de chaque décoration', 'all-decorations', () => perform({type: 'decorations'}, 'Un exemplaire de chaque décoration ajouté gratuitement à ton inventaire, dont la statue du robot.'));
  return controller.subscribe(snapshot => {
    const s = snapshot.state; if (!s) return;
    setOptions(rabbit, s.rabbits.map(r => {
      const home = s.buildings.find(b => b.id === r.enclosureId);
      return [r.id, `${r.name || SPECIES[r.species].name} · ${home?.habitat ? HABITATS[home.habitat.type].name : r.enclosureId} (${r.enclosureId})`];
    }));
    setOptions(building, s.buildings.filter(b => ['enclosure', 'farm', 'agency'].includes(b.kind)).map(b => [b.id, `${b.habitat ? HABITATS[b.habitat.type].name : b.kind === 'farm' ? 'Ferme' : 'Agence'} · ${b.id} · niveau ${b.habitat?.level ?? b.farmLevel ?? b.agencyLevel ?? 1}`]));
    refreshLevel();
  });
}
