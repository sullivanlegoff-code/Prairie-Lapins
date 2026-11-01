import type {KitchenSnapshot} from '../../cooktap-prototype/engine';


/**
 * What the two cooks say (owner's request, 1 November 2026). The commis guides: after 2 seconds without any action it says
 * the next step (the guide's own words), and otherwise encourages now and then. The taster sometimes reacts to a successful
 * step, never while the commis talks. Pure and clock-driven: the activity calls it with the kitchen snapshot and the time.
 */
/** What the commis is doing, read from the kitchen's own state (the engine stays rabbit-agnostic). */
export type CommisMood = 'idle' | 'teary' | 'sniff' | 'impatient';
export function commisMood(snapshot: KitchenSnapshot): CommisMood {
  if (snapshot.phase !== 'playing') return 'idle';
  if (snapshot.cookingRemainingMs > 0) return snapshot.cookingHeater === 'oven' ? 'impatient' : 'sniff';
  const item = (id: string) => snapshot.items.find(i => i.id === id && i.visible);
  const next = snapshot.steps.filter(s => s.next);
  // Cutting a shallot stings the eyes: from the moment it lies on the board until it leaves it.
  if (item('shallot')?.location === 'cutting-board') return 'teary';
  // Chocolate smells good: the bar, the melting pan and the chocolate batter.
  if (next.some(s => s.actor === 'chocolate' || s.actor === 'butter' || s.actor === 'saucepan') || item('saucepan')?.state === 'melted') return 'sniff';
  return 'idle';
}
export const HINT_DELAY_MS = 2000, HINT_REPEAT_MS = 4000, LINE_MS = 2600;
/** `key` changes each time a line is said again (the bubble pops again); the text never flickers while it stays. */
export interface TalkLine {readonly text: string; readonly kind: 'hint' | 'cheer' | 'react'; readonly key: number}
export interface TalkState {readonly commis: TalkLine | null; readonly taster: TalkLine | null}

const CHEERS = {
  early: ['C’est parti, chef !', 'On fait une super équipe !', 'Joli geste !'],
  middle: ['Continue comme ça !', 'Ça prend forme !', 'Tu as le coup de main, chef !'],
  late: ['Le plat est bientôt prêt !', 'Encore un petit effort, on y est presque !'],
} as const;
const OVEN = 'Prépare tes papilles, la masterclass arrive !', PAN = 'Ça grésille, ça sent déjà bon !', SHALLOT = 'Ça pique les yeux !';
const REACTIONS = ['Ça sent bon !', 'Tu cuisines vraiment bien !', 'Waouh, quelle technique !', 'J’ai hâte de goûter !'] as const;

export function createKitchenTalk(withTaster: boolean) {
  let lastAction: number | null = null, key = 0, successes = 0, cheerIndex = 0, reactionIndex = 0, mood: CommisMood = 'idle', cooking = false;
  let commis: TalkLine | null = null, commisUntil = 0, hintAt = 0, taster: TalkLine | null = null, tasterUntil = 0;
  const say = (text: string, kind: 'hint' | 'cheer', now: number) => {
    commis = {text, kind, key: ++key}; commisUntil = kind === 'hint' ? Infinity : now + LINE_MS;
    taster = null; // Never both at once: the commis has the floor.
  };
  const action = (now: number) => { lastAction = now; if (commis?.kind === 'hint') commis = null; };
  const state = (): TalkState => ({commis, taster});
  const expire = (now: number) => { if (commis && now >= commisUntil) commis = null; if (taster && now >= tasterUntil) taster = null; };
  return {
    state,
    /** Any player action (a drag, a tap, a refused drop) silences the hint and restarts the 2-second wait. */
    action(now: number): TalkState { action(now); return state(); },
    /** A step succeeded: perhaps a word from the commis (every third step), else perhaps from the taster. */
    success(snapshot: KitchenSnapshot, now: number): TalkState {
      expire(now); action(now); successes++;
      if (snapshot.cookingRemainingMs > 0) return state(); // the cooking start has its own line, said by tick
      if (successes % 3 === 0) {
        const progress = snapshot.totalSteps ? snapshot.doneSteps / snapshot.totalSteps : 0;
        const pool = progress >= .75 ? CHEERS.late : progress >= .35 ? CHEERS.middle : CHEERS.early;
        say(pool[cheerIndex++ % pool.length], 'cheer', now);
      } else if (withTaster && successes % 5 === 2 && !commis) {
        taster = {text: REACTIONS[reactionIndex++ % REACTIONS.length], kind: 'react', key: ++key}; tasterUntil = now + LINE_MS;
      }
      return state();
    },
    /** A new recipe, Replay or the end of a recipe: everybody is quiet again. */
    reset(now: number): TalkState {
      lastAction = now; successes = 0; mood = 'idle'; cooking = false; commis = null; taster = null; return state();
    },
    tick(snapshot: KitchenSnapshot, now: number): TalkState {
      if (lastAction === null) lastAction = now;
      expire(now);
      if (snapshot.phase !== 'playing' || snapshot.pauses.length) { lastAction = now; commis = null; taster = null; mood = 'idle'; cooking = false; return state(); }
      const next = commisMood(snapshot);
      if (next !== mood) { mood = next; if (mood === 'teary' && commis?.kind !== 'hint') say(SHALLOT, 'cheer', now); }
      // While something cooks, there is nothing to do: no hint, and the wait starts again afterwards.
      if (snapshot.cookingRemainingMs > 0) {
        if (!cooking) { cooking = true; say(snapshot.cookingHeater === 'oven' ? OVEN : PAN, 'cheer', now); }
        lastAction = now; if (commis?.kind === 'hint') commis = null; return state();
      }
      cooking = false;
      if (now - lastAction > HINT_DELAY_MS) {
        const step = snapshot.current >= 0 ? snapshot.steps[snapshot.current] : snapshot.steps.find(s => s.next);
        if (step) {
          const text = `${step.hint} !`;
          if (commis?.kind !== 'hint' || commis.text !== text) { say(text, 'hint', now); hintAt = now; }
          else if (now - hintAt >= HINT_REPEAT_MS) { commis = {...commis, key: ++key}; hintAt = now; }
        }
      }
      return state();
    },
  };
}
export type KitchenTalk = ReturnType<typeof createKitchenTalk>;
