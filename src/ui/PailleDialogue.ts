import type {GameState} from '../state/types';
import {MAX_RABBIT_NAME_LENGTH, normalizeRabbitName} from '../simulation/rabbitNames';
import {onboardingTask, pailleAnimation, pailleLines, type PailleGesture} from './onboarding';
import type {PreferenceStore} from './preferences';

/** Owns only the modal presentation; all game changes use the controller callback. */
export class PailleDialogue {
  readonly element = document.createElement('dialog');
  private scene: number | null = null;
  private line = 0;
  private key = '';
  private dismissed = '';
  private label = '';
  invite(): void { this.dismissed = ''; }
  private state: GameState | null = null;
  private previousFocus: HTMLElement | null = null;
  private text = document.createElement('p');
  private motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private animationTimers = new Set<ReturnType<typeof setTimeout>>();
  private motionChanged = (): void => {
    this.clearAnimations();
    if (!this.motionPreference?.matches && this.scene !== null) this.scheduleHop();
  };
  constructor(private preferences: PreferenceStore, private rename: (id: string, name: string) => boolean,
    private finished: (scene: number) => void, private skipped: () => void, private settings: () => void) {
    this.element.className = 'paille-dialogue'; this.element.id = 'paille-dialogue';
    this.element.setAttribute('aria-label', 'Paille te parle');
    this.element.setAttribute('aria-modal', 'false'); this.element.tabIndex = -1;
    this.element.addEventListener('cancel', event => event.preventDefault());
    this.element.addEventListener('click', event => {
      if (!(event.target as HTMLElement).closest('button, input, form')) this.advance();
    });
    this.element.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).closest('button, input')) { event.preventDefault(); this.advance(); }
    });
    document.body.append(this.element);
    this.motionPreference?.addEventListener('change', this.motionChanged);
  }
  private later(callback: () => void, delay: number): void {
    const timer = setTimeout(() => { this.animationTimers.delete(timer); callback(); }, delay);
    this.animationTimers.add(timer);
  }
  private clearAnimations(): void {
    this.animationTimers.forEach(timer => clearTimeout(timer)); this.animationTimers.clear();
    this.element.querySelectorAll('.paille-heart').forEach(heart => heart.remove());
    this.element.querySelectorAll('.paille-motion').forEach(actor => actor.classList.remove('paille-hop', 'paille-flip', 'paille-dizzy'));
  }
  private gesture(actor: HTMLElement | null, gesture: PailleGesture): void {
    if (!actor) return;
    actor.classList.add(`paille-${gesture}`);
    this.later(() => actor.classList.remove(`paille-${gesture}`), gesture === 'hop' ? 800 : 900);
  }
  private hearts(actor: HTMLElement | null, count: number): void {
    if (!actor) return;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span'); heart.className = 'paille-heart';
      heart.textContent = '♥'; heart.setAttribute('aria-hidden', 'true');
      heart.style.setProperty('--heart-x', `${(i - (count - 1) / 2) * 15}px`);
      heart.style.setProperty('--heart-drift', `${i % 2 ? 14 : -14}px`);
      heart.style.animationDelay = `${i * 90}ms`; actor.append(heart);
      this.later(() => heart.remove(), 1500 + i * 90);
    }
  }
  private scheduleHop(): void {
    this.later(() => {
      if (this.scene === null || this.motionPreference?.matches) return;
      this.gesture(this.element.querySelector('.slot-paille .paille-motion'), 'hop');
      this.scheduleHop();
    }, 6000 + Math.random() * 6000);
  }
  private animateLine(): void {
    if (this.motionPreference?.matches) return;
    const animation = pailleAnimation(this.scene!, this.line);
    const actor = this.element.querySelector<HTMLElement>('.slot-paille');
    if (animation.gesture) this.gesture(actor?.querySelector('.paille-motion') ?? null, animation.gesture);
    if (animation.hearts) this.hearts(actor, 4);
    if (animation.neigeReply) {
      const neige = this.element.querySelector<HTMLElement>('.slot-neige');
      this.gesture(neige?.querySelector('.paille-motion') ?? null, 'hop'); this.hearts(neige, 1);
    }
    this.scheduleHop();
  }
  update(state: GameState | null, enabled: boolean, now = 0, present = true): boolean {
    this.state = state;
    if (!state || !enabled || state.startCourse !== 'paille-solo' || !this.preferences.value.tutorial || this.preferences.value.tutorialDone) { this.close(); return false; }
    const task = onboardingTask(state, this.preferences.value, now);
    this.label = task.label;
    if (this.scene !== null && this.key === task.key) return true;
    if (this.key !== task.key) this.close();
    if (this.dismissed === task.key || !present) return false;
    this.key = task.key; this.label = task.label;
    this.scene = task.scene; this.line = this.scene === 1 && this.preferences.value.pailleNamed ? 4 : 0;
    this.previousFocus = document.activeElement as HTMLElement;
    this.render(); this.element.show(); this.element.focus(); return true;
  }
  private get name(): string { return this.state?.rabbits.find(r => r.species === 'paille')?.name || 'Paille'; }
  private get naming(): boolean { return this.scene === 1 && this.line === 2 && !this.preferences.value.pailleNamed && !this.state?.rabbits.find(r => r.species === 'paille')?.name; }
  private get action(): string | null {
    return this.scene !== null && this.line === pailleLines(this.scene, this.name).length - 1 ? this.label : null;
  }
  private advance(): void {
    if (this.scene === null || this.naming || this.action) return;
    if (this.line + 1 < pailleLines(this.scene, this.name).length) {
      this.line++;
      if (this.scene === 1 && this.line === 2 && !this.naming) this.line++;
      this.render();
    } else this.finish();
  }
  private finish(): void {
    const scene = this.scene; if (scene === null) return;
    this.preferences.set({pailleScenes: [...new Set([...this.preferences.value.pailleScenes, scene])], intro: true, guideCamera: true});
    this.dismissed = this.key; this.close(); this.finished(scene);
  }
  private render(): void {
    this.clearAnimations();
    const scene = this.scene!; this.element.dataset.scene = String(scene);
    const stage = document.createElement('div'); stage.className = 'paille-stage';
    const art = document.createElement('div'); art.className = 'paille-actors';
    for (const species of scene === 5 ? ['paille', 'neige'] : ['paille']) {
      const slot = document.createElement('div'); slot.className = `paille-slot slot-${species}`;
      const motion = document.createElement('div'); motion.className = 'paille-motion';
      const idle = document.createElement('div'); idle.className = species === 'paille' ? 'paille-idle' : 'neige-idle';
      const img = document.createElement('img'); img.src = `${import.meta.env.BASE_URL}assets/rabbits/${species}/${species}-v1.png`; img.alt = species === 'paille' ? this.name : 'Neige'; img.className = `paille-actor actor-${species}`;
      idle.append(img); motion.append(idle); slot.append(motion); art.append(slot);
    }
    const bubble = document.createElement('div'); bubble.className = 'paille-bubble';
    if (scene === 5) { const to = document.createElement('small'); to.textContent = `à ${this.state?.rabbits.find(r => r.species === 'neige')?.name || 'Neige'}`; bubble.append(to); }
    this.text = document.createElement('p'); this.text.id = 'paille-speech'; this.text.setAttribute('aria-live', 'polite'); this.text.setAttribute('aria-atomic', 'true');
    this.text.textContent = pailleLines(scene, this.name)[this.line]; bubble.append(this.text);
    this.element.setAttribute('aria-describedby', this.text.id);
    if (this.naming) {
      const form = document.createElement('form'), label = document.createElement('label'), input = document.createElement('input'), error = document.createElement('p');
      label.textContent = 'Mon prénom'; input.id = 'paille-name'; label.htmlFor = input.id;
      input.autofocus = true; input.setAttribute('enterkeyhint', 'done'); input.autocomplete = 'off'; input.setAttribute('aria-describedby', 'paille-name-error');
      error.id = 'paille-name-error'; error.setAttribute('role', 'alert'); error.className = 'paille-name-error';
      const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Valider';
      form.append(label, input, error, submit); form.addEventListener('submit', event => {
        event.preventDefault(); const name = normalizeRabbitName(input.value);
        if (!name) { error.textContent = name === '' ? 'Choisis un prénom : le champ est vide.' : `Choisis un prénom valide de ${MAX_RABBIT_NAME_LENGTH} caractères maximum.`; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
        const rabbit = this.state?.rabbits.find(r => r.species === 'paille');
        if (!rabbit || !this.rename(rabbit.id, name)) { error.textContent = 'Le prénom n’a pas pu être enregistré. Réessaie ou passe le tutoriel.'; return; }
        this.preferences.set({pailleNamed: true}); this.line++; this.render(); this.element.focus();
      }); bubble.append(form);
    } else if (this.action) {
      const button = document.createElement('button'); button.textContent = this.action; button.onclick = () => this.finish(); bubble.append(button);
    } else { const hint = document.createElement('small'); hint.className = 'paille-continue'; hint.textContent = 'Toucher pour continuer'; bubble.append(hint); }
    stage.append(art, bubble);
    const skip = document.createElement('button'); skip.className = 'paille-skip'; skip.textContent = 'Passer le tutoriel';
    skip.onclick = () => { this.preferences.set({tutorial: false}); this.close(); this.skipped(); };
    const settings = document.createElement('button'); settings.className = 'paille-settings'; settings.textContent = 'Paramètres'; settings.onclick = () => { this.dismissed = this.key; this.close(); this.settings(); };
    this.element.replaceChildren(stage, skip, settings);
    this.animateLine();
    // Called synchronously from the touch advancing to the naming line, so mobile keyboards can open.
    if (this.naming) this.element.querySelector('input')?.focus();
  }
  close(): void { this.clearAnimations(); if (this.element.open) this.element.close(); this.scene = null; if (this.previousFocus?.isConnected) this.previousFocus.focus(); this.previousFocus = null; }
  dispose(): void { this.close(); this.motionPreference?.removeEventListener('change', this.motionChanged); this.element.remove(); }
}
