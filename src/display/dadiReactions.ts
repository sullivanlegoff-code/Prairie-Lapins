import type {Command, GameState} from '../state/types';
import {nestForParent} from '../simulation/breeding';
import {travelling} from '../simulation/travel';

export const DADI_INTERVAL = 10 * 60_000;
export const DADI_SPEECH_DURATION = 5_500;
export const DADI_WELCOME = 'C’est Dadi on t’a dit';
export const DADI_BREEDING = 'Tu me fais tourner la tête';
export const DADI_IDLE = ['Bah Ouais !', 'Viens on fait nos bails'] as const;
export interface DadiReaction {id: string; text: string; salto: boolean}

/** Session-only presentation: no persisted timers and no use of the reproduction RNG. */
export class DadiReactions {
  private state: GameState | null = null;
  private generation: number | null = null;
  private elapsed = 0;
  private pending: DadiReaction[] = [];
  private speaking: {reaction: DadiReaction; remaining: number} | null = null;

  constructor(private random: () => number = Math.random) {}

  sync(state: GameState | null, generation: number): void {
    if (generation !== this.generation) { this.reset(); this.generation = generation; }
    this.state = state;
    const present = (id: string) => !!state?.rabbits.some(r => r.id === id && r.species === 'dadi') && !travelling(state!, id);
    this.pending = this.pending.filter(r => present(r.id));
    if (this.speaking && !present(this.speaking.reaction.id)) this.speaking = null;
    if (!state?.rabbits.some(r => r.species === 'dadi')) this.elapsed = 0;
  }

  confirmed(command: Command): void {
    const state = this.state;
    if (!state) return;
    const ids = command.type === 'welcome' ? [command.birthId] : command.type === 'breed' ? command.parents : [];
    for (const id of ids) if (state.rabbits.some(r => r.id === id && r.species === 'dadi')) {
      this.pending.push({id, text: command.type === 'welcome' ? DADI_WELCOME : DADI_BREEDING, salto: command.type === 'welcome'});
    }
  }

  /** A large frame after suspension never counts as time played. Only one rabbit speaks at once. */
  step(dt: number, active: boolean, visibleIds: readonly string[]): {speech: DadiReaction | null; started: DadiReaction | null} {
    if (!active) { this.clearSpeech(); return {speech: null, started: null}; }
    const delta = Math.min(250, Math.max(0, dt));
    if (this.speaking && visibleIds.includes(this.speaking.reaction.id)) {
      this.speaking.remaining -= delta;
      if (this.speaking.remaining <= 0) this.speaking = null;
    }
    const state = this.state;
    const residents = state?.rabbits.filter(r => r.species === 'dadi' && !nestForParent(state, r.id) && !travelling(state, r.id)) ?? [];
    if (residents.length) this.elapsed += delta;
    if (this.elapsed >= DADI_INTERVAL) {
      this.elapsed = 0;
      const candidates = residents.filter(r => visibleIds.includes(r.id));
      if (candidates.length && !this.speaking && !this.pending.length) {
        const rabbit = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
        const text = DADI_IDLE[this.random() < .5 ? 0 : 1];
        this.pending.push({id: rabbit.id, text, salto: false});
      }
    }
    let started: DadiReaction | null = null;
    if (!this.speaking) {
      const index = this.pending.findIndex(r => visibleIds.includes(r.id));
      if (index >= 0) {
        const reaction = this.pending.splice(index, 1)[0];
        started = reaction; this.speaking = {reaction, remaining: DADI_SPEECH_DURATION};
      }
    }
    return {speech: this.speaking?.reaction ?? null, started};
  }

  clearSpeech(): void { this.pending = []; this.speaking = null; }
  reset(): void { this.clearSpeech(); this.elapsed = 0; this.state = null; }
}
