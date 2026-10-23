import {PROGRESSION} from '../config/progression';
import {cumulativeLevelXp} from '../simulation/progression';
import {checkLevelAccess} from '../simulation/levelAccess';
import {mountLevelLock} from '../display/LevelLock';

/** Local presentation data only: never modifies the controller, XP, activation registry or saves. */
export function mountLevelAccessDemo(host: HTMLElement): () => void {
  const open = document.createElement('button'); open.id = 'dev-level-lock-demo'; open.textContent = 'Démonstration des verrous de niveau';
  const dialog = document.createElement('dialog'); dialog.className = 'level-access-demo'; dialog.id = 'level-access-demo'; dialog.setAttribute('aria-label', 'Démonstration des verrous');
  const title = document.createElement('h2'); title.textContent = 'Verrous de niveau — démonstration';
  const note = document.createElement('p'); note.textContent = 'Données simulées, sans achat ni sauvegarde. Cette démonstration ne modifie pas les règles du jeu.';
  const card = document.createElement('article'); card.className = 'card';
  const name = document.createElement('h3'); name.textContent = 'Lapin Feu';
  const information = document.createElement('button'); information.textContent = 'Consulter la fiche'; information.id = 'level-demo-info';
  const details = document.createElement('p'); details.textContent = 'Type Feu · Commun. Le niveau ne remplace pas les conditions de ressources, de compatibilité ou de place.'; details.hidden = true;
  const action = document.createElement('button'); action.textContent = 'Action de démonstration'; action.id = 'level-demo-action';
  card.append(name, information, details, action);
  const lock = mountLevelLock(card, action);
  const level = document.createElement('p'); level.setAttribute('role', 'status');
  const toggle = document.createElement('button'); toggle.id = 'level-demo-toggle';
  const close = document.createElement('button'); close.textContent = 'Fermer'; close.id = 'level-demo-close';
  // Explicit alternate test configuration; PROGRESSION remains untouched.
  const c = {...PROGRESSION, activeLevelFamilies: {...PROGRESSION.activeLevelFamilies, species: true}};
  let simulatedLevel = 4;
  const render = () => {
    lock.update(checkLevelAccess(cumulativeLevelXp(simulatedLevel, c), {family: 'species', id: 'feu', action: 'purchase'}, [], c));
    level.textContent = `Niveau simulé : ${simulatedLevel}`;
    toggle.textContent = simulatedLevel === 4 ? 'Simuler le niveau 5' : 'Revenir au niveau 4';
  };
  open.onclick = () => {render(); dialog.showModal();};
  information.onclick = () => {details.hidden = !details.hidden;};
  toggle.onclick = () => {simulatedLevel = simulatedLevel === 4 ? 5 : 4; render();};
  action.onclick = () => {level.textContent = 'Niveau suffisant pour cette démonstration. Aucun achat réalisé.';};
  close.onclick = () => dialog.close();
  dialog.append(title, note, level, card, toggle, close); host.append(open); document.body.append(dialog); render();
  return () => {dialog.close(); lock.destroy(); open.onclick = information.onclick = toggle.onclick = action.onclick = close.onclick = null; open.remove(); dialog.remove();};
}
