import {describe, expect, it, vi} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {CHRISTMAS_CHALLENGES, CHRISTMAS_CHALLENGE_IDS, MAX_CANDIES, SKY_GIFTS, type ChristmasChallengeId} from '../src/config/christmasEvent';
import {ALL_DECORATION_IDS, CHRISTMAS_DECORATION_IDS, DECORATIONS, DECORATION_IDS, ownedDecorationResalePrice} from '../src/config/decorations';
import {candiesOf, christmasChallengeAvailable, christmasChallengesFor, christmasChallengesOf, christmasProgress, pickChristmasChallenges, skyGiftsDay, snowmanQuote, snowmanToday} from '../src/simulation/christmas';
import {dailyCycleStart} from '../src/simulation/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {catalogDecorationPlacementReason} from '../src/simulation/decorations';
import {fingerprint} from '../src/cloud/sync';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';

const DAY = MISSION_CYCLE_DURATION;
function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
function freeCell(s: GameState, kind?: 'enclosure') {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y};
  throw Error('No space');
}
function freeSpot(s: GameState, catalogId: typeof ALL_DECORATION_IDS[number]) {
  for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) { const location = {kind: 'outside' as const, x, y, rotation: 0 as const}; if (!catalogDecorationPlacementReason(s, catalogId, location)) return location; }
  throw Error('No spot');
}
/** Player level `level`, a universal level 3 enclosure with three rabbits, a farm, plenty of food and pattes. */
function setup(level = 5) {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 100_000; s.grass = 5000;
  const c = freeCell(s, 'enclosure'), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3}; s.buildings.push(home);
  const f = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'farm', f.x, f.y));
  const ids = [0, 1, 2].map(() => { const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species: 'paille', affection: 3, enclosureId: home.id}); return id; });
  return {s, ids, home: home.id};
}
/** Shows these three challenges in the current cycle. */
function withChallenges(s: GameState, picked: ChristmasChallengeId[], candies = 0): GameState {
  s.christmas = {candies, cycle: s.missions.daily.cycleIndex, picked, progress: {}, claimed: []};
  return s;
}
const claim = (s: GameState, id: ChristmasChallengeId): Command => ({type: 'claimChristmasChallenge', id, cycleStart: dailyCycleStart(s)});

describe('Christmas challenges: the draw', () => {
  it('draws three different challenges, deterministically, with exactly one activity, among the pool only', () => {
    for (let cycle = 0; cycle < 200; cycle++) {
      const picked = christmasChallengesFor(cycle);
      expect(picked).toHaveLength(3); expect(new Set(picked).size).toBe(3);
      expect(picked.filter(id => CHRISTMAS_CHALLENGES[id].activity)).toHaveLength(1);
      expect(christmasChallengesFor(cycle)).toEqual(picked);
      const pool: ChristmasChallengeId[] = ['sky-gifts', 'feed', 'collect', 'pet'];
      const limited = christmasChallengesFor(cycle, pool);
      expect(limited).toHaveLength(3); expect(limited).toContain('sky-gifts'); expect(limited.every(id => pool.includes(id))).toBe(true);
    }
    // Every challenge comes up some day.
    expect(new Set(Array.from({length: 200}, (_, c) => christmasChallengesFor(c)).flat())).toEqual(new Set(CHRISTMAS_CHALLENGE_IDS));
  });
  it('offers only what the player can do: no snowman at level 1, no food without a farm, no caresses with one rabbit', () => {
    const s = createGame(0);
    expect(christmasChallengeAvailable(s, 'snowman')).toBe(false); expect(christmasChallengeAvailable(s, 'harvest')).toBe(false); expect(christmasChallengeAvailable(s, 'pet')).toBe(false);
    for (let cycle = 0; cycle < 100; cycle++) {
      const picked = pickChristmasChallenges(s, cycle);
      expect(picked).toHaveLength(3); expect(picked).toContain('sky-gifts');
      expect(picked.some(id => ['snowman', 'harvest', 'pet'].includes(id))).toBe(false);
    }
    const {s: rich} = setup(2);
    for (const id of CHRISTMAS_CHALLENGE_IDS) expect(christmasChallengeAvailable(rich, id)).toBe(true);
  });
  it('stores the draw when a new daily cycle starts, and keeps the sucres d’orge, the snowman and the record', () => {
    const {s} = setup();
    s.christmas = {candies: 17, cycle: 0, picked: ['sky-gifts', 'feed', 'collect'], progress: {feed: 2}, claimed: [], snowman: {cycle: 0, enclosureId: 'building-1'}, skyGifts: {cycle: 0, rewarded: 1, best: 12}};
    const next = advance(s, DAY);
    expect(next.christmas).toEqual({candies: 17, cycle: 1, picked: pickChristmasChallenges(next, 1), progress: {}, claimed: [], snowman: {cycle: 0, enclosureId: 'building-1'}, skyGifts: {cycle: 0, rewarded: 1, best: 12}});
    expect(christmasChallengesOf(next)).toEqual(next.christmas!.picked);
    // Within the cycle the stored draw stays, whatever the player builds.
    expect(christmasChallengesOf(advance(next, DAY + HOUR))).toEqual(next.christmas!.picked);
  });
  it('shows a draw even before anything is stored, and stores it at the first progress', () => {
    const {s} = setup();
    expect(s.christmas).toBeUndefined(); expect(christmasChallengesOf(s)).toEqual(pickChristmasChallenges(s, 0));
    const fed = run(s, {type: 'feed', id: s.rabbits[1].id}).state;
    if (christmasChallengesOf(s).includes('feed')) expect(fed.christmas?.picked).toEqual(christmasChallengesOf(s));
  });
});

describe('Christmas challenges: counting and claims', () => {
  it('counts the real actions with the daily missions’ amounts, and pays sucres d’orge without XP', () => {
    const {s: base, ids, home} = setup();
    let s = withChallenges(base, ['sky-gifts', 'feed', 'collect']);
    for (let i = 0; i < 2; i++) s = run(s, {type: 'feed', id: ids[0]}).state;
    expect(christmasProgress(s, 'feed')).toBe(2);
    refused(s, claim(s, 'feed'), 'NOT_READY');
    s = run(s, {type: 'feed', id: ids[1]}).state; expect(christmasProgress(s, 'feed')).toBe(3);
    s.buildings.find(b => b.id === home)!.incomeUnits = 150 * HOUR;
    s = run(s, {type: 'collectIncome', id: home}).state; expect(christmasProgress(s, 'collect')).toBe(150);
    s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[2], caught: 4}).state; expect(christmasProgress(s, 'sky-gifts')).toBe(1);
    const xp = s.progression.totalXp, daily = structuredClone(s.missions.daily);
    s = run(s, claim(s, 'feed')).state; expect(candiesOf(s)).toBe(4);
    refused(s, claim(s, 'feed'), 'ALREADY_CLAIMED');
    refused(s, {type: 'claimChristmasBonus', cycleStart: dailyCycleStart(s)}, 'NOT_READY');
    s = run(s, claim(s, 'collect')).state; s = run(s, claim(s, 'sky-gifts')).state; expect(candiesOf(s)).toBe(14);
    const bonus = run(s, {type: 'claimChristmasBonus', cycleStart: dailyCycleStart(s)});
    expect(bonus.value).toBe(10); s = bonus.state; expect(candiesOf(s)).toBe(24); expect(s.christmas!.bonusClaimed).toBe(true);
    refused(s, {type: 'claimChristmasBonus', cycleStart: dailyCycleStart(s)}, 'ALREADY_CLAIMED');
    // No XP, and the claims are not events of the daily missions.
    expect(s.progression.totalXp).toBe(xp); expect(bonus.progressionGain).toBeUndefined();
    expect(s.missions.daily).toEqual(daily);
  });
  it('refuses a challenge not shown, an unknown one and a stale cycle', () => {
    const {s: base, ids} = setup();
    let s = withChallenges(base, ['sky-gifts', 'feed', 'collect']);
    for (let i = 0; i < 3; i++) s = run(s, {type: 'feed', id: ids[0]}).state;
    refused(s, claim(s, 'breed'), 'INVALID_CHOICE');
    refused(s, {type: 'claimChristmasChallenge', id: 'nope' as ChristmasChallengeId, cycleStart: dailyCycleStart(s)}, 'INVALID_CHOICE');
    refused(s, {type: 'claimChristmasChallenge', id: 'feed', cycleStart: dailyCycleStart(s) - DAY}, 'CYCLE_EXPIRED');
    // The next day, yesterday's claim is stale and the progress starts again.
    const later = advance(s, DAY);
    expect(act(later, {type: 'claimChristmasChallenge', id: 'feed', cycleStart: dailyCycleStart(s)}, DAY).ok).toBe(false);
    expect(christmasProgress(later, 'feed')).toBe(0);
  });
  it('counts caresses of different rabbits, food at the farms and a breeding', () => {
    const {s: base, ids} = setup();
    let s = withChallenges(base, ['sky-gifts', 'pet', 'harvest']);
    s = run(s, {type: 'petRabbit', rabbitId: ids[0]}).state; s = run(s, {type: 'petRabbit', rabbitId: ids[0]}).state;
    expect(christmasProgress(s, 'pet')).toBe(1);
    s = run(s, {type: 'petRabbit', rabbitId: ids[1]}).state; expect(christmasProgress(s, 'pet')).toBe(2);
    const farm = s.buildings.find(b => b.kind === 'farm')!;
    farm.order = {recipe: 'foin', startedAt: 0, endsAt: 0, grass: 40, duration: 1}; s.lastSimulatedAt = 0;
    s = run(s, {type: 'collectOrder', id: farm.id}).state; expect(christmasProgress(s, 'harvest')).toBe(40);
    let b = withChallenges(setup().s, ['sky-gifts', 'breed', 'feed']);
    const [p, q] = b.rabbits.filter(r => r.affection >= 2).map(r => r.id);
    b = run(b, {type: 'breed', parents: [p, q]}).state; expect(christmasProgress(b, 'breed')).toBe(1);
  });
  it('earns sucres d’orge only from the challenges and their bonus', () => {
    const {s: start, ids, home} = setup();
    const base = run(start, {type: 'claimHearts'}, start.nextHeartGiftAt).state;
    let s = withChallenges(base, ['snowman', 'breed', 'pet']);
    s = run(s, {type: 'feed', id: ids[0]}).state;
    s.buildings.find(b => b.id === home)!.incomeUnits = 300 * HOUR; s = run(s, {type: 'collectIncome', id: home}).state;
    s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 50}).state;
    expect(candiesOf(s)).toBe(0);
    s = run(s, {type: 'buildSnowman', enclosureId: home}).state; expect(candiesOf(s)).toBe(0);
    s = run(s, claim(s, 'snowman')).state; expect(candiesOf(s)).toBe(6);
  });
  it('refuses a balance beyond its bound', () => {
    const {s: base, home} = setup();
    let s = withChallenges(base, ['snowman', 'feed', 'collect'], MAX_CANDIES - 1);
    s = run(s, {type: 'buildSnowman', enclosureId: home}).state;
    refused(s, claim(s, 'snowman'), 'RESOURCE_LIMIT');
  });
});

describe('the snowman', () => {
  it('is free, gives nothing but the challenge, stands in its enclosure until the end of the cycle', () => {
    const {s: base, home} = setup(2);
    const s = withChallenges(base, ['snowman', 'feed', 'collect']);
    expect(snowmanQuote(s, home, 0)).toEqual({guests: s.rabbits.filter(r => r.enclosureId === home), reason: null});
    const built = run(s, {type: 'buildSnowman', enclosureId: home});
    expect(built.value).toBe(home); expect(built.progressionGain).toBeUndefined();
    const done = built.state;
    expect([done.pattes, done.grass, done.hearts, done.progression.totalXp]).toEqual([s.pattes, s.grass, s.hearts, s.progression.totalXp]);
    expect(done.rabbits.map(r => r.affection)).toEqual(s.rabbits.map(r => r.affection));
    expect(snowmanToday(done, HOUR)).toBe(home); expect(christmasProgress(done, 'snowman')).toBe(1);
    // One a day in all, whatever the enclosure.
    refused(done, {type: 'buildSnowman', enclosureId: home}, 'SNOWMAN_TODAY');
    refused(done, {type: 'buildSnowman', enclosureId: 'building-1'}, 'SNOWMAN_TODAY');
    // Gone the next cycle, and buildable again.
    const tomorrow = advance(done, DAY);
    expect(snowmanToday(tomorrow, DAY)).toBeNull();
    expect(snowmanToday(run(tomorrow, {type: 'buildSnowman', enclosureId: 'building-1'}, DAY).state, DAY)).toBe('building-1');
  });
  it('needs level 2, an enclosure and a rabbit present', () => {
    const {s, ids, home} = setup(1);
    refused(s, {type: 'buildSnowman', enclosureId: home}, 'LEVEL_REQUIRED');
    s.progression = {totalXp: cumulativeLevelXp(2), rewardedThroughLevel: 2};
    refused(s, {type: 'buildSnowman', enclosureId: s.buildings.find(b => b.kind === 'farm')!.id}, 'NOT_FOUND');
    refused(s, {type: 'buildSnowman', enclosureId: 'building-999'}, 'NOT_FOUND');
    const c = freeCell(s, 'enclosure'), empty = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); s.buildings.push(empty);
    refused(s, {type: 'buildSnowman', enclosureId: empty.id}, 'EMPTY_ENCLOSURE');
    // A rabbit at the salon is not present.
    for (const id of ids.slice(1)) s.rabbits.find(r => r.id === id)!.enclosureId = 'building-1';
    s.care = {rabbitId: ids[0], care: 'bath', startedAt: 0, endsAt: HOUR};
    expect(snowmanQuote(s, home, 0).reason).toBe('EMPTY_ENCLOSURE');
  });
});

describe('the mini-game « Les cadeaux du ciel »', () => {
  it('pays 2 pattes a gift up to 60 for three games a cycle, never XP, and keeps the record', () => {
    const {s: base, ids} = setup();
    let s = base;
    // A game with no gift caught uses up none of the three rewarded games.
    const empty = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 0});
    expect(empty.value).toBe(0); expect(skyGiftsDay(empty.state, 0).rewardedLeft).toBe(SKY_GIFTS.rewardedGamesPerCycle);
    s = empty.state;
    const first = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 10});
    expect(first.value).toBe(20); expect(first.state.pattes - s.pattes).toBe(20); expect(first.progressionGain).toBeUndefined();
    s = first.state;
    s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 45}).state; expect(s.pattes - base.pattes).toBe(80);
    s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[1], caught: 3}).state; expect(s.pattes - base.pattes).toBe(86);
    expect(skyGiftsDay(s, 0)).toEqual({rewardedLeft: 0, best: 45});
    const fourth = run(s, {type: 'rewardSkyGifts', rabbitId: ids[1], caught: 120});
    expect(fourth.value).toBe(0); expect(fourth.state.pattes).toBe(s.pattes); expect(fourth.state.christmas!.skyGifts).toEqual({cycle: 0, rewarded: 3, best: 120});
    expect(fourth.state.progression.totalXp).toBe(base.progression.totalXp);
    expect(skyGiftsDay(advance(fourth.state, DAY), DAY)).toEqual({rewardedLeft: SKY_GIFTS.rewardedGamesPerCycle, best: 120});
  });
  it('refuses a wrong score and a basket carrier away or missing', () => {
    const {s, ids} = setup();
    for (const caught of [-1, 201, 1.5, Number.NaN]) refused(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught}, 'INVALID_CHOICE');
    refused(s, {type: 'rewardSkyGifts', rabbitId: 'rabbit-999', caught: 3}, 'NOT_FOUND');
    s.care = {rabbitId: ids[0], care: 'bath', startedAt: 0, endsAt: HOUR};
    refused(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 3}, 'AT_SALON');
    expect(run(s, {type: 'rewardSkyGifts', rabbitId: ids[1], caught: SKY_GIFTS.maxCaught}).value).toBe(60);
  });
  it('counts only the rewarded games for both of its challenges', () => {
    const {s: base, ids} = setup();
    let s = withChallenges(base, ['sky-gifts', 'catch-gifts', 'feed']);
    for (let i = 0; i < 3; i++) s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 5}).state;
    expect([christmasProgress(s, 'sky-gifts'), christmasProgress(s, 'catch-gifts')]).toEqual([1, 15]);
    s = run(s, {type: 'rewardSkyGifts', rabbitId: ids[0], caught: 30}).state;
    expect(christmasProgress(s, 'catch-gifts')).toBe(15);
  });
});

describe('the Christmas market', () => {
  it('has its own decorations, absent from the shop, free of pattes, paid in sucres d’orge, without level', () => {
    for (const id of CHRISTMAS_DECORATION_IDS) {
      expect(DECORATION_IDS as readonly string[]).not.toContain(id);
      expect(DECORATIONS[id]).toMatchObject({price: 0, christmas: true, level: 1});
      expect(DECORATIONS[id].candyPrice).toBeGreaterThan(0);
      expect(DECORATIONS[id].art.file).toBe(`assets/noel/decorations/${id}.png`);
    }
    expect(ALL_DECORATION_IDS).toEqual([...DECORATION_IDS, ...CHRISTMAS_DECORATION_IDS]);
    expect(DECORATION_IDS.some(id => DECORATIONS[id].christmas)).toBe(false);
  });
  it('sells for sucres d’orge, to the inventory or placed, never for pattes, and never resells', () => {
    const s = createGame(0); s.pattes = 100_000;
    refused(s, {type: 'buyChristmasDecoration', catalogId: 'gift-pile'}, 'NOT_ENOUGH_CANDIES');
    refused(s, {type: 'buyDecoration', catalogId: 'gift-pile'}, 'INVALID_CHOICE');
    refused(s, {type: 'buyChristmasDecoration', catalogId: 'bush'}, 'INVALID_CHOICE');
    s.christmas = {candies: 200};
    const bought = run(s, {type: 'buyChristmasDecoration', catalogId: 'gift-pile'});
    let next = bought.state;
    expect(candiesOf(next)).toBe(160); expect(next.pattes).toBe(s.pattes);
    const owned = next.decorations.find(d => d.id === bought.value)!;
    expect(owned).toEqual({id: bought.value, catalogId: 'gift-pile', paidCandies: 40, location: {kind: 'inventory'}, placementXpProcessed: true});
    expect(ownedDecorationResalePrice(owned)).toBe(0);
    refused(next, {type: 'sellDecoration', id: owned.id}, 'INVALID_CHOICE');
    // Placed from the inventory, moved and stored like any decoration, without XP.
    const spot = freeSpot(next, 'gift-pile');
    next = run(next, {type: 'placeDecoration', id: owned.id, location: spot}).state;
    expect(next.decorations.find(d => d.id === owned.id)!.location).toEqual(spot);
    expect(next.progression.totalXp).toBe(s.progression.totalXp);
    next = run(next, {type: 'placeDecoration', id: owned.id, location: {kind: 'inventory'}}).state;
    const tree = freeSpot(next, 'christmas-tree');
    const placed = run(next, {type: 'buyChristmasDecoration', catalogId: 'christmas-tree', location: tree});
    refused(placed.state, {type: 'buyChristmasDecoration', catalogId: 'christmas-tree'}, 'NOT_ENOUGH_CANDIES');
    expect(candiesOf(placed.state)).toBe(40); expect(placed.progressionGain).toBeUndefined();
    expect(placed.state.decorations.find(d => d.id === placed.value)!.location).toEqual(tree);
  });
});

describe('the save (v26)', () => {
  function festive() {
    const {s: base, home} = setup();
    let s = withChallenges(base, ['snowman', 'feed', 'collect'], 300);
    s = run(s, {type: 'buildSnowman', enclosureId: home}).state;
    s = run(s, {type: 'rewardSkyGifts', rabbitId: s.rabbits[1].id, caught: 12}).state;
    s = run(s, claim(s, 'snowman')).state;
    s = run(s, {type: 'buyChristmasDecoration', catalogId: 'snow-globe'}).state;
    return {s, home};
  }
  it('round-trips the Christmas state and decorations', () => {
    const {s} = festive();
    const raw = JSON.parse(encodeGame(s)); expect(raw.version).toBe(26);
    expect(raw.christmas).toMatchObject({candies: 246, claimed: ['snowman'], snowman: {cycle: 0}, skyGifts: {cycle: 0, rewarded: 1, best: 12}});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('migrates a v25 save without anything to convert', () => {
    const s = advance(setup().s, 0);
    const raw = JSON.parse(encodeGame(s)); raw.version = 25;
    const migrated = decodeGame(JSON.stringify(raw));
    expect(migrated).toEqual({ok: true, state: {...s, version: 26}});
    // A v25 save cannot already hold the Christmas fields' bad values either: the same validation applies.
    const bad = JSON.parse(encodeGame(s)); bad.version = 25; bad.christmas = {candies: -1};
    expect(decodeGame(JSON.stringify(bad))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
  it('refuses invalid Christmas values, and drops a snowman whose enclosure is gone', () => {
    const {s, home} = festive();
    const variants: [string, (raw: Record<string, any>) => void][] = [
      ['too many sucres d’orge', raw => { raw.christmas.candies = MAX_CANDIES + 1; }],
      ['a future cycle', raw => { raw.christmas.cycle = 5; }],
      ['a future snowman', raw => { raw.christmas.snowman.cycle = 5; }],
      ['a future game', raw => { raw.christmas.skyGifts.cycle = 5; }],
      ['an unknown challenge', raw => { raw.christmas.picked = ['snowman', 'feed', 'nope']; }],
      ['a claim not ready', raw => { raw.christmas.claimed = ['snowman', 'feed']; }],
      ['a bonus before the claims', raw => { raw.christmas.bonusClaimed = true; }],
      ['a shop decoration paid in sucres d’orge', raw => { raw.decorations.push({id: `decoration-${raw.nextId}`, catalogId: 'bush', paidCandies: 3, location: {kind: 'inventory'}}); raw.nextId++; }],
      ['a Christmas decoration paid in pattes', raw => { raw.decorations[0].paidPrice = 10; }],
    ];
    for (const [label, change] of variants) {
      const raw = JSON.parse(encodeGame(s)); change(raw);
      expect(decodeGame(JSON.stringify(raw)), label).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
    const raw = JSON.parse(encodeGame(s)); raw.christmas.snowman.enclosureId = 'building-999';
    const loaded = decodeGame(JSON.stringify(raw));
    expect(loaded.ok && loaded.state.christmas!.snowman).toBeUndefined();
    expect(loaded.ok && loaded.state.christmas!.candies).toBe(246);
    expect(home).toBeDefined();
  });
  it('lets the cloud save see the sucres d’orge, the snowman and the mini-game, not the passive draw', () => {
    const {s} = setup();
    const before = fingerprint(s);
    expect(fingerprint(withChallenges(structuredClone(s), ['sky-gifts', 'feed', 'collect']))).toBe(before);
    const {s: played} = festive();
    const other = structuredClone(played); other.christmas!.candies++;
    expect(fingerprint(other)).not.toBe(fingerprint(played));
    const moved = structuredClone(played); moved.christmas!.snowman = {cycle: 0, enclosureId: 'building-1'};
    expect(fingerprint(moved)).not.toBe(fingerprint(played));
  });
});

describe('when the event is over', () => {
  it('refuses the Christmas commands and counts nothing, but the decorations bought stay placeable', async () => {
    vi.resetModules();
    vi.doMock('../src/config/christmas', async original => ({...await original<typeof import('../src/config/christmas')>(), CHRISTMAS_EVENT: {active: false}}));
    try {
      const sim = await import('../src/simulation');
      const christmas = await import('../src/simulation/christmas');
      const {s, ids, home} = setup();
      const offline = (c: Command, reason: string) => expect(sim.act(s, c, 0, () => 0)).toMatchObject({ok: false, reason});
      offline({type: 'buildSnowman', enclosureId: home}, 'EVENT_OVER');
      offline({type: 'rewardSkyGifts', rabbitId: ids[0], caught: 3}, 'EVENT_OVER');
      offline({type: 'buyChristmasDecoration', catalogId: 'gift-pile'}, 'EVENT_OVER');
      offline({type: 'claimChristmasBonus', cycleStart: 0}, 'EVENT_OVER');
      const fed = sim.act(withChallenges(structuredClone(s), ['sky-gifts', 'feed', 'collect']), {type: 'feed', id: ids[0]}, 0, () => 0);
      expect(fed.ok && fed.state.christmas!.progress).toEqual({});
      expect(sim.advance(s, DAY).christmas).toBeUndefined();
      const owned = structuredClone(s); owned.decorations.push({id: `decoration-${owned.nextId++}`, catalogId: 'sled', paidCandies: 70, location: {kind: 'inventory'}, placementXpProcessed: true});
      const placed = sim.act(owned, {type: 'placeDecoration', id: owned.decorations[0].id, location: freeSpot(owned, 'sled')}, 0, () => 0);
      expect(placed.ok).toBe(true);
      expect(christmas.snowmanToday({...s, christmas: {candies: 0, snowman: {cycle: 0, enclosureId: home}}}, 0)).toBeNull();
    } finally {
      vi.doUnmock('../src/config/christmas'); vi.resetModules();
    }
  });
});
