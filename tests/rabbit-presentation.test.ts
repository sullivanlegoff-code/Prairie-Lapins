// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {decorateRabbitText, rabbitTheme} from '../src/display/rabbitPresentation';
import {ARDENT_FRAMES, ardentFrame} from '../src/display/ardentFlames';
import {setCurrencyText} from '../src/display/currency';

// 26 October 2026: element medallions instead of type words, rarity outlines, element tints, Ardent's flames, the heart icon.
describe('rabbit presentation', () => {
  it('shows element medallions with their names kept for screen readers, and a rarity label', () => {
    const host = document.createElement('p'); host.textContent = 'métal + feu · Rare'; decorateRabbitText(host);
    const icons = [...host.querySelectorAll('.element-icon')];
    expect(icons.map(i => i.getAttribute('title'))).toEqual(['métal', 'feu']);
    expect(icons.every(i => i.querySelector('img[aria-hidden="true"]') && i.querySelector('.sr-only'))).toBe(true);
    expect(host.querySelector('.rarity-label')).toMatchObject({textContent: 'Rare'}); expect(host.querySelector<HTMLElement>('.rarity-label')!.dataset.rarity).toBe('rare');
    expect(host.textContent).toBe('métal + feu · Rare');
  });
  it('leaves prose and names alone', () => {
    const host = document.createElement('p'); host.textContent = 'Lapin très original, uniquement en neige et en branches.'; decorateRabbitText(host);
    expect(host.querySelector('.element-icon')).toBeNull();
  });
  it('themes a card by rarity and by its one or two elements', () => {
    const card = document.createElement('article'); rabbitTheme(card, 'dragon');
    expect(card.dataset).toMatchObject({rarity: 'legendary', elements: 'feu vol'});
    expect(card.style.getPropertyValue('--element-from')).not.toBe(card.style.getPropertyValue('--element-to'));
    const single = document.createElement('article'); rabbitTheme(single, 'paille');
    expect(single.dataset.elements).toBe('paille'); expect(single.style.getPropertyValue('--element-from')).toBe(single.style.getPropertyValue('--element-to'));
  });
  it('shows the painted heart beside an amount of hearts', () => {
    const host = document.createElement('p'); setCurrencyText(host, 'Améliorer · 30 cœurs');
    expect(host.querySelector('.heart-amount img.heart-icon')).not.toBeNull(); expect(host.textContent).toBe('Améliorer · 30 cœurs');
  });
});

// 7 November 2026: five painted frames instead of a glow derived from the sprite.
describe('Ardent’s flames', () => {
  it('goes back and forth through its five painted frames, about seven a second', () => {
    expect(ARDENT_FRAMES.map(f => f.url)).toEqual([1, 2, 3, 4, 5].map(n => `assets/rabbits/ardent/ardent-frame-${n}.png`));
    const seen = Array.from({length: 16}, (_, i) => ardentFrame('rabbit-7', i * 140 + 1));
    expect(new Set(seen).size).toBe(5);
    for (let i = 1; i < seen.length; i++) expect(Math.abs(seen[i] - seen[i - 1])).toBeLessThanOrEqual(1);
  });
  it('has its own phase per rabbit and stays on the first frame with reduced motion', () => {
    const run = (id: string) => Array.from({length: 8}, (_, i) => ardentFrame(id, i * 140)).join();
    expect(new Set(['rabbit-7', 'rabbit-8', 'rabbit-9', 'rabbit-10'].map(run)).size).toBeGreaterThan(1);
    expect(ardentFrame('rabbit-7', 1000, true)).toBe(0); expect(ardentFrame('rabbit-7', 9000, true)).toBe(0);
  });
});
