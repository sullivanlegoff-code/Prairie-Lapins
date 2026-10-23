// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {ERROR_MESSAGES, mountSavePanel} from '../src/display/SavePanel';
import {SAVE_KEY} from '../src/persistence/storage';
import {createGame, encodeGame} from '../src/simulation';

const disposers: (() => void)[] = [];
const el = (id: string) => document.getElementById(id)!;
beforeEach(() => { document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); el('portrait-notice').style.display = 'none'; });
afterEach(() => { disposers.splice(0).forEach(f => f()); vi.restoreAllMocks(); });
const oldSave = (version = 15) => { const raw = JSON.parse(encodeGame(createGame(0))); raw.version = version; return JSON.stringify(raw); };
function mount(initial: string | null) {
  const values = new Map<string, string>(initial === null ? [] : [[SAVE_KEY, initial]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const dispose = mountSavePanel(controller, () => {}, {test: false, preferenceKey: 'test-catalog-reset'}); disposers.push(() => { dispose(); controller.dispose(); });
  return {controller, values};
}

describe('what the player is told about the new catalogue', () => {
  it('shows a clear, dismissible reset message once, naming the removed species, when an older game is replaced', () => {
    mount(oldSave());
    const notice = document.getElementById('catalog-reset-notice')!;
    expect(notice.getAttribute('role')).toBe('status');
    for (const word of ['version de développement', 'Terre', 'Mottelin', 'Géant', 'Brumelin', 'nouvelle partie']) expect(notice.textContent, word).toContain(word);
    expect(document.querySelectorAll('#catalog-reset-notice')).toHaveLength(1);
    notice.querySelector('button')!.click(); expect(document.getElementById('catalog-reset-notice')).toBeNull();
  });
  it('says nothing on a normal start or on a reload of the new game', () => {
    const {values} = mount(null); expect(document.getElementById('catalog-reset-notice')).toBeNull();
    document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); el('portrait-notice').style.display = 'none';
    mount(values.get(SAVE_KEY)!); expect(document.getElementById('catalog-reset-notice')).toBeNull();
  });
  it('explains an incompatible import in its own words and never calls it a corrupt file', () => {
    expect(ERROR_MESSAGES.INCOMPATIBLE_CATALOG).toMatch(/n’est plus compatible/); expect(ERROR_MESSAGES.INCOMPATIBLE_CATALOG).toMatch(/n’a pas été modifiée/);
    expect(ERROR_MESSAGES.INCOMPATIBLE_CATALOG).not.toBe(ERROR_MESSAGES.INVALID_STATE);
  });
  it('refuses an incompatible file picked for import: the explanation is shown, no confirmation opens, the game and its save are untouched', async () => {
    const {controller, values} = mount(null); controller.perform({type: 'feed', id: 'rabbit-2'});
    const before = controller.getSnapshot(), stored = values.get(SAVE_KEY);
    const input = el('import-file') as HTMLInputElement, file = new File([oldSave(14)], 'old.json', {type: 'application/json'});
    Object.defineProperty(input, 'files', {configurable: true, value: [file]});
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(el('save-notice').textContent).toBe(ERROR_MESSAGES.INCOMPATIBLE_CATALOG));
    expect((el('import-dialog') as HTMLDialogElement).open).toBe(false);
    expect(controller.getSnapshot()).toEqual(before); expect(values.get(SAVE_KEY)).toBe(stored);
  });
});
