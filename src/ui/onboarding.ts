import type {GameState} from '../state/types';
import type {Preferences} from './preferences';
import {firstNurseryBaby, nurseryBuilding} from '../simulation/nursery';

import {guidedStep} from './guidance';

export function onboardingTask(s: GameState, p: Preferences, now: number) {
  const step = guidedStep(s, p, now);
  const farm = s.buildings.find(b => b.kind === 'farm' && b.order);
  const nest = s.buildings.find(b => b.kind === 'nest');
  const baby = firstNurseryBaby(nurseryBuilding(s));
  const waiting = step.id === 'harvest' && !!farm?.order && farm.order.endsAt > now || step.id === 'transfer' && !!nest?.breeding && nest.breeding.endsAt > now || step.id === 'welcomeBirth' && !!baby && baby.readyAt > now;
  const scene = ({snowShop:1, rabbitShop:8, snowReward:9, farmShop:2, production:3, harvest:3, paille:4, neige:10, breed:5, transfer:11, welcomeBirth:6, free:7} as Record<string, number>)[step.id] ?? 1;
  const name = s.rabbits.find(r => r.species === 'paille')?.name || 'Paille';
  const stage = step.id === 'harvest' ? 'order' : step.id === 'transfer' ? 'breeding' : 'growth';
  const label = waiting ? (s.initiation?.closed.includes(stage) || s.initiation?.used.includes(stage) ? 'Attendre ou utiliser les cœurs' : 'Avancer le temps · gratuit') : ({snowShop:`Trouver un amoureux pour ${name}`, rabbitShop:'Inviter Neige', snowReward:'Récupérer', farmShop:`Aider ${name}`, production:'Lancer la ferme', harvest:'Récolter', paille:`Nourrir ${name}`, neige:'Nourrir Neige', breed:'Aller au nid', transfer:'Rejoindre la nurserie', welcomeBirth:'Accueillir', free:'Voir les missions'} as Record<string,string>)[step.id] ?? `Aider ${name}`;
  return {step, scene, key: step.id + (waiting ? '-waiting' : ''), label, waiting};
}
export function onboardingScene(s: GameState, p: Preferences, now = s.lastSimulatedAt): number | null {
  return s.startCourse === 'paille-solo' && p.tutorial && !p.tutorialDone ? onboardingTask(s,p,now).scene : null;
}

export type PailleGesture = 'hop' | 'flip' | 'dizzy';
export interface PailleAnimation { gesture?: PailleGesture; hearts?: boolean; neigeReply?: boolean }

/** Explicit scene/line positions beside the script: independent of the chosen name. */
export const pailleAnimationTable: Readonly<Record<number, Readonly<Record<number, Readonly<PailleAnimation>>>>> = {
  1: {0: {gesture: 'hop'}, 1: {gesture: 'hop'}, 3: {gesture: 'flip'}, 4: {hearts: true}},
  2: {0: {gesture: 'dizzy'}},
  3: {0: {hearts: true}},
  4: {0: {gesture: 'hop'}},
  5: {0: {gesture: 'flip', hearts: true, neigeReply: true}},
  6: {1: {gesture: 'hop'}},
  7: {0: {gesture: 'flip', hearts: true}},
  10: {0: {hearts: true}},
};

/** Unlisted lines have only the quiet idle animation. */
export function pailleAnimation(scene: number, line: number): Readonly<PailleAnimation> {
  return pailleAnimationTable[scene]?.[line] ?? {};
}

export function pailleLines(scene: number, name: string): string[] {
  switch (scene) {
    case 1: return ['Bienvenue sur l’île des lapins ! Cette île a été construite pour une célébration très spéciale !', 'Ici, tu vas pouvoir découvrir le merveilleux monde des lapins !', 'D’abord, donne-moi un prénom !', `${name}, c’est un très joli prénom, il me va très bien ! Bah ouais !`, 'Je m’ennuie ici, je veux que tu me trouves un amoureux !'];
    case 2: return ['J’ai une folle envie d’herbe à grignoter ! Tu me fais tourner la tête ! Bah ouais !'];
    case 3: return ['La ferme permet de nous nourrir ! J’aime manger autant que faire des bisous, c’est très important pour nous autres lapins !'];
    case 4: return ['Une fois bien nourris, on peut essayer d’obtenir des lapins !'];
    case 5: return ['Viens, on fait nos bails ! Bah ouais !'];
    case 6: return ['Notre lapereau grandit dans la nurserie ! On découvrira son espèce quand il sera grand.', 'Quand il est prêt, accueille-le dans un habitat. Bah ouais !'];
    case 8: return ['Un jardin tout blanc… Maintenant, invite quelqu’un à y vivre !'];
    case 9: return ['Les missions te récompensent ! Récupère ton cadeau.'];
    case 10: return ['Plus tu nous nourris, plus on t’aime… et plus on rapporte de pièces !'];
    case 11: return ['On attend notre bébé ! Je te fais gagner du temps.'];
    case 7: return ['Je suis né d’un amour très fort entre deux êtres. Ce village t’appartient maintenant, prends-en le plus grand soin ! <3', 'Tes missions t’attendent, il reste des récompenses !'];
    default: return [];
  }
}
