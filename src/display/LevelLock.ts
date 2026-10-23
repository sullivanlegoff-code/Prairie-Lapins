import type {LevelAccess} from '../simulation/levelAccess';

/** Owns only its message and the supplied action's disabled state; information stays usable. */
export function mountLevelLock(card: HTMLElement, actions: HTMLButtonElement | readonly HTMLButtonElement[]) {
  const controls=Array.isArray(actions)?actions:[actions as HTMLButtonElement];
  const message = document.createElement('p');
  message.className = 'level-lock-message'; message.setAttribute('role', 'status');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(icon.namespaceURI, 'path');
  path.setAttribute('d', 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3');
  icon.append(path);
  const text = document.createElement('span'); message.append(icon, text);
  const first=controls[0];
  if (first?.parentElement === card) card.insertBefore(message, first); else card.append(message);
  const description = `level-lock-${++sequence}`; message.id = description;
  const ownedControls=controls.map(action=>({action,originalDescription:action.getAttribute('aria-describedby'),previousDisabled:action.disabled,owned:false}));
  const restore = () => {
    for(const control of ownedControls){
      if(control.owned)control.action.disabled=control.previousDisabled;
      control.owned=false;
      if(control.originalDescription===null)control.action.removeAttribute('aria-describedby');
      else control.action.setAttribute('aria-describedby',control.originalDescription);
    }
  };
  return {
    update(access: LevelAccess) {
      card.classList.toggle('level-locked', access.locked); message.hidden = !access.locked;
      text.textContent = access.locked ? `Niveau ${access.requiredLevel} requis` : '';
      if (access.locked) {
        for(const control of ownedControls){
          if(!control.owned)control.previousDisabled=control.action.disabled;
          control.owned=true;control.action.disabled=true;
          control.action.setAttribute('aria-describedby',[control.originalDescription,description].filter(Boolean).join(' '));
        }
      } else restore();
    },
    destroy() {restore(); card.classList.remove('level-locked'); message.remove();},
  };
}
let sequence = 0;
