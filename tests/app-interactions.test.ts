// @vitest-environment happy-dom
import {expect, it} from 'vitest';
import {bindAppInteractions} from '../src/display/appInteractions';
import html from '../index.html?raw';

it('blocks image and canvas menus/drags, preserves form menus and gestures, and cleans up', () => {
  document.body.innerHTML = '<img><canvas></canvas><textarea></textarea><button>Action</button>';
  const dispose = bindAppInteractions(document);
  const dispatch = (selector: string, type: string) => document.querySelector(selector)!.dispatchEvent(new Event(type, {bubbles:true, cancelable:true}));
  for (const selector of ['img', 'canvas']) {
    expect(dispatch(selector, 'contextmenu')).toBe(false);
    expect(dispatch(selector, 'dragstart')).toBe(false);
    for (const type of ['touchmove', 'pointermove', 'wheel']) expect(dispatch(selector, type)).toBe(true);
  }
  expect(dispatch('textarea', 'contextmenu')).toBe(true);
  expect(dispatch('button', 'touchmove')).toBe(true);
  dispose();
  expect(dispatch('img', 'contextmenu')).toBe(true);
  expect(dispatch('canvas', 'dragstart')).toBe(true);
});

it('preserves the three illustrated navigation labels and gives a visual press without consuming or inventing clicks', () => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  const dispose = bindAppInteractions(document);
  const pointer = (target: Element, type: string, pointerId = 7) => target.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, pointerId, button: 0, pointerType: 'touch'}));
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#meadow-actions .meadow-nav')];
  expect(buttons.map(b => b.id)).toEqual(['open-shop', 'open-arrange', 'open-collection']);
  expect(buttons.map(b => b.textContent)).toEqual(['Boutique', 'Aménager', 'Collection']);
  for (const button of buttons) {
    const image = button.querySelector('img')!;
    expect(image.alt).toBe(''); expect(image.getAttribute('aria-hidden')).toBe('true');
    let clicks = 0; button.addEventListener('click', () => clicks++);
    expect(pointer(image, 'pointerdown')).toBe(true);
    expect(button.classList.contains('is-pressed')).toBe(true);
    pointer(document.body, 'pointerup', 8);
    expect(button.classList.contains('is-pressed')).toBe(true);
    pointer(document.body, 'pointerup');
    expect(button.classList.contains('is-pressed')).toBe(false);
    expect(clicks).toBe(0); image.click(); expect(clicks).toBe(1);
    button.disabled = true; pointer(button, 'pointerdown');
    expect(button.classList.contains('is-pressed')).toBe(false);
  }
  const missions = document.getElementById('open-missions')!;
  pointer(missions, 'pointerdown'); expect(missions.classList.contains('is-pressed')).toBe(false);
  dispose();
});

it('keeps the HUD utilities accessible and shares press feedback without changing their clicks', () => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  const dispose = bindAppInteractions(document);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#hud nav .meadow-tool')];
  expect(buttons.map(b => [b.id, b.getAttribute('aria-label')])).toEqual([
    ['recenter-view', 'Recentrer la vue'], ['open-photo', 'Mode photo'], ['open-settings', 'Paramètres'],
  ]);
  for (const button of buttons) {
    const glyph = button.querySelector('svg')!;
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    let clicks = 0; button.addEventListener('click', () => clicks++);
    expect(glyph.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerId: 3, button: 0}))).toBe(true);
    expect(button.classList.contains('is-pressed')).toBe(true); expect(clicks).toBe(0);
    button.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, pointerId: 3}));
    expect(button.classList.contains('is-pressed')).toBe(false);
    button.click(); expect(clicks).toBe(1);
  }
  dispose();
});

it('clears a navigation press on cancel, leaving the button, blur and disposal', () => {
  document.body.innerHTML = '<div id="meadow-actions"><button class="meadow-nav"><span>Navigation</span></button></div>';
  const button = document.querySelector('button')!, label = button.querySelector('span')!, dispose = bindAppInteractions(document);
  const pointer = (type: string, relatedTarget: EventTarget | null = null) => button.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, button: 0, relatedTarget}));
  pointer('pointerdown'); pointer('pointerout', label); expect(button.classList.contains('is-pressed')).toBe(true);
  pointer('pointerout', document.body); expect(button.classList.contains('is-pressed')).toBe(false);
  pointer('pointerdown'); pointer('pointercancel'); expect(button.classList.contains('is-pressed')).toBe(false);
  pointer('pointerdown'); window.dispatchEvent(new Event('blur')); expect(button.classList.contains('is-pressed')).toBe(false);
  pointer('pointerdown'); dispose(); expect(button.classList.contains('is-pressed')).toBe(false);
  pointer('pointerdown'); expect(button.classList.contains('is-pressed')).toBe(false);
});
