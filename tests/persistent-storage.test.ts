// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import {inIosSafariTab, requestPersistentStorage} from '../src/persistence/persistentStorage';
import {AccountReminder} from '../src/ui/accountReminder';
import {PreferenceStore} from '../src/ui/preferences';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });
it('asks the browser to keep the save once, and never fails (plan 1.6)', async () => {
  const persist = vi.fn(async () => true), persisted = vi.fn(async () => false);
  expect(await requestPersistentStorage({storage: {persist, persisted}})).toBe(true); expect(persist).toHaveBeenCalledOnce();
  const already = vi.fn(async () => true);
  expect(await requestPersistentStorage({storage: {persist: already, persisted: async () => true}})).toBe(true); expect(already).not.toHaveBeenCalled();
  expect(await requestPersistentStorage({storage: {persist: async () => false}})).toBe(false);
  expect(await requestPersistentStorage({})).toBe(false);
  expect(await requestPersistentStorage({storage: {persist: async () => { throw new Error('refused'); }}})).toBe(false);
});
it('tells a Safari tab on iPhone from the home screen', () => {
  expect(inIosSafariTab({standalone: false})).toBe(true);
  expect(inIosSafariTab({standalone: true})).toBe(false);
  expect(inIosSafariTab({})).toBe(false); // Not iOS Safari.
});
it('the account reminder suggests the home screen only in a Safari tab on iPhone', () => {
  const make = () => { document.body.replaceChildren(); new AccountReminder(new PreferenceStore('test-persist'), () => true, () => false, () => {}); return document.querySelector('.account-reminder')!; };
  vi.stubGlobal('navigator', {...navigator, standalone: false});
  expect(make().textContent).toContain('ajouter le jeu à l\'écran d\'accueil');
  vi.stubGlobal('navigator', {...navigator, standalone: true});
  expect(make().querySelector('#account-reminder-home')).toBeNull();
});
