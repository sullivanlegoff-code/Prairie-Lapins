import {FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {pauseWhenLeft, type pausableClock} from './activityPause';

/**
 * What the three arcade games (corde à sauter, cadeaux du ciel, vol de Benny) share (plan 3.9): the card's buttons and lines,
 * the frame loop, the pause when the player leaves the page, resuming, and leaving the game. Each game keeps its own rules,
 * drawing and texts; the names of its buttons (`data-…` keys) and its title class stay its own, so its styles and tests hold.
 */
export interface ArcadeShellOptions {
  layer: HTMLElement; card: HTMLElement; signal: AbortSignal;
  time: ReturnType<typeof pausableClock>;
  frame: (step: () => void) => unknown;
  /** The game's own playing flag (read and written by the shell: the game sets it when a game starts or ends). */
  running: {get(): boolean; set(value: boolean): void};
  /** The class of the pause card's title, and the `data-…` keys of its two buttons. */
  names: {title: string; resume: string; quit: string};
  /** One frame of the game. */
  update(): void;
  /** Just before the game goes on after a pause (the flight restarts its fall's clock). */
  onResume?(): void;
  /** Leaving: the game forgets its round (the layer is hidden after this). */
  onClose(): void;
  onExit?(): void;
}
export function arcadeShell(o: ArcadeShellOptions) {
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { o.card.replaceChildren(...children); o.card.hidden = false; }
  let scheduled = false;
  function schedule(): void { if (scheduled) return; scheduled = true; o.frame(() => { scheduled = false; loop(); }); }
  function loop(): void { if (!o.running.get()) return; o.update(); if (o.running.get()) schedule(); }
  /** The game comes on screen, full screen. */
  function show(): void { o.layer.hidden = false; window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: true})); }
  function close(): void {
    if (o.layer.hidden) return;
    o.running.set(false); o.time.resume(); o.onClose(); o.layer.hidden = true;
    window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: false})); o.onExit?.();
  }
  /** The phone locked or another app opened: the game waits, frozen, instead of being lost to the time gone by. */
  function pause(): void {
    if (!o.running.get()) return;
    o.time.pause(); o.running.set(false);
    showCard(paragraph('Partie en pause', o.names.title), button('Reprendre', resume, o.names.resume), button('Quitter', close, o.names.quit));
  }
  function resume(): void { o.time.resume(); o.running.set(true); o.card.hidden = true; o.onResume?.(); schedule(); }
  pauseWhenLeft(pause, o.signal);
  return {button, paragraph, showCard, schedule, show, close, pause, resume};
}
