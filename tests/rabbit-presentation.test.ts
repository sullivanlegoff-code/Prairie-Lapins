// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {decorateRabbitText, rabbitTheme} from '../src/display/rabbitPresentation';
import {ardentFlamePose, deriveArdentFlames} from '../src/display/ardentFlames';
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

describe('Ardent’s flames', () => {
  it('keeps only bright warm pixels of the upper silhouette or its edges', () => {
    const w = 60, h = 60, px = new Uint8ClampedArray(w * h * 4);
    const put = (x: number, y: number, c: number[]) => px.set(c, (y * w + x) * 4);
    for (let y = 2; y < 58; y++) for (let x = 2; x < 58; x++) put(x, y, [120, 60, 40, 255]);
    put(30, 3, [255, 150, 20, 255]); put(30, 40, [255, 150, 20, 255]); put(3, 50, [255, 150, 20, 255]); put(30, 4, [90, 90, 200, 255]);
    const out = deriveArdentFlames(px, w, h), alpha = (x: number, y: number) => out[(y * w + x) * 4 + 3];
    expect([alpha(30, 3), alpha(3, 50), alpha(30, 40), alpha(30, 4), alpha(20, 30)]).toEqual([255, 255, 0, 0, 0]);
  });
  it('moves gently and continuously, differently for each rabbit, and stays still with reduced motion', () => {
    const a = ardentFlamePose('rabbit-7', 1000), b = ardentFlamePose('rabbit-7', 1400), c = ardentFlamePose('rabbit-8', 1000);
    expect(a).not.toEqual(b); expect(a).not.toEqual(c);
    for (const p of [a, b, c]) { expect(Math.abs(p.x)).toBeLessThanOrEqual(.5); expect(p.stretch).toBeGreaterThan(1); expect(p.stretch).toBeLessThan(1.05); }
    expect(ardentFlamePose('rabbit-7', 1000, true)).toEqual(ardentFlamePose('rabbit-7', 9000, true));
  });
});
