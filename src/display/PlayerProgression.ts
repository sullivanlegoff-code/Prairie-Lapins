import type {Snapshot, ConfirmedProgressionGain} from '../application/GameController';
import {progressionFromXp} from '../simulation/progression';

/** Stable DOM and derived values only; never mutates or performs a game command. */
export function mountPlayerProgression() {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const button = get<HTMLButtonElement>('player-progress'), badge = get('player-level');
  const bar = get('player-xp-bar'), fill = get('player-xp-fill'), label = get('player-xp-label');
  const dialog = get<HTMLDialogElement>('player-progress-dialog');
  const level = get('player-detail-level'), total = get('player-detail-total'), remaining = get('player-detail-remaining');
  const abort = new AbortController(), options = {signal: abort.signal};
  const format = new Intl.NumberFormat('fr-FR');
  button.addEventListener('click', () => { if (!button.disabled && !dialog.open) dialog.showModal(); }, options);
  get('close-player-progress').addEventListener('click', () => dialog.close(), options);
  // No pointer/wheel event on the detail or its backdrop reaches the meadow.
  for (const event of ['pointerdown','pointerup','pointermove','wheel','touchstart','touchmove','touchend'])
    dialog.addEventListener(event, e => e.stopPropagation(), options);
  let generation: number | undefined;
  let animationTimer: ReturnType<typeof setTimeout> | undefined;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clearAnimation() { clearTimeout(animationTimer); bar.classList.remove('xp-animated','xp-level-change'); }

  return {
    confirmedGain(gain: ConfirmedProgressionGain) {
      clearAnimation();
      if (!reduced.matches) {
        bar.classList.add(gain.toLevel === gain.fromLevel ? 'xp-animated' : 'xp-level-change');
        animationTimer = setTimeout(clearAnimation,450);
      }
    },
    update(snapshot: Snapshot) {
      if (generation !== undefined && generation !== snapshot.generation && dialog.open) dialog.close();
      if (generation !== snapshot.generation) clearAnimation();
      generation = snapshot.generation;
      button.disabled = !snapshot.state;
      if (!snapshot.state) {
        badge.textContent = '—'; label.textContent = 'Niveau indisponible'; fill.style.width = '0%';
        bar.removeAttribute('aria-valuenow'); bar.removeAttribute('aria-valuemax');
        bar.setAttribute('aria-valuetext', 'Aucune partie chargée'); button.setAttribute('aria-label', 'Niveau du joueur indisponible');
        if (dialog.open) dialog.close(); return;
      }
      const p = progressionFromXp(snapshot.state.progression.totalXp);
      badge.textContent = String(p.level);
      label.textContent = p.maximum ? 'Niveau maximum' : `${format.format(p.xpInLevel)} / ${format.format(p.xpRequired!)} XP`;
      fill.style.width = `${p.progress * 100}%`;
      bar.setAttribute('aria-valuenow', String(p.maximum ? 1 : p.xpInLevel));
      bar.setAttribute('aria-valuemax', String(p.maximum ? 1 : p.xpRequired));
      bar.setAttribute('aria-valuetext', p.maximum ? 'Niveau maximum' : label.textContent);
      button.setAttribute('aria-label', `Niveau du joueur ${p.level} · ${label.textContent} · Voir le détail`);
      level.textContent = `Niveau du joueur ${p.level}`;
      total.textContent = `${format.format(p.totalXp)} XP au total`;
      remaining.textContent = p.maximum ? 'Niveau maximum' : `${format.format(p.xpRequired! - p.xpInLevel)} XP avant le niveau suivant`;
    },
    dispose() { clearAnimation(); abort.abort(); if (dialog.open) dialog.close(); },
  };
}
