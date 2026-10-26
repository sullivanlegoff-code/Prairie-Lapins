import Phaser from 'phaser';
import {MeadowScene} from './display/MeadowScene';
import {GameController} from './application/GameController';
import {bindLifecycle} from './application/lifecycle';
import {browserStorage} from './persistence/browserStorage';
import {browserLifecycle} from './display/browserLifecycle';
import {mountSavePanel} from './display/SavePanel';
import {GameUI} from './ui/GameUI';
import {PreferenceStore} from './ui/preferences';
import {BUILD_REVISION, RELEASE_LABEL} from './config/release';
import {DECORATIONS_PREVIEW_BUILD, LABORATORY_BUILD, sessionPolicy} from './config/runtime';
import './display/styles.css';
import './display/stone-buttons.css';
import './display/meadow-navigation.css';
import './display/breeding.css';
import './display/onboarding.css';
import './display/menus.css';
import {bindAppInteractions} from './display/appInteractions';
import {AudioEngine} from './audio/audioEngine';
import {mountSoundSettings, channelSettings} from './ui/soundSettings';
import {MusicPlayer} from './audio/musicPlayer';
import {MUSIC_TRACKS} from './config/music';
import {LoadingTracker, renderLoading} from './display/loadingScreen';

async function boot(): Promise<() => void> {
  // Loading screen first: the game receives no interaction until « Jouer ».
  const loadingRoot = document.getElementById('loading-screen')!, app = document.getElementById('app')!;
  app.inert = true;
  const loading = new LoadingTracker(), unrender = loading.subscribe(view => renderLoading(loadingRoot, view));
  const disposeInteractions = bindAppInteractions(document);
  document.getElementById('game-version')!.textContent = `Version : ${RELEASE_LABEL} · build ${BUILD_REVISION.slice(0, 7)}`;
  const base = browserStorage();
  let storage = base, clock = Date.now, preferenceKey = 'prairie-lapins.ui.v1';
  let mountDev: ((controller: GameController) => () => void) | undefined;
  /** Laboratory: after a scenario or a tool replaces the test game, frame the new island. */
  let recenterAfterLab: (() => void) | undefined;
  const testMode = DECORATIONS_PREVIEW_BUILD || LABORATORY_BUILD || (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1');
  const policy = sessionPolicy(testMode);
  const environmentLink = document.getElementById('environment-link') as HTMLAnchorElement;
  environmentLink.href = import.meta.env.BASE_URL + (DECORATIONS_PREVIEW_BUILD ? '../../' : LABORATORY_BUILD ? '../' : import.meta.env.DEV ? (testMode ? '' : '?dev=1') : 'dev/');
  environmentLink.textContent = testMode ? 'Retour au jeu normal' : 'Ouvrir le laboratoire de test';
  if (DECORATIONS_PREVIEW_BUILD || LABORATORY_BUILD || (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1')) {
    const {developmentEnvironment} = await import('./dev/tools');
    const dev = developmentEnvironment(base, {decorationPreview: DECORATIONS_PREVIEW_BUILD}); storage = dev.storage; clock = dev.clock; preferenceKey = dev.preferenceKey; mountDev = controller => dev.mount(controller, fresh => { ui?.onReplacement(fresh); recenterAfterLab?.(); });
  }
  // No online adapter exists yet. This policy is the boundary for future clients.
  if (policy.kind === 'laboratory') document.title = 'MODE TEST — Prairie de lapins';
  let fresh = false;
  try { fresh = storage.getItem('prairie-lapins.save.v1') === null; } catch { /* Never impose guidance on an unreadable save. */ }
  const preferences = new PreferenceStore(preferenceKey); preferences.initializeGuidance(fresh);
  // Partie: the save is read synchronously by the controller.
  const controller = new GameController(storage, clock);
  const status = controller.getSnapshot().status;
  // A game started again because the old save predates the catalogue boundary is a new start: it gets the new-game guidance.
  if (controller.getSnapshot().catalogReset) preferences.initializeGuidance(true);
  if (status === 'saved') loading.done('save');
  else loading.warn('save', status === 'invalid-save' || status === 'read-error' ? 'Sauvegarde illisible : la récupération s’ouvrira après « Jouer ».' : 'Sauvegarde non enregistrée : vérifie l’espace du navigateur après « Jouer ».');
  const fonts = (document as Document & {fonts?: FontFaceSet}).fonts;
  if (fonts) void fonts.ready.then(() => loading.done('fonts'), () => loading.warn('fonts', '')); else loading.done('fonts');
  let ui: GameUI | null = null;
  const scene = new MeadowScene(controller, selection => ui?.select(selection), () =>
    !!document.querySelector('#game-panel.shop-fullscreen:not([hidden])') || !!document.querySelector('dialog[open]:not(#paille-dialogue)') || getComputedStyle(document.getElementById('portrait-notice')!).display !== 'none',
    // Images are done only when the scene is created: Phaser reports 100 % before a late file error.
    {progress: fraction => loading.progress('textures', fraction),
      error: file => loading.fail('textures', `Une image du jeu n’a pas pu être chargée (${file}).`),
      ready: () => { loading.done('textures'); loading.done('scene'); }});
  recenterAfterLab = () => scene.recenter();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#fffdf5', transparent: true,
    scale: {mode: Phaser.Scale.RESIZE, width: '100%', height: '100%'}, scene: [scene],
    render: {antialias: true}, input: {activePointers: 3},
  });
  const audio = new AudioEngine();
  for (const channel of ['music', 'effects'] as const) audio.configure(channel, channelSettings(preferences, channel));
  // Musique: only the first track is probed now; nothing sounds before « Jouer ».
  const musicBase = import.meta.env.VITE_SHARED_MUSIC_BASE ?? import.meta.env.BASE_URL;
  const music = new MusicPlayer({tracks: MUSIC_TRACKS.map(file => musicBase + 'assets/audio/music/' + file), engine: audio});
  music.setEnabled(channelSettings(preferences, 'music').enabled);
  void music.prepare().then(ok => ok ? loading.done('music') : loading.warn('music', 'Musique indisponible : le jeu reste jouable sans elle.'));
  const lifecycle = bindLifecycle(controller, browserLifecycle()); lifecycle.start();
  const background = () => { if (document.hidden) music.pauseForBackground(); else music.resumeFromBackground(); };
  const hidden = () => music.pauseForBackground(), shown = () => { if (!document.hidden) music.resumeFromBackground(); };
  // iOS may refuse to resume without a new gesture: the next touch retries, never a second track.
  const retryMusic = () => music.retryAfterGesture();
  document.addEventListener('visibilitychange', background); window.addEventListener('pagehide', hidden); window.addEventListener('pageshow', shown);
  document.addEventListener('pointerdown', retryMusic, {capture: true});
  let entered: (() => void) | null = null;
  // « Jouer »: inside the gesture, unlock audio and start music, then reveal and mount the interface.
  const play = () => {
    if (!loading.view().ready || entered) return;
    music.start();
    loadingRoot.hidden = true; app.inert = false; loading.dispose(); unrender();
    ui = new GameUI(controller, scene, clock, preferences, audio);
    const soundSettings = mountSoundSettings(document, preferences, {onChange: (channel, enabled, volume) => {
      audio.configure(channel, {enabled, volume});
      if (channel === 'music') { music.setEnabled(enabled); music.refreshVolume(); }
    }});
    const disposePanel = mountSavePanel(controller, fresh => ui?.onReplacement(fresh), {test: testMode, decorationPreview: DECORATIONS_PREVIEW_BUILD, preferenceKey});
    const disposeDev = mountDev?.(controller);
    entered = () => { ui?.dispose(); soundSettings.dispose(); disposePanel(); disposeDev?.(); };
  };
  // Restart all loaders safely, both after a real error and while a slow request is pending.
  const retry = () => location.reload();
  const playButton = document.getElementById('loading-play')!, retryButton = document.getElementById('loading-retry')!;
  playButton.addEventListener('click', play); retryButton.addEventListener('click', retry);
  const dismissPortrait = () => document.body.classList.add('portrait-dismissed');
  document.getElementById('continue-portrait')!.addEventListener('click', dismissPortrait);
  return () => {
    entered?.(); loading.dispose(); music.dispose(); audio.dispose(); disposeInteractions(); lifecycle.stop(); controller.dispose(); game.destroy(true);
    document.removeEventListener('visibilitychange', background); window.removeEventListener('pagehide', hidden); window.removeEventListener('pageshow', shown);
    document.removeEventListener('pointerdown', retryMusic, {capture: true}); playButton.removeEventListener('click', play); retryButton.removeEventListener('click', retry);
    document.getElementById('continue-portrait')!.removeEventListener('click', dismissPortrait);
  };
}
const ready = boot().catch(() => {
  const root = document.getElementById('loading-screen')!;
  root.hidden = false; root.dataset.state = 'failed';
  document.getElementById('app')!.inert = true;
  document.getElementById('loading-message')!.textContent = 'Le démarrage a échoué. Réessaie ; si le problème persiste, conserve tes données et contacte le propriétaire.';
  const play = document.getElementById('loading-play') as HTMLButtonElement;
  play.disabled = true; play.hidden = true;
  const retry = document.getElementById('loading-retry')!;
  retry.hidden = false; retry.addEventListener('click', () => location.reload(), {once: true});
  return () => {};
});
if (import.meta.hot) import.meta.hot.dispose(() => { void ready.then(dispose => dispose()); });
