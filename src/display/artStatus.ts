/** A recoverable image failure never repeats the player's purchase or reloads their game. */
export function mountArtStatus(parent: HTMLElement) {
  const root = document.createElement('div'), message = document.createElement('span'), button = document.createElement('button');
  root.id = 'meadow-art-status'; root.className = 'rabbit-move-banner'; root.hidden = true;
  message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  button.type = 'button'; button.textContent = 'Réessayer';
  let retry = () => {};
  const click = () => retry();
  button.addEventListener('click', click); root.append(message, button); parent.append(root);
  return {
    update(status: 'loading' | 'failed' | 'ready', next: () => void) {
      retry = next; root.hidden = status === 'ready'; button.hidden = status !== 'failed';
      message.textContent = status === 'loading' ? 'Les images de ta prairie arrivent…' : 'Certaines images n’ont pas pu arriver. Ta partie est conservée.';
    },
    dispose() { button.removeEventListener('click', click); root.remove(); retry = () => {}; },
  };
}
