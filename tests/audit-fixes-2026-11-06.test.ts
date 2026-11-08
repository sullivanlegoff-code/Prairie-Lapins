// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PROGRESSION} from '../src/config/progression';
import {FOREST} from '../src/config/balance';
import {fingerprint, sameCore} from '../src/cloud/sync';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {createGame} from '../src/simulation';
import {bennyFlightReward} from '../src/simulation/bennyFlight';
import {hasRoomFor, upgradeFootprintReason} from '../src/simulation/placement';
import {cumulativeLevelXp, progressionFromXp, xpAfterSlowdown} from '../src/simulation/progression';
import {mountBennyFlightActivity} from '../src/ui/BennyFlightActivity';
import {pausableClock} from '../src/ui/activityPause';
import type {Building, GameState} from '../src/state/types';

const {slowdown: _slowdown, ...publishedCurve} = PROGRESSION.curve;
const published = {...PROGRESSION, curve: publishedCurve};

describe('the level reached stays across the slow-down above level 20', () => {
  it.each([21, 22, 25, 30])('keeps level %i and its share', level => {
    const xp = cumulativeLevelXp(level, published) + (level === 30 ? 7 : 50);
    expect(progressionFromXp(xpAfterSlowdown(xp)).level).toBe(level);
  });
  it('changes nothing up to level 20', () => {
    const xp = cumulativeLevelXp(20, published) + 3;
    expect(xpAfterSlowdown(xp)).toBe(xp);
  });
  it('converts an older save when it loads, and only an older one', () => {
    const s = createGame(0), xp = cumulativeLevelXp(22, published) + 10;
    s.progression.totalXp = xp;
    const older = JSON.parse(encodeGame(s)) as {version: number}; older.version = 26;
    const decoded = decodeGame(JSON.stringify(older));
    expect(decoded.ok && progressionFromXp(decoded.state.progression.totalXp).level).toBe(22);
    const current = decodeGame(encodeGame(s));
    expect(current.ok && current.state.progression.totalXp).toBe(xp);
  });
  it('recognises a cloud baseline written with the published curve', () => {
    const s = createGame(0), before = cumulativeLevelXp(22, published) + 10;
    s.progression.totalXp = before; const baseline = fingerprint(s);
    s.progression.totalXp = xpAfterSlowdown(before);
    expect(fingerprint(s)).not.toBe(baseline);
    expect(sameCore(fingerprint(s), baseline)).toBe(true);
  });
});

describe('cloud fingerprint: what ends by itself is not an action', () => {
  const evolved = (): GameState => {
    const s = createGame(0);
    s.buildings.push({id: 'forest-1', kind: 'forest', x: 0, y: 32} as Building);
    Object.assign(s.rabbits[0]!, {affection: 30, evolution: {done: true}});
    return s;
  };
  it('reads a change of drawing as the drawing it leads to', () => {
    const s = evolved(), rabbit = s.rabbits[0]!;
    rabbit.lookChange = {endsAt: s.lastSimulatedAt + FOREST.changeMs};
    const during = fingerprint(s);
    delete rabbit.lookChange; rabbit.classicLook = true;
    expect(fingerprint(s)).toBe(during);
  });
  it('still sees a change of drawing being started', () => {
    const s = evolved(), before = fingerprint(s);
    s.rabbits[0]!.lookChange = {endsAt: s.lastSimulatedAt + FOREST.changeMs};
    expect(fingerprint(s)).not.toBe(before);
  });
  it('ignores the parent challenge counted by the automatic transfer, not the others', () => {
    const s = createGame(0); s.missions.claimed.push('to-nursery');
    const before = fingerprint(s);
    s.rabbits[0]!.evolution = {challenges: {parent: 1}};
    expect(fingerprint(s)).toBe(before);
    s.rabbits[0]!.evolution = {challenges: {parent: 1, piquenique: 1}};
    expect(fingerprint(s)).not.toBe(before);
  });
});

describe('placement', () => {
  it('knows when no new building fits on the land owned', () => {
    const s = createGame(0);
    expect(hasRoomFor(s, 'enclosure')).toBe(true);
    expect(hasRoomFor({...s, buildings: [...s.buildings, ...[[0, 32], [6, 32], [10, 32], [10, 40]].map(([x, y], i) => ({id: `enclosure-x${i}`, kind: 'enclosure' as const, x: x!, y: y!}))]}, 'enclosure')).toBe(false);
    // The whole first parcel covered by decorations, one on each cell.
    const cells: GameState['decorations'] = [];
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) cells.push({id: `decoration-${x}-${y}`, catalogId: 'bush', location: {kind: 'outside', x, y}} as GameState['decorations'][number]);
    expect(hasRoomFor({...s, decorations: cells}, 'enclosure')).toBe(false);
  });
  it('names debris, not a decoration, when debris block an upgrade', () => {
    const s = createGame(0), b = s.buildings.find(x => x.kind === 'enclosure')!;
    s.buildings = s.buildings.filter(x => x === b); b.x = 4; b.y = 40;
    s.debris = [{id: 'debris-1', kind: 'herbes', x: 10, y: 41, price: 10}] as GameState['debris'];
    expect(upgradeFootprintReason(s, b.id, 2)).toBe('UPGRADE_BLOCKED_DEBRIS');
  });
});

describe('Le vol de Benny', () => {
  it('counts no rewarded game for a flight without a column', () => {
    const s = createGame(0), now = s.lastSimulatedAt;
    expect(bennyFlightReward(s, 0, now).rewarded).toBe(false);
    expect(bennyFlightReward(s, 1, now).rewarded).toBe(true);
  });
});

describe('a full-screen game waits while the phone is locked', () => {
  const hide = (hidden: boolean) => { Object.defineProperty(document, 'hidden', {configurable: true, value: hidden}); document.dispatchEvent(new Event('visibilitychange')); };
  afterEach(() => { hide(false); document.body.replaceChildren(); vi.restoreAllMocks(); });
  it('stands its clock still', () => {
    let real = 100; const time = pausableClock(() => real);
    real = 150; expect(time.now()).toBe(150);
    time.pause(); real = 9000; expect(time.now()).toBe(150);
    time.resume(); expect(time.now()).toBe(150);
    real = 9010; expect(time.now()).toBe(160);
  });
  it('asks to resume, loses no time, and records nothing', () => {
    let real = 1000; const steps: (() => void)[] = [], finished = vi.fn(() => '');
    const activity = mountBennyFlightActivity(document.body, {onFinished: finished, clock: () => real, frame: step => { steps.push(step); return 0; }});
    activity.open(createGame(0).rabbits[0]!);
    activity.element.querySelector<HTMLButtonElement>('[data-benny-flight-start]')!.click();
    expect(activity.playing).toBe(true);
    const at = activity.game!.at;
    hide(true);
    expect(activity.playing).toBe(false);
    real += 600_000; // Ten minutes in another app.
    hide(false);
    expect(finished).not.toHaveBeenCalled();
    expect(activity.element.querySelector('[data-benny-flight-card]')!.textContent).toContain('Partie en pause');
    activity.element.querySelector<HTMLButtonElement>('[data-benny-flight-resume]')!.click();
    expect(activity.playing).toBe(true);
    activity.update();
    expect(activity.game!.at - at).toBeLessThan(1000);
    expect(activity.game!.over).toBe(false);
    activity.dispose();
  });
});
