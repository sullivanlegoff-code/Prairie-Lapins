/**
 * Loading screen: real start-up steps, an honest progress value, and « Jouer » only when every
 * required step is done. A required failure or slow step offers « Réessayer »; music is optional
 * and never blocks entering the game.
 */
export type StepId = 'save' | 'fonts' | 'textures' | 'scene' | 'music';
export type StepState = 'pending' | 'slow' | 'done' | 'warning' | 'failed';
export interface StepDefinition {id: StepId; label: string; required: boolean; weight: number; timeout: number}
export const LOADING_STEPS: readonly StepDefinition[] = [
  {id: 'save', label: 'Partie', required: true, weight: 1, timeout: 15_000},
  {id: 'fonts', label: 'Polices', required: false, weight: 1, timeout: 6_000},
  {id: 'textures', label: 'Images du jeu', required: true, weight: 4, timeout: 45_000},
  {id: 'scene', label: 'Prairie', required: true, weight: 1, timeout: 45_000},
  {id: 'music', label: 'Musique', required: false, weight: 1, timeout: 12_000},
];
export interface StepStatus extends StepDefinition {state: StepState; fraction: number; note: string}
export interface LoadingView {steps: StepStatus[]; progress: number; ready: boolean; failed: boolean; message: string}
type Timers = {set(callback: () => void, ms: number): unknown; clear(handle: unknown): void};
const realTimers: Timers = {set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)};

export class LoadingTracker {
  private steps: StepStatus[];
  private timers = new Map<StepId, unknown>();
  private listeners = new Set<(view: LoadingView) => void>();
  constructor(definitions: readonly StepDefinition[] = LOADING_STEPS, private timersApi: Timers = realTimers) {
    this.steps = definitions.map(d => ({...d, state: 'pending', fraction: 0, note: ''}));
    for (const step of this.steps) this.timers.set(step.id, this.timersApi.set(() => this.timeout(step.id), step.timeout));
  }
  subscribe(listener: (view: LoadingView) => void): () => void { this.listeners.add(listener); listener(this.view()); return () => this.listeners.delete(listener); }
  /** Partial progress of a step (texture loader 0–1). */
  progress(id: StepId, fraction: number): void { const s = this.get(id); if (s.state !== 'pending' && s.state !== 'slow') return; s.fraction = Math.min(1, Math.max(0, fraction)); this.emit(); }
  done(id: StepId, note = ''): void { this.finish(id, 'done', note); }
  /** Finished, with something to report that does not block (unreadable save, no music...). */
  warn(id: StepId, note: string): void { this.finish(id, 'warning', note); }
  fail(id: StepId, note: string): void { const s = this.get(id); this.finish(id, s.required ? 'failed' : 'warning', note); }
  view(): LoadingView {
    const total = this.steps.reduce((n, s) => n + s.weight, 0);
    const reached = this.steps.reduce((n, s) => n + s.weight * ((s.state === 'pending' || s.state === 'slow') ? s.fraction : s.state === 'failed' ? 0 : 1), 0);
    const failed = this.steps.find(s => s.state === 'failed');
    const ready = !failed && this.steps.every(s => !s.required || s.state === 'done' || s.state === 'warning');
    const slow = this.steps.some(s => s.state === 'slow');
    const notes = this.steps.filter(s => s.state === 'warning' && s.note).map(s => s.note);
    return {steps: this.steps.map(s => ({...s})), progress: reached / total, ready, failed: !!failed,
      message: failed ? `${failed.note} Vérifiez la connexion puis réessayez.` : [slow ? 'Connexion lente, le chargement continue…' : '', ...notes].filter(Boolean).join(' ')};
  }
  dispose(): void { for (const handle of this.timers.values()) this.timersApi.clear(handle); this.timers.clear(); this.listeners.clear(); }
  private finish(id: StepId, state: StepState, note: string): void {
    const s = this.get(id); if (s.state !== 'pending' && s.state !== 'slow') return;
    s.state = state; s.note = note; s.fraction = state === 'failed' ? 0 : 1;
    const handle = this.timers.get(id); if (handle !== undefined) this.timersApi.clear(handle); this.timers.delete(id);
    this.emit();
  }
  private timeout(id: StepId): void {
    const s = this.get(id); if (s.state !== 'pending' && s.state !== 'slow') return;
    if (s.required) { s.state = 'slow'; this.timers.delete(id); this.emit(); return; }
    this.fail(id, s.id === 'music' ? 'Musique indisponible : le jeu reste jouable sans elle.' : `Le chargement « ${s.label} » prend trop de temps.`);
  }
  private get(id: StepId): StepStatus { return this.steps.find(s => s.id === id)!; }
  private emit(): void { const view = this.view(); for (const listener of this.listeners) listener(view); }
}

/** Renders the tracker into the static #loading-screen markup (visible before any script runs). */
export function renderLoading(root: HTMLElement, view: LoadingView): void {
  const bar = root.querySelector<HTMLElement>('.loading-bar')!, percent = Math.round(view.progress * 100);
  bar.setAttribute('aria-valuenow', String(percent)); bar.querySelector<HTMLElement>('span')!.style.width = `${percent}%`;
  const list = root.querySelector<HTMLOListElement>('#loading-steps')!;
  list.replaceChildren(...view.steps.map(s => {
    const item = document.createElement('li'); item.dataset.state = s.state; item.dataset.step = s.id;
    const mark = s.state === 'done' ? '✓' : s.state === 'warning' ? '!' : s.state === 'failed' ? '✕' : '…';
    item.textContent = `${mark} ${s.label}`; return item;
  }));
  root.querySelector<HTMLElement>('#loading-message')!.textContent = view.message;
  const play = root.querySelector<HTMLButtonElement>('#loading-play')!, retry = root.querySelector<HTMLButtonElement>('#loading-retry')!;
  play.disabled = !view.ready; play.hidden = !view.ready; retry.hidden = !view.failed && !view.steps.some(s => s.state === 'slow');
  root.dataset.state = view.failed ? 'failed' : view.ready ? 'ready' : 'loading';
}
