// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {developmentEnvironment, replaceTestState} from '../src/dev/tools';
import {GameController} from '../src/application/GameController';
import {createGame, encodeGame, decodeGame} from '../src/simulation';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {PreferenceStore} from '../src/ui/preferences';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
it('uses collapsible laboratory sections, exact resources, all species, affection, buildings, tutorial and endgame with isolated persistence', () => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  vi.spyOn(Date, 'now').mockReturnValue(100_000_000); window.confirm = vi.fn(() => true);
  const normal = encodeGame(createGame(Date.now())), data = new Map([[SAVE_KEY, normal]]);
  const dev = developmentEnvironment({getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }});
  const controller = new GameController(dev.storage, dev.clock), prefs = new PreferenceStore(dev.preferenceKey);
  const dispose = dev.mount(controller, fresh => { if (fresh) prefs.restartGuidance(); });
  const click = (id: string) => document.getElementById(`dev-${id}`)!.click();
  const set = (id: string, value: string) => { (document.getElementById(`dev-${id}`) as HTMLInputElement).value = value; };
  const status = () => document.getElementById('dev-status')!.textContent;
  try {
    const host = document.getElementById('devtools')!;
    expect(host.hidden).toBe(false); expect(host.querySelectorAll(':scope > details').length).toBeGreaterThanOrEqual(10);
    for (const id of ['resources', 'shop', 'affection', 'buildings', 'missions']) {
      const section = document.getElementById(`dev-section-${id}`) as HTMLDetailsElement;
      expect(section.querySelector('summary')).not.toBeNull(); section.open = true;
    }
    expect(host.querySelectorAll('[id^="dev-add-"]')).toHaveLength(35); // 37 species and the existing manual control.
    set('resource-pattes', '42'); click('set-pattes'); expect(controller.getSnapshot().state!.pattes).toBe(42); expect(status()).toContain('exactement');
    const before = controller.getSnapshot().state; set('resource-pattes', '-1'); click('set-pattes'); expect(controller.getSnapshot().state).toEqual(before); expect(status()).toContain('entier');
    set('level', '30'); click('set-level'); expect(controller.getSnapshot().state!.progression).toEqual({totalXp: cumulativeLevelXp(30), rewardedThroughLevel: 30});
    set('shop-affection', '15'); click('all-rabbits'); expect(controller.getSnapshot().state!.discovered).toHaveLength(34); expect(status()).toContain('sans statue'); expect(status()).toContain('universel niveau 3'); expect(status()).toContain('extension');
    set('affection-rabbit', 'rabbit-2'); set('affection-value', '20'); click('set-affection'); expect(controller.getSnapshot().state!.rabbits[0].affection).toBe(20);
    set('build-kind', 'agency'); click('build'); expect(controller.getSnapshot().state!.buildings.some(b => b.kind === 'agency')).toBe(true);
    click('all-decorations'); expect(controller.getSnapshot().state!.decorations.some(d => d.catalogId === 'robot-statue')).toBe(true);
    prefs.set({tutorial: false, tutorialDone: true}); click('tutorial'); expect(prefs.value).toMatchObject({tutorial: true, tutorialDone: false});
    click('scenario-completeGame'); expect(controller.getSnapshot().state!.rabbits).toHaveLength(34);
    click('finish-timers'); expect(controller.getSnapshot().state!.travel!.trips.every(t => t.endsAt <= Date.now())).toBe(true); expect(status()).toContain('Rien n’est encaissé');
    expect(decodeGame(encodeGame(controller.getSnapshot().state!))).toEqual({ok: true, state: controller.getSnapshot().state});
    click('scenario-freshStart'); expect(prefs.value.tutorial).toBe(true); expect(controller.getSnapshot().state!.rabbits).toHaveLength(1);
    expect(data.get(SAVE_KEY)).toBe(normal);
  } finally { dispose(); controller.dispose(); }
  expect(document.getElementById('devtools')!.hidden).toBe(true);
});

it('rejects a normal controller and failed writes without replacing the game', () => {
  const data = new Map<string, string>(); let fail = false;
  const base = {getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (fail) throw Error('quota'); data.set(key, value); }};
  const normal = new GameController(base, () => 0), dev = developmentEnvironment(base), lab = new GameController(dev.storage, () => 0);
  try {
    expect(() => dev.mount(normal)).toThrow(/isolated/);
    expect(replaceTestState(normal, createGame(0))).toMatchObject({ok: false, reason: 'NOT_TEST_SESSION'});
    const before = lab.getSnapshot().state; fail = true; const next = createGame(0); next.hearts = 999;
    expect(replaceTestState(lab, next).ok).toBe(false); expect(lab.getSnapshot().state).toEqual(before);
  } finally { normal.dispose(); lab.dispose(); }
});
