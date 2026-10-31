// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {createGame, encodeGame} from '../src/simulation';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {SAVE_KEY} from '../src/persistence/storage';
import {mountSavePanel} from '../src/display/SavePanel';
import type {GameState} from '../src/state/types';

const disposers: (() => void)[] = [];
const el = (id: string) => document.getElementById(id)!;
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); el('portrait-notice').style.display = 'none'; });
afterEach(() => { disposers.splice(0).forEach(f => f()); vi.useRealTimers(); vi.restoreAllMocks(); });
function setup(s: GameState) {
  const values = new Map<string, string>([[SAVE_KEY, encodeGame(s)]]);
  const c = new GameController({scope: 'laboratory', getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const dispose = mountSavePanel(c, () => {}, {test: true, preferenceKey: 'test-recipe-announcement'}); disposers.push(() => { dispose(); c.dispose(); }); return c;
}
const items = () => [...el('level-up-unlocks').querySelectorAll('li')].map(li => li.textContent!);

describe('level-up recipe announcement', () => {
  it('announces the unknown recipe made purchasable, without any condition', async () => {
    const c = setup({...createGame(0), progression: {totalXp: cumulativeLevelXp(10), rewardedThroughLevel: 10}}); c.grantLaboratoryXp(500); c.grantLaboratoryXp(500); await vi.advanceTimersByTimeAsync(300);
    // The five level-11 Epics (with Dinenette) unlock together; Dinono stays at level 1.
    expect(el('level-up-title').textContent).toBe('Niveau 11 atteint !');
    expect(items()).toContain('Recettes en boutique · 5');
    for (const hidden of ['Affection', 'Paille + Feu', 'paille + feu', '%', 'Parents']) expect(el('level-up-unlocks').textContent).not.toContain(hidden);
  });
  it('omits recipes already known by discovery', async () => {
    const s = createGame(0); s.discovered.push('magicien', 'dadi', 'maxou', 'orange', 'dinenette');
    const c = setup({...s, progression: {totalXp: cumulativeLevelXp(10), rewardedThroughLevel: 10}}); c.grantLaboratoryXp(500); c.grantLaboratoryXp(500); await vi.advanceTimersByTimeAsync(300);
    expect(items().some(t => t.includes('en boutique · ') && t.startsWith('Recette'))).toBe(false);
  });
});
