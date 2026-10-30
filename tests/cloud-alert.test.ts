// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {cloudAlert, moreAdvanced, mountAccountPanel} from '../src/cloud/accountPanel';
import {createGame} from '../src/simulation';
import {fixture, remote} from './cloud-fixtures';

vi.mock('@supabase/supabase-js', () => { throw new Error('Le SDK ne doit pas être importé dans ce test'); });
const disposals: (() => void)[] = [];
afterEach(() => { disposals.splice(0).forEach(f => f()); document.body.replaceChildren(); });
const tick = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
const view = (status: Parameters<typeof cloudAlert>[0]['status']) => ({status, syncedAt: null, remote: null});

it('signale dans la prairie seulement ce qui demande le joueur', () => {
  expect(cloudAlert(view('saved'), true)).toBeNull();
  expect(cloudAlert(view('offline'), true)).toBeNull();
  expect(cloudAlert(view('disconnected'), false)).toBeNull();
  expect(cloudAlert(view('conflict'), true)).toMatch(/choix à faire/);
  expect(cloudAlert(view('error'), true)).toMatch(/bloquée/);
  expect(cloudAlert(view('session'), false)).toMatch(/Reconnecte-toi/);
});
it('désigne la partie la plus avancée, d’abord par l’expérience', () => {
  const a = createGame(0), b = createGame(0);
  expect(moreAdvanced(a, b)).toBeNull(); expect(moreAdvanced(a, null)).toBeNull();
  b.progression.totalXp += 10; expect(moreAdvanced(a, b)).toBe('remote');
  a.progression.totalXp = b.progression.totalXp; a.rabbits.push(structuredClone(a.rabbits[0])); expect(moreAdvanced(a, b)).toBe('local');
});
it('affiche l’alerte, la date en ligne et prévient avant de perdre des progrès', async () => {
  const seed = createGame(1_790_000_000_000); seed.progression.totalXp = 40;
  const f = fixture('normal', undefined, undefined, seed); disposals.push(() => f.dispose());
  f.gateway.remote = remote(createGame(1_790_000_000_000));
  const alert = document.createElement('button'); alert.id = 'cloud-warning'; alert.hidden = true; document.body.append(alert);
  const user = {id: 'player-a', email: 'lapin@example.invalid'};
  const auth = {onAuthStateChange: vi.fn(() => ({data: {subscription: {unsubscribe: vi.fn()}}})),
    getSession: vi.fn(async () => ({data: {session: {user}}, error: null})), signOut: vi.fn(async () => ({error: null}))};
  const root = document.createElement('section'); document.body.append(root);
  disposals.push(await mountAccountPanel(root, f.controller, f.storage, {config: {url: 'https://exemple.supabase.co', key: 'sb_publishable_X', ref: 'exemple'},
    policy: {onlineServicesAllowed: true}, onReplacement: f.replacement, create: async () => ({auth}) as unknown as SupabaseClient, gateway: f.gateway}));
  await tick();
  expect(alert.hidden).toBe(false); expect(alert.textContent).toMatch(/choix à faire/);
  expect(root.textContent).toMatch(/envoyée le/);
  expect(root.textContent).toMatch(/plus avancée est celle de cet appareil/);
  Array.from(root.querySelectorAll('button')).find(b => b.textContent === 'Récupérer ma partie en ligne')!.click();
  expect(root.textContent).toMatch(/tu perdrais des progrès/);
});
