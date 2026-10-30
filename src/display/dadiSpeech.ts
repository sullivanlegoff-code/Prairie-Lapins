import type {Point} from '../ui/gestures';
import type {DadiReaction} from './dadiReactions';
import './dadiSpeech.css';

export interface DadiSpeechBounds {width: number; height: number; top: number}
/** Shared by scheduling and rendering: visible feet alone are not enough when the head is behind the HUD. */
export function dadiHeadVisible(head: Point | null, bounds: DadiSpeechBounds): head is Point {
  return !!head && head.x >= 0 && head.x <= bounds.width && head.y >= bounds.top && head.y <= bounds.height;
}

/** A real speech bubble in CSS pixels: legible even when the meadow is zoomed out. */
export class DadiSpeech {
  readonly element = document.createElement('div');
  constructor(host: HTMLElement) {
    this.element.className = 'dadi-speech'; this.element.hidden = true;
    this.element.setAttribute('role', 'status'); this.element.setAttribute('aria-live', 'polite');
    host.append(this.element);
  }
  show(reaction: DadiReaction | null, head: Point | null, bounds: DadiSpeechBounds): void {
    const element = this.element;
    if (!reaction || !dadiHeadVisible(head, bounds)) { this.hide(); return; }
    if (element.textContent !== reaction.text) element.textContent = reaction.text;
    element.dataset.rabbitId = reaction.id;
    element.hidden = false;
    const half = element.offsetWidth / 2, margin = 10;
    const x = Math.max(half + margin, Math.min(bounds.width - half - margin, head.x));
    const y = Math.max(bounds.top + element.offsetHeight + margin, head.y - 12);
    element.style.left = `${x}px`; element.style.top = `${y}px`;
    element.style.setProperty('--dadi-tail', `${Math.max(18, Math.min(element.offsetWidth - 18, half + head.x - x))}px`);
  }
  hide(): void { this.element.hidden = true; this.element.textContent = ''; delete this.element.dataset.rabbitId; }
  destroy(): void { this.element.remove(); }
}
