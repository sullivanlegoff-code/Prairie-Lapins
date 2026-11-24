// @vitest-environment happy-dom
import {afterEach, beforeEach, expect, it} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {mountSavePanel} from '../src/display/SavePanel';
import {PREVIOUS_SAVE_KEY, SAVE_KEY, UNREADABLE_SAVE_KEY} from '../src/persistence/storage';
import {createGame, encodeGame} from '../src/simulation';

const disposers: (() => void)[] = [];
const el = (id: string) => document.getElementById(id)!;
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); el('portrait-notice').style.display = 'none';
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { disposers.splice(0).forEach(f => f()); });
function mount(values: Map<string, string>) {
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const dispose = mountSavePanel(controller, () => {}, {test: false, preferenceKey: 'test-previous-save'}); disposers.push(() => { dispose(); controller.dispose(); });
  return controller;
}
it('an unreadable save offers the copy of the last good start, restored after the usual confirmation (plan 1.7)', () => {
  const good = encodeGame(createGame(0)), values = new Map([[SAVE_KEY, good]]);
  mount(values); expect(values.get(PREVIOUS_SAVE_KEY)).toBe(good);
  expect((el('restore-previous') as HTMLButtonElement).hidden).toBe(true); // A readable save: nothing to offer.
  disposers.splice(0).forEach(f => f());
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); el('portrait-notice').style.display = 'none';
  values.set(SAVE_KEY, '{"abîmée"');
  const controller = mount(values), button = el('restore-previous') as HTMLButtonElement;
  expect(controller.getSnapshot().status).toBe('invalid-save'); expect(button.hidden).toBe(false);
  expect(button.textContent).toBe('Reprendre la copie de secours');
  button.click();
  expect((el('import-dialog') as HTMLDialogElement).open).toBe(true); expect(el('import-summary').textContent).toContain('lapin');
  el('confirm-import').click();
  expect(controller.getSnapshot().status).toBe('saved'); expect(el('save-notice').textContent).toBe('Partie importée et enregistrée.');
  expect(values.get(UNREADABLE_SAVE_KEY)).toBe('{"abîmée"'); expect(button.hidden).toBe(true);
});
