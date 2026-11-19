// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BENNY_FLIGHT_FRIENDS, bennyFlightFriend, bennyFlightFriendLeft, bennyFlightVisitStart} from '../src/simulation/bennyFlightFriends';
import {BENNY_FLIGHT_GAME} from '../src/simulation/bennyFlightGame';
import {mountBennyFlightActivity} from '../src/ui/BennyFlightActivity';

/** Owner, 19 November 2026: the dragon rabbit and the flying rabbit fly behind Benny now and then. */
describe('the friends of Benny’s flight', () => {
  const f = BENNY_FLIGHT_FRIENDS, length = f.enter + f.stay + f.leave;
  it('come now and then, the dragon first, then the flying rabbit, in turns', () => {
    expect(bennyFlightFriend(7, f.first - 1, .5)).toBeNull();
    const kinds = [0, 1, 2, 3].map(n => bennyFlightFriend(7, bennyFlightVisitStart(7, n) + f.enter + 100, .5)!.kind);
    expect(kinds).toEqual(['dragon', 'volant', 'dragon', 'volant']);
    for (let n = 0; n < 5; n++) {
      const gap = bennyFlightVisitStart(7, n + 1) - bennyFlightVisitStart(7, n) - length;
      expect(gap).toBeGreaterThanOrEqual(f.every); expect(gap).toBeLessThanOrEqual(f.every + f.jitter);
      expect(bennyFlightFriend(7, bennyFlightVisitStart(7, n) + length + 10, .5)).toBeNull();
    }
  });
  it('flies behind Benny, a little above her', () => {
    const start = bennyFlightVisitStart(3, 0);
    for (let t = 0; t < length; t += 50) {
      const mate = bennyFlightFriend(3, start + t, .5)!;
      expect(mate.x).toBeLessThan(BENNY_FLIGHT_GAME.x - .1);
      expect(mate.y).toBeLessThan(.5);
    }
    expect(bennyFlightFriend(3, start + f.enter + 2000, .05)!.y).toBeGreaterThanOrEqual(.08);
  });
});

/** Owner, 19 November 2026: « ils apparaissent et disparaissent d'un coup, c'est bizarre ». */
describe('a friend comes and goes softly', () => {
  const f = BENNY_FLIGHT_FRIENDS, length = f.enter + f.stay + f.leave, start = bennyFlightVisitStart(5, 1);
  const visit = (still = false) => Array.from({length: Math.ceil(length / 16)}, (_, k) => bennyFlightFriend(5, start + Math.min(length - 1, k * 16), .5, still)!);
  it('starts and ends wholly off the stage and invisible, then fades in while flying in, out while dropping back', () => {
    const frames = visit(), first = frames[0], last = frames.at(-1)!;
    expect(first.arrival).toBe(0); expect(first.opacity).toBe(0);
    expect(last.arrival).toBeLessThan(.001); expect(last.opacity).toBeLessThan(.001);
    const along = frames.filter((_, k) => k * 16 >= f.enter && k * 16 < f.enter + f.stay);
    for (const m of along) { expect(m.arrival).toBe(1); expect(m.opacity).toBe(1); }
    // Seen at full strength before it is fully in, so it never looks like a ghost flying along.
    expect(frames.find(m => m.opacity === 1)!.arrival).toBeLessThan(.6);
    const entering = frames.filter((_, k) => k * 16 < f.enter), leaving = frames.filter((_, k) => k * 16 >= f.enter + f.stay);
    for (let k = 1; k < entering.length; k++) { expect(entering[k].arrival).toBeGreaterThanOrEqual(entering[k - 1].arrival); expect(entering[k].opacity).toBeGreaterThanOrEqual(entering[k - 1].opacity); }
    for (let k = 1; k < leaving.length; k++) { expect(leaving[k].arrival).toBeLessThanOrEqual(leaving[k - 1].arrival); expect(leaving[k].opacity).toBeLessThanOrEqual(leaving[k - 1].opacity); }
  });
  it('never jumps from one frame to the next, not even where flying along turns into dropping back', () => {
    const frames = visit(), left = frames.map(m => bennyFlightFriendLeft(m, 844, 95));
    const jumps = left.slice(1).map((x, k) => Math.abs(x - left[k])), fades = frames.slice(1).map((m, k) => Math.abs(m.opacity - frames[k].opacity));
    expect(Math.max(...jumps)).toBeLessThan(5); // pixels in a 16 ms frame
    expect(Math.max(...fades)).toBeLessThan(.06);
  });
  it('is placed wholly beyond the left edge at the start and the end, whatever the stage and its own width', () => {
    for (const stage of [320, 390, 600, 844, 1366]) for (const width of [40, 95, 160]) {
      const away = bennyFlightFriendLeft({x: f.x - f.sway, arrival: 0}, stage, width);
      expect(away + width).toBeLessThanOrEqual(-f.edge);
      // In its place it is never cut by the left edge, even on a narrow stage.
      expect(bennyFlightFriendLeft({x: f.x - f.sway, arrival: 1}, stage, width)).toBeGreaterThanOrEqual(f.edge);
    }
  });
  it('with less motion asked for, only fades in and out in its place', () => {
    const frames = visit(true);
    for (const m of frames) expect(m.arrival).toBe(1);
    expect(frames[0].opacity).toBe(0); expect(frames.at(-1)!.opacity).toBeLessThan(.001);
    expect(Math.max(...frames.map(m => m.opacity))).toBe(1);
  });
});

afterEach(() => { document.body.innerHTML = ''; });
describe('the flight on screen', () => {
  function fly(quotaText = vi.fn(() => 'Encore 3 parties récompensées aujourd’hui')) {
    let now = 1000;
    const activity = mountBennyFlightActivity(document.body, {onFinished: () => '', quotaText, clock: () => now, frame: () => 0});
    activity.open({id: 'benny'} as never);
    document.querySelector<HTMLElement>('[data-benny-flight-start]')!.click();
    activity.flap();
    // Keeps Benny at the height of the next gap.
    const step = (ms: number) => { for (let t = 0; t < ms; t += 16) {
      now += 16; const g = activity.game!, next = g.columns.find(c => c.x + BENNY_FLIGHT_GAME.columnWidth > BENNY_FLIGHT_GAME.x - BENNY_FLIGHT_GAME.halfWidth);
      if (g.y > (next ? next.gapY + .04 : .52) && g.vy > 0) activity.flap(); activity.update();
    } };
    return {activity, step, quotaText, friend: document.querySelector<HTMLElement>('.benny-flight-friend')!, at: () => now - activity.game!.startedAt};
  }
  it('reads today’s rewards when a game starts, not on every frame', () => {
    const {activity, step, quotaText} = fly();
    const calls = quotaText.mock.calls.length; step(3000);
    expect(quotaText.mock.calls.length).toBe(calls);
    expect(document.querySelector('.benny-flight-quota')!.textContent).toContain('Encore 3 parties');
    activity.dispose();
  });
  it('shows the friend from nothing: hidden, then faint and beyond the left edge, then whole', () => {
    const {activity, step, friend, at} = fly();
    step(BENNY_FLIGHT_FRIENDS.first - at() - 40);
    expect(activity.game!.over).toBe(false); expect(friend.hidden).toBe(true);
    step(120);
    expect(friend.hidden).toBe(false);
    expect(+friend.style.opacity).toBeGreaterThan(0); expect(+friend.style.opacity).toBeLessThan(.2);
    expect(+/translate3d\(([-\d.]+)px/.exec(friend.style.transform)![1]).toBeLessThan(0);
    step(BENNY_FLIGHT_FRIENDS.enter + 200);
    expect(friend.style.opacity).toBe('1');
    activity.dispose();
  });
  it('never pops in nor out over a long flight, though every column moves the game’s seed on', () => {
    const {activity, step, friend} = fly();
    const shown = () => friend.hidden ? 0 : +friend.style.opacity;
    let previous = shown(), biggest = 0, visits = 0, seed = activity.game!.seed, seedMoves = 0;
    for (let k = 0; k < 75_000 / 16 && !activity.game!.over; k++) {
      step(16); const now = shown(); biggest = Math.max(biggest, Math.abs(now - previous));
      if (previous === 0 && now > 0) visits++;
      if (activity.game!.seed !== seed) { seed = activity.game!.seed; seedMoves++; }
      previous = now;
    }
    expect(activity.game!.over).toBe(false);
    expect(seedMoves).toBeGreaterThan(10); expect(visits).toBeGreaterThanOrEqual(3);
    expect(biggest).toBeLessThan(.06);
    activity.dispose();
  });
});
