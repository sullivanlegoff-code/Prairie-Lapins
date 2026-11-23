import {setCurrencyText} from '../display/currency';
import {decorateRabbitText} from '../display/rabbitPresentation';
import type {Reward} from '../config/missions';

/** Small helpers of the game's menus, shared by GameUI.ts and the menus moved out of it (plan 6.4). */
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); setCurrencyText(element, text); decorateRabbitText(element); element.className = className; return element;
}
export const rewardLabel = (r: Reward) => r.resource==='none' ? 'Objectif de collection accompli' : `${r.amount} ${{pattes: 'pattes', grass: 'nourriture', hearts: r.amount === 1 ? 'cœur' : 'cœurs'}[r.resource]}`;
