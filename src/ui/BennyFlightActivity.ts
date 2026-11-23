import {setCurrencyText} from '../display/currency';
import {BENNY_FLIGHT_ART, BENNY_FLAPPY, BENNY_FLIGHT_FRIEND_ART, FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {preferWebp} from '../display/webpTwins';
import {BENNY_FLIGHT_FRIENDS, bennyFlightFriend, bennyFlightFriendLeft, type BennyFlightFriendKind} from '../simulation/bennyFlightFriends';
import {advanceBennyFlight, flapBennyFlight, startBennyFlight, BENNY_FLIGHT_GAME, type BennyFlightGame} from '../simulation/bennyFlightGame';
import type {Rabbit} from '../state/types';
import {pausableClock, pauseWhenLeft, settleCard} from './activityPause';

/**
 * « Le vol de Benny » (src/simulation/bennyFlightGame.ts holds the rules): a full-screen layer like « Les cadeaux du ciel ».
 * A touch anywhere on the sky (or the space bar) gives Benny a wing beat; the painted sky scrolls behind her and the hay
 * columns come from the right. `onFinished` records the game and returns the reward line; `best` reads the record before it.
 * Benny is her flapping sprite (scripts/prepare-benny-flappy.mjs): her wings speed up after a touch and calm down in between.
 * What is drawn glides towards the rules' state (owner, 6 November 2026: « on dirait que Benny dash en avant, ça doit être plus
 * smooth »): the wing beat gives her a new speed at once, but her height and her tilt follow it softly and her wings never skip.
 * Smooth on a phone (owner, 6 November 2026: « le jeu est laggy »): everything moves by `transform` only (no layout, no repaint of
 * the sky), the column pictures are sized once, and the island's Phaser loop sleeps while the game is open.
 * Still laggy (owner, 19 November 2026), measured in Chromium: the top line asked the game for today's rewarded games every frame,
 * and that copied the whole saved game 60 times a second. The line is now written only when its text changes (the score) or
 * when a game starts or ends (today's rewards). The sky and the friends use their light WebP pictures, decoded on opening.
 */
export type BennyFlightSound = 'flap' | 'pass' | 'ten' | 'fall' | 'record' | 'faster';
/** How long Benny is seen falling into the clouds before the end card (owner, 19 November 2026: the end came all at once). */
export const BENNY_FLIGHT_FALL_MS = 700;
export function mountBennyFlightActivity(host: HTMLElement, options: {
  onFinished: (passed: number) => string;
  quotaText?: () => string;
  best?: () => number;
  onExit?: () => void;
  /** A short sound (the game's Bruitages channel; owner, 19 November 2026): a wing beat, a column passed (`pitch` climbs), the
   *  fall, a record or the game speeding up. Silent when absent. */
  sound?: (kind: BennyFlightSound, pitch?: number) => void;
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const time = pausableClock(options.clock ?? (() => performance.now())), clock = time.now, frame = options.frame ?? (step => requestAnimationFrame(step));
  const art = {background: preferWebp(BENNY_FLIGHT_ART.background), column: BENNY_FLIGHT_ART.column};
  const friendUrl = (kind: BennyFlightFriendKind) => preferWebp(BENNY_FLIGHT_FRIEND_ART[kind].url);
  // The friends' pictures are decoded when the game opens, not on their first visit (a hitch, and a picture popping in late).
  const friendPictures: HTMLImageElement[] = [];
  function preloadFriends(): void {
    if (friendPictures.length) return;
    for (const kind of BENNY_FLIGHT_FRIENDS.kinds) { const picture = new Image(); picture.src = friendUrl(kind); void picture.decode?.().catch(() => undefined); friendPictures.push(picture); }
  }
  /** Less motion asked for: the friends fade in and out in their place instead of flying in. */
  const still = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let stillFriends = false;
  const layer = document.createElement('div'); layer.className = 'benny-flight-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Le vol de Benny');
  layer.innerHTML = `<div class="benny-flight-top"><p class="benny-flight-score" aria-live="polite"></p><p class="benny-flight-quota"></p><button type="button" data-benny-flight-exit>Quitter</button></div>
<div class="benny-flight-stage" data-benny-flight-stage>
<div class="benny-flight-sky" aria-hidden="true" style="background-image:url('${preferWebp(art.background)}')"></div>
<span class="benny-flight-friend" aria-hidden="true" hidden></span>
<div class="benny-flight-columns" aria-hidden="true"></div>
<span class="benny-flight-benny" aria-hidden="true" style="background-image:url('${preferWebp(BENNY_FLAPPY.url)}')"></span>
<p class="benny-flight-pop" aria-hidden="true"></p>
</div>
<div class="benny-flight-card" data-benny-flight-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-benny-flight-stage]'), card = $<HTMLElement>('[data-benny-flight-card]'), columns = $<HTMLElement>('.benny-flight-columns');
  const score = $<HTMLElement>('.benny-flight-score'), quota = $<HTMLElement>('.benny-flight-quota'), benny = $<HTMLElement>('.benny-flight-benny'), pop = $<HTMLElement>('.benny-flight-pop'), sky = $<HTMLElement>('.benny-flight-sky'), friend = $<HTMLElement>('.benny-flight-friend');
  const abort = new AbortController(), views = new Map<number, HTMLElement>();
  let game: BennyFlightGame | null = null, running = false, previousBest = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  const sound = (kind: BennyFlightSound, pitch = 1) => { try { options.sound?.(kind, pitch); } catch { /* Sound is optional. */ } };
  // After the touch that ends the game: since when Benny falls, and how fast (stage heights a second).
  let fallingAt: number | null = null, fallSpeed = 0, fallDrawnAt = 0;
  // Stage size in CSS pixels, the sky picture's width at the stage's height, Benny's box; measured on open and on resize.
  let width = 1, height = 1, tile = 1, bennyWidth = 0, bennyHeight = 0, skyAspect = 1;
  const skyPicture = new Image(); skyPicture.onload = () => { skyAspect = skyPicture.naturalWidth / Math.max(1, skyPicture.naturalHeight); measure(); }; skyPicture.src = art.background;
  function measure(): void {
    const box = stage.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height);
    tile = Math.max(1, height * skyAspect); sky.style.width = `${Math.ceil(width + tile + 2)}px`;
    bennyWidth = benny.offsetWidth; bennyHeight = benny.offsetHeight; shownFriend = '';
    for (const view of views.values()) view.style.width = `${BENNY_FLIGHT_GAME.columnWidth * width}px`;
  }
  // What is drawn: a soft height and tilt, and a wing phase that only speeds up or slows down, never jumps back.
  let shownFriend = '', shownFriendFrame = -1, shownFriendOpacity = '';
  // The friends' visits follow the seed the game started with: the game's own seed moves on with every column it draws, and
  // reading it would move a visit while it is under way (a friend popping up or vanishing mid-flight).
  let friendSeed = 0;
  let shownY = 0, shownTilt = 0, wingPhase = 0, wingRate = 1 / BENNY_FLAPPY.calmBeat, quickUntil = 0, shownBeat = -1, drawnAt = 0;
  function settleView(): void { shownY = game?.y ?? 0; shownTilt = 0; wingRate = 1 / BENNY_FLAPPY.calmBeat; quickUntil = 0; drawnAt = game?.at ?? 0; }
  const bales = (n: number) => `${n} colonne${n > 1 ? 's' : ''}`;
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  // The top line is written only when its text changes; today's rewards (`quotaText` reads the saved game) only when asked.
  let shownScore: string | null = null, shownQuota: string | null = null;
  function hud(rewards = false): void {
    const text = bales(game?.passed ?? 0); if (text !== shownScore) score.textContent = shownScore = text;
    if (rewards) { const line = options.quotaText?.() ?? ''; if (line !== shownQuota) quota.textContent = shownQuota = line; }
  }
  function flash(text: string, kind: 'pass' | 'record' | 'ready' | 'bump'): void {
    pop.textContent = text; pop.dataset.kind = kind; pop.classList.remove('shown'); void pop.offsetWidth; pop.classList.add('shown');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('shown'), kind === 'ready' ? 900 : 520);
  }
  function draw(): void {
    if (!game) return;
    const g = BENNY_FLIGHT_GAME, now = game.at;
    const dt = Math.max(0, now - drawnAt); drawnAt = now;
    const glide = (timeConstant: number) => 1 - Math.exp(-dt / timeConstant);
    shownY += (game.y - shownY) * glide(BENNY_FLAPPY.heightGlide);
    shownTilt += (Math.max(-BENNY_FLAPPY.tiltUp, Math.min(BENNY_FLAPPY.tiltDown, game.vy * BENNY_FLAPPY.tiltPerSpeed)) - shownTilt) * glide(BENNY_FLAPPY.tiltGlide);
    benny.style.transform = `translate3d(${g.x * width - bennyWidth / 2}px, ${shownY * height - bennyHeight / 2}px, 0) rotate(${shownTilt}deg)`;
    wingRate += (1 / (now < quickUntil ? BENNY_FLAPPY.quickBeat : BENNY_FLAPPY.calmBeat) - wingRate) * glide(BENNY_FLAPPY.wingGlide);
    wingPhase = (wingPhase + dt * wingRate) % BENNY_FLAPPY.frames;
    const beat = Math.floor(wingPhase);
    if (beat !== shownBeat) { shownBeat = beat; benny.style.backgroundPositionX = `${beat / (BENNY_FLAPPY.frames - 1) * 100}%`; }
    // The sky scrolls with the columns, slower (a little depth): one picture wide, then it starts again.
    const skyShift = (game.distance * .4 * width) % tile;
    sky.style.transform = `translate3d(${-skyShift}px, 0, 0)`;
    const seen = new Set<number>();
    for (const c of game.columns) {
      seen.add(c.id);
      let view = views.get(c.id);
      if (!view) {
        view = document.createElement('div'); view.className = 'benny-flight-column';
        for (const part of ['top', 'bottom']) { const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = art.column; img.dataset.part = part; view.append(img); }
        // A column's gap never changes: its two pictures are sized once.
        (view.children[0] as HTMLElement).style.height = `${(c.gapY - c.gap / 2) * 100}%`;
        (view.children[1] as HTMLElement).style.top = `${(c.gapY + c.gap / 2) * 100}%`;
        view.style.width = `${g.columnWidth * width}px`;
        columns.append(view); views.set(c.id, view);
      }
      view.style.transform = `translate3d(${c.x * width}px, 0, 0)`;
    }
    for (const [id, view] of views) if (!seen.has(id)) { view.remove(); views.delete(id); }
    // The friend who flies behind Benny now and then (behind the columns too: it is further away).
    // It comes in from beyond the left edge and fades in, and drops back out the same way (bennyFlightFriendLeft).
    const mate = game.started ? bennyFlightFriend(friendSeed, now - game.startedAt, shownY, stillFriends) : null;
    if (!mate || mate.opacity <= 0) { if (!friend.hidden) { friend.hidden = true; shownFriendOpacity = ''; } return; }
    const look = BENNY_FLIGHT_FRIEND_ART[mate.kind], h = bennyHeight * look.size, w = h * look.aspect;
    if (shownFriend !== mate.kind) {
      shownFriend = mate.kind; shownFriendFrame = -1;
      friend.style.backgroundImage = `url('${preferWebp(friendUrl(mate.kind))}')`; friend.style.height = `${h}px`; friend.style.width = `${w}px`;
    }
    const opacity = mate.opacity >= 1 ? '1' : mate.opacity.toFixed(2);
    if (opacity !== shownFriendOpacity) { shownFriendOpacity = opacity; friend.style.opacity = opacity; }
    const wing = Math.floor(now / BENNY_FLIGHT_FRIEND_ART.beat) % 2;
    if (wing !== shownFriendFrame) { shownFriendFrame = wing; friend.style.backgroundPositionX = wing ? '100%' : '0%'; }
    friend.style.transform = `translate3d(${bennyFlightFriendLeft(mate, width, w)}px, ${mate.y * height - h / 2}px, 0)`;
    if (friend.hidden) friend.hidden = false;
  }
  let shownPassed = 0;
  function update(): void {
    if (!game) return;
    if (fallingAt !== null) { fall(); return; }
    advanceBennyFlight(game, clock());
    if (game.passed > shownPassed) {
      shownPassed = game.passed;
      if (previousBest > 0 && game.passed === previousBest + 1) { flash('Nouveau record !', 'record'); sound('record'); }
      else if (game.passed === BENNY_FLIGHT_GAME.easyColumns) { flash('Ça accélère !', 'pass'); sound('faster'); }
      else if (game.passed % 10 === 0) { flash(`${bales(game.passed)} !`, 'pass'); sound('ten'); }
      else sound('pass', 1 + (game.passed % 10) * .04);
    }
    draw(); hud();
    if (game.over && running) { fallingAt = fallDrawnAt = clock(); fallSpeed = Math.max(.35, game.vy); flash('Pouf !', 'bump'); sound('fall'); }
  }
  /** Benny tumbles into the sea of clouds, then the end card comes. */
  function fall(): void {
    const now = clock(), dt = Math.max(0, now - fallDrawnAt) / 1000; fallDrawnAt = now;
    fallSpeed = Math.min(2, fallSpeed + 3 * dt); shownY = Math.min(1.2, shownY + fallSpeed * dt);
    shownTilt += (70 - shownTilt) * (1 - Math.exp(-dt * 1000 / 160));
    benny.style.transform = `translate3d(${BENNY_FLIGHT_GAME.x * width - bennyWidth / 2}px, ${shownY * height - bennyHeight / 2}px, 0) rotate(${shownTilt}deg)`;
    if (now - fallingAt! >= BENNY_FLIGHT_FALL_MS && running) { fallingAt = null; finish(); }
  }
  let scheduled = false;
  function schedule(): void { if (scheduled) return; scheduled = true; frame(() => { scheduled = false; loop(); }); }
  function loop(): void { if (!running) return; update(); if (running) schedule(); }
  function flap(): void {
    if (!game || !running || game.over) return;
    const now = clock(); flapBennyFlight(game, now); sound('flap', .94 + Math.random() * .12);
    quickUntil = now + BENNY_FLAPPY.quickBeat * BENNY_FLAPPY.frames;
  }
  function finish(): void {
    running = false; const final = game!.passed, record = final > previousBest && final > 0;
    const reward = options.onFinished(final);
    const chips = document.createElement('p'); chips.className = 'benny-flight-rewards';
    for (const part of reward ? reward.split(' · ') : []) { const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip'; setCurrencyText(chip, part); chips.append(chip); }
    hud(true);
    const again = button('Rejouer', start, 'bennyFlightAgain');
    showCard(paragraph(final ? `Benny a franchi ${bales(final)} !` : 'Benny s’est posée un peu trop tôt.', 'benny-flight-title'),
      ...(record ? [paragraph(previousBest ? `Nouveau record ! L’ancien était de ${previousBest}.` : 'Ton premier record !', 'benny-flight-record')] : previousBest ? [paragraph(`Ton record : ${bales(previousBest)}`, 'benny-flight-rules')] : []),
      chips, again, button('Quitter', close, 'bennyFlightQuit'));
    // Focus only once the card has settled: a Space still held from flapping would otherwise press « Rejouer » at once.
    settleCard(card); setTimeout(() => { if (card.isConnected) again.focus(); }, 400);
  }
  function start(): void {
    previousBest = options.best?.() ?? 0; shownPassed = 0; fallingAt = null;
    for (const view of views.values()) view.remove(); views.clear();
    game = startBennyFlight(clock()); friendSeed = game.seed; running = true; card.hidden = true; settleView();
    hud(true); draw(); flash('Touche pour voler !', 'ready'); schedule();
  }
  function intro(): void {
    game = startBennyFlight(clock()); friendSeed = game.seed; running = false; previousBest = options.best?.() ?? 0; settleView(); draw(); hud(true);
    showCard(paragraph('Le vol de Benny', 'benny-flight-title'),
      paragraph('Touche le ciel pour que Benny batte des ailes, et passe entre les colonnes de bottes de foin. Une colonne touchée ou la mer de nuages, et Benny se pose. Plus tu vas loin, plus ça va vite. Rejoue autant que tu veux !', 'benny-flight-rules'),
      button('C’est parti !', start, 'bennyFlightStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; time.resume(); game = null; fallingAt = null; layer.hidden = true; clearTimeout(popTimer);
    window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: false})); options.onExit?.();
  }
  /** The phone locked or another app opened: the game waits, frozen, instead of being lost to the time gone by. */
  function pause(): void {
    if (!running) return;
    time.pause(); running = false;
    showCard(paragraph('Partie en pause', 'benny-flight-title'), button('Reprendre', resume, 'bennyFlightResume'), button('Quitter', close, 'bennyFlightQuit'));
  }
  function resume(): void { time.resume(); running = true; card.hidden = true; if (fallingAt !== null) fallDrawnAt = clock(); schedule(); }
  pauseWhenLeft(pause, abort.signal);
  window.addEventListener('resize', () => { if (!layer.hidden) measure(); }, {signal: abort.signal});
  stage.addEventListener('pointerdown', event => { event.preventDefault(); flap(); }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-flight-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  document.addEventListener('keydown', event => {
    if (layer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.key === ' ' || event.key === 'ArrowUp') && running) { event.preventDefault(); flap(); }
  }, {signal: abort.signal});
  return {
    get active() { return !layer.hidden; },
    get playing() { return running; },
    get game() { return game; },
    element: layer,
    open(chosen: Rabbit) {
      void chosen; // Only Benny plays: her flapping sprite is the same for every Benny.
      layer.hidden = false; window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: true}));
      stillFriends = still(); preloadFriends(); measure(); intro(); $<HTMLButtonElement>('[data-benny-flight-start]').focus();
    },
    close, update, flap,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
