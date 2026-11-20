import {describe, expect, it} from 'vitest';
import {SnowballFights, SNOWBALL_ISLAND_MAX, type SnowballThrower} from '../src/display/snowballFight';
import {createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';

// Owner, 20 November 2026: « des batailles générales dans un enclos au moins toutes les minutes et des batailles en duel dans un
// enclos toutes les minutes aussi ». Fake time: the fights and the rabbits' own motion are stepped together, like the meadow does.
const zone = {minX: -56, maxX: 56, minY: -20, maxY: 38};
const enclosure = (group: string, count: number): SnowballThrower[] => Array.from({length: count}, (_, i) => ({
  id: `${group}-lapin-${i}`, group, available: true,
  motion: createRabbitMotion(`${group}-lapin-${i}`, {x: -30 + 60 * i / Math.max(1, count - 1), y: (i % 3) * 8}, count, {zone, roamScale: 1})}));
function play(list: SnowballThrower[], minutes: number, options: {reduced?: boolean; enabled?: boolean; busy?: (t: number) => Set<string>} = {}) {
  const fights = new SnowballFights();
  for (let t = 0; t < minutes * 60_000; t += 50) {
    const busy = options.busy?.(t);
    if (busy) for (const r of list) r.available = !busy.has(r.id);
    for (const r of list) stepRabbitMotion(r.motion, 50);
    fights.step(50, list, true, options.reduced ?? false, options.enabled ?? true);
  }
  return fights.starts;
}
/** The longest wait for a kind: from the start of the game to the first one, between two, and from the last one to the end. */
function longestWait(starts: readonly {kind: string; at: number}[], kind: 'duel' | 'battle', end: number): number {
  const times = [0, ...starts.filter(s => s.kind === kind).map(s => s.at), end];
  return Math.max(...times.slice(1).map((t, k) => t - times[k]!));
}

describe('snowball fights on the whole island', () => {
  it('with a single enclosure of five, a general battle and a duel each start at least once a minute', () => {
    const starts = play(enclosure('enclos-1', 5), 10);
    expect(longestWait(starts, 'battle', 600_000)).toBeLessThanOrEqual(SNOWBALL_ISLAND_MAX);
    expect(longestWait(starts, 'duel', 600_000)).toBeLessThanOrEqual(SNOWBALL_ISLAND_MAX);
    expect(SNOWBALL_ISLAND_MAX).toBe(60_000);
  });

  it('with several enclosures, both kinds come at least once a minute and visit different enclosures', () => {
    const list = [...enclosure('enclos-a', 2), ...enclosure('enclos-b', 4), ...enclosure('enclos-c', 6), ...enclosure('enclos-d', 3)];
    const starts = play(list, 10);
    expect(longestWait(starts, 'battle', 600_000)).toBeLessThanOrEqual(60_000);
    expect(longestWait(starts, 'duel', 600_000)).toBeLessThanOrEqual(60_000);
    // A battle needs three free rabbits: never in the enclosure of two.
    expect(starts.filter(s => s.kind === 'battle' && s.group === 'enclos-a')).toHaveLength(0);
    expect(new Set(starts.filter(s => s.kind === 'battle').map(s => s.group)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(starts.filter(s => s.kind === 'duel').map(s => s.group)).size).toBeGreaterThanOrEqual(3);
  });

  it('staggers the first duel and the first battle', () => {
    const starts = play(enclosure('enclos-1', 5), 1.5);
    const duel = starts.find(s => s.kind === 'duel')!, battle = starts.find(s => s.kind === 'battle')!;
    expect(duel.at).toBeLessThan(battle.at);
    expect(battle.at - duel.at).toBeGreaterThanOrEqual(4_000);
  });

  it('with only two rabbits, duels every minute and no battle', () => {
    const starts = play(enclosure('enclos-1', 2), 10);
    expect(longestWait(starts, 'duel', 600_000)).toBeLessThanOrEqual(60_000);
    expect(starts.some(s => s.kind === 'battle')).toBe(false);
  });

  it('keeps the rules: nobody busy is taken, nothing in reduced motion or out of the event', () => {
    const list = enclosure('enclos-1', 5);
    // Two rabbits stay busy elsewhere (a kiss, a nap, a touch...): never taken; three stay free, enough for a battle.
    const busy = new Set([list[0]!.id, list[1]!.id]);
    const fights = new SnowballFights(); let taken = false;
    for (let t = 0; t < 300_000; t += 50) {
      for (const r of list) { r.available = !busy.has(r.id); stepRabbitMotion(r.motion, 50); }
      fights.step(50, list, true, false, true);
      if ([...busy].some(id => fights.isFighting(id))) taken = true;
    }
    expect(taken).toBe(false);
    expect(longestWait(fights.starts, 'battle', 300_000)).toBeLessThanOrEqual(60_000);
    expect(play(enclosure('enclos-2', 5), 3, {reduced: true})).toHaveLength(0);
    expect(play(enclosure('enclos-3', 5), 3, {enabled: false})).toHaveLength(0);
  });
});
