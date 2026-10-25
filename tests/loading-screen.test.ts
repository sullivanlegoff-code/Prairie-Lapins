// @vitest-environment happy-dom
import {describe, it, expect, beforeEach} from 'vitest';
import html from '../index.html?raw';
import {LoadingTracker, LOADING_STEPS, renderLoading, type LoadingView} from '../src/display/loadingScreen';

function fakeTimers() {
  const pending = new Map<number, {callback: () => void; at: number}>(); let now = 0, next = 1;
  return {api: {set: (callback: () => void, ms: number) => { const id = next++; pending.set(id, {callback, at: now + ms}); return id; }, clear: (id: unknown) => { pending.delete(id as number); }},
    advance(ms: number) { now += ms; for (const [id, t] of [...pending]) if (t.at <= now) { pending.delete(id); t.callback(); } }, count: () => pending.size};
}
beforeEach(() => { document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, ''); });

describe('loading screen', () => {
  it('lists the real start-up steps in order and only offers « Jouer » once every required one is done', () => {
    const timers = fakeTimers(), tracker = new LoadingTracker(LOADING_STEPS, timers.api), views: LoadingView[] = [];
    tracker.subscribe(v => views.push(v));
    expect(views[0].steps.map(s => s.id)).toEqual(['save', 'fonts', 'textures', 'scene', 'music']);
    expect(views[0].steps.filter(s => s.required).map(s => s.id)).toEqual(['save', 'textures', 'scene']);
    tracker.done('save'); tracker.done('fonts'); tracker.progress('textures', .5);
    expect(tracker.view().progress).toBeCloseTo(4 / 8); // weights 1+1+4+1+1 expect(tracker.view().ready).toBe(false);
    tracker.progress('textures', 1); tracker.done('textures'); expect(tracker.view().ready).toBe(false);
    tracker.done('scene'); expect(tracker.view().ready).toBe(true); expect(tracker.view().progress).toBeCloseTo(7 / 8);
    tracker.done('music'); expect(tracker.view().progress).toBe(1);
    for (let i = 1; i < views.length; i++) expect(views[i].progress).toBeGreaterThanOrEqual(views[i - 1].progress);
    expect(timers.count()).toBe(0);
  });
  it('a missing or slow music never blocks entering the game', () => {
    const timers = fakeTimers(), tracker = new LoadingTracker(LOADING_STEPS, timers.api);
    tracker.done('save'); tracker.done('fonts'); tracker.done('textures'); tracker.done('scene');
    expect(tracker.view().ready).toBe(true);
    timers.advance(12_000);
    const view = tracker.view(); expect(view.ready).toBe(true); expect(view.failed).toBe(false);
    expect(view.steps.find(s => s.id === 'music')!.state).toBe('warning'); expect(view.message).toMatch(/Musique indisponible/);
    const other = new LoadingTracker(LOADING_STEPS, fakeTimers().api);
    other.fail('music', 'Musique indisponible : le jeu reste jouable sans elle.'); other.done('save'); other.done('textures'); other.done('scene');
    expect(other.view().ready).toBe(true);
  });
  it('a failed required step shows a clear message and « Réessayer », never « Jouer »', () => {
    const timers = fakeTimers(), tracker = new LoadingTracker(LOADING_STEPS, timers.api), root = document.getElementById('loading-screen')!;
    tracker.subscribe(v => renderLoading(root, v));
    tracker.done('save'); tracker.fail('textures', 'Une image du jeu n’a pas pu être chargée (farm).'); tracker.done('scene');
    expect(tracker.view()).toMatchObject({ready: false, failed: true});
    expect((document.getElementById('loading-play') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('loading-play')!.hidden).toBe(true);
    expect(document.getElementById('loading-retry')!.hidden).toBe(false);
    expect(document.getElementById('loading-message')!.textContent).toMatch(/image du jeu.*réessaie/);

  });
  it('keeps slow steps pending, offers retry and accepts late success with fake timers', () => {
    const timers = fakeTimers(), tracker = new LoadingTracker(LOADING_STEPS, timers.api), root = document.getElementById('loading-screen')!;
    tracker.subscribe(v => renderLoading(root, v));
    tracker.done('save'); tracker.progress('textures', .5); timers.advance(45_000);
    expect(tracker.view()).toMatchObject({ready: false, failed: false});
    expect(tracker.view().steps.filter(s => s.state === 'slow').map(s => s.id)).toEqual(['textures', 'scene']);
    expect(document.getElementById('loading-message')!.textContent).toContain('Connexion lente, le chargement continue…');
    expect(document.getElementById('loading-retry')!.hidden).toBe(false);
    expect(document.getElementById('loading-play')!.hidden).toBe(true);
    tracker.progress('textures', .75);
    expect(tracker.view().steps.find(s => s.id === 'textures')!.fraction).toBe(.75);
    timers.advance(90_000); tracker.done('textures'); tracker.done('scene');
    expect(tracker.view()).toMatchObject({ready: true, failed: false});
    expect(document.getElementById('loading-retry')!.hidden).toBe(true);
    expect(document.getElementById('loading-play')!.hidden).toBe(false);
    expect((document.getElementById('loading-play') as HTMLButtonElement).disabled).toBe(false);
    expect(tracker.view().message).not.toContain('Connexion lente');
    expect(timers.count()).toBe(0);
  });
  it('reports a real error after timeout and does not erase it on scene creation', () => {
    const timers = fakeTimers(), tracker = new LoadingTracker(LOADING_STEPS, timers.api);
    tracker.done('save'); timers.advance(45_000);
    tracker.fail('textures', 'Image introuvable.'); tracker.done('textures'); tracker.done('scene');
    expect(tracker.view()).toMatchObject({ready: false, failed: true});
    expect(tracker.view().message).toContain('Image introuvable.');
  });
  it('an unreadable save is reported but does not block: recovery happens in the game', () => {
    const tracker = new LoadingTracker(LOADING_STEPS, fakeTimers().api);
    tracker.warn('save', 'Sauvegarde illisible : la récupération s’ouvrira après « Jouer ».'); tracker.done('textures'); tracker.done('scene');
    expect(tracker.view().ready).toBe(true); expect(tracker.view().message).toMatch(/Sauvegarde illisible/);
  });
  it('renders an accessible progress bar, the steps and the button state', () => {
    const root = document.getElementById('loading-screen')!, tracker = new LoadingTracker(LOADING_STEPS, fakeTimers().api);
    tracker.subscribe(v => renderLoading(root, v));
    expect(root.getAttribute('role')).toBe('dialog'); expect(root.dataset.state).toBe('loading');
    tracker.done('save'); tracker.done('textures'); tracker.done('scene');
    expect(root.dataset.state).toBe('ready'); expect((document.getElementById('loading-play') as HTMLButtonElement).disabled).toBe(false);
    expect(root.querySelector('.loading-bar')!.getAttribute('aria-valuenow')).toBe('75');
    expect([...root.querySelectorAll('#loading-steps li')].map(li => (li as HTMLElement).dataset.state)).toEqual(['done', 'pending', 'done', 'done', 'pending']);
  });
});
