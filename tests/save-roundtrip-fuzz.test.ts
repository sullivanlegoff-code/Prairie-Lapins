// Plays random real commands in every laboratory scenario and checks that each accepted result
// can be saved and reloaded: an action accepted by the rules must never be lost at save time.
import {expect, it} from 'vitest';
import {act, advance, encodeGame, decodeGame} from '../src/simulation';
import {scenarioState, SCENARIOS} from '../src/dev/scenarios';
import {DAILY_MISSION_IDS, MAIN_MISSION_IDS} from '../src/config/missions';
import {DECORATION_IDS} from '../src/config/decorations';
import {BUILDING_KINDS, SPECIES_IDS} from '../src/config/balance';
import {CHRISTMAS_CHALLENGE_IDS} from '../src/config/christmasEvent';
import {picnicQuote} from '../src/simulation/care';
import {PARCEL_IDS, extensionPrice} from '../src/config/land';
import {playerLevel} from '../src/simulation/affection';
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T,>(a: readonly T[]): T | undefined => a.length ? a[Math.floor(rnd() * a.length)] : undefined;
const failures = new Map<string, string>(); const okCount: Record<string, number> = {}; const refused: Record<string, Record<string, number>> = {};
function commands(s: any): any[] {
  const r = s.rabbits.map((x: any) => x.id), b = s.buildings;
  const enc = b.filter((x: any) => x.kind === 'enclosure').map((x: any) => x.id);
  const farms = b.filter((x: any) => x.kind === 'farm'); const nest = b.find((x: any) => x.kind === 'nest');
  const babies = b.flatMap((x: any) => x.nursery?.babies ?? []);
  const out: any[] = [];
  const p1 = pick(r), p2 = pick(r); if (p1 && p2) out.push({type: 'breed', parents: [p1, p2]});
  if (nest?.breeding) out.push({type: 'transferBirth', id: nest.id, birthId: nest.breeding.birth.id});
  for (const baby of babies) { out.push({type: 'welcome', enclosureId: pick(enc), birthId: baby.birth.id}); out.push({type: 'releaseBaby', birthId: baby.birth.id}); }
  for (const e of enc) out.push({type: 'collectIncome', id: e});
  for (const f of farms) { out.push({type: 'collectOrder', id: f.id}); out.push({type: 'startOrder', id: f.id, recipe: pick(['foin','laitue','carotte','fraise','pomme','mais'])}); }
  if (p1) { out.push({type: 'feed', id: p1}); out.push({type: 'startTrip', rabbitId: p1}); out.push({type: 'claimTrip', rabbitId: p1}); out.push({type: 'moveRabbit', id: p1, enclosureId: pick(enc)}); out.push({type: 'renameRabbit', id: p1, name: 'Zoé ' + Math.floor(rnd()*99)}); }
  for (const t of s.travel?.trips ?? []) out.push({type: 'claimTrip', rabbitId: t.rabbitId});
  out.push({type: 'claimDailyMission', id: pick(DAILY_MISSION_IDS), cycleStart: s.missions.daily.referenceAt});
  out.push({type: 'claimDailyBonus', cycleStart: s.missions.daily.referenceAt});
  out.push({type: 'claimMainMission', id: pick(s.missions.completed) ?? pick(MAIN_MISSION_IDS)});
  out.push({type: 'claimHearts'});
  out.push({type: 'buyDecoration', catalogId: pick(DECORATION_IDS)});
  const d = pick(s.decorations ?? []) as any; if (d) { out.push({type: 'sellDecoration', id: d.id}); out.push({type: 'placeDecoration', id: d.id, location: {kind: 'outside', x: Math.floor(rnd()*30), y: Math.floor(rnd()*48), rotation: 0}}); out.push({type: 'placeDecoration', id: d.id, location: {kind: 'inventory'}}); }
  if (p1 && enc.length) out.push({type: 'buyRabbit', species: pick(SPECIES_IDS), enclosureId: pick(enc)});
  if (p1) out.push({type: 'rewardCuisine', rabbitId: p1, recipeId: pick(['avocado-toast','moelleux','chicken'])});
  const job = b.find((x: any) => x.order || x.breeding); if (job) out.push({type: 'accelerate', id: job.id, stage: job.order ? 'order' : 'breeding', jobKey: 'x', maxHearts: 99});
  if (p1 && rnd() < 0.05) out.push({type: 'release', id: p1});
  // The recent actions too (plan 4.3): care, picnic, snowman, debris, evolution, forest, Benny, the mini-games, Christmas, moves.
  const p3 = pick(r), e1 = pick(enc), any = pick(b) as any;
  if (p1) { out.push({type: 'startCare', rabbitId: p1, care: pick(['bath', 'brush', 'massage'])}); out.push({type: 'claimCare', rabbitId: p1}); out.push({type: 'petRabbit', rabbitId: p1});
    out.push({type: 'evolveRabbit', rabbitId: p1}); out.push({type: 'toggleClassicLook', rabbitId: p1}); out.push({type: 'toggleCrown', rabbitId: p1});
    out.push({type: 'rewardSkyGifts', rabbitId: p1, caught: Math.floor(rnd() * 40)}); }
  if (s.care) out.push({type: 'claimCare', rabbitId: s.care.rabbitId});
  if (e1) { out.push({type: 'picnic', enclosureId: e1, expectedCost: picnicQuote(s, e1, s.lastSimulatedAt, playerLevel(s)).price}); out.push({type: 'buildSnowman', enclosureId: e1}); out.push({type: 'upgradeHabitat', id: e1, fromLevel: pick([1, 2])}); }
  if (rnd() < .1) out.push({type: 'expand', parcelId: pick(PARCEL_IDS.filter(id => !s.acquiredParcels.includes(id))), expectedCost: extensionPrice(s)}); // New land brings debris.
  for (const debris of s.debris ?? []) if (rnd() < .3) out.push({type: 'clearDebris', id: debris.id});
  if (p1 && p2 && p3) out.push({type: 'rewardJumpRope', team: {carriers: [p1, p2], athlete: p3}, score: Math.floor(rnd() * 60)});
  out.push({type: 'rewardBennyFlight', passed: Math.floor(rnd() * 60)});
  out.push({type: 'finishBennyRun', score: Math.floor(rnd() * 500), metres: Math.floor(rnd() * 900)});
  out.push({type: 'bennyPower'}); out.push({type: 'bennySky', inSky: rnd() < .5});
  out.push({type: 'claimChristmasChallenge', id: pick(CHRISTMAS_CHALLENGE_IDS), cycleStart: s.missions.daily.referenceAt});
  out.push({type: 'claimChristmasBonus', cycleStart: s.missions.daily.referenceAt});
  out.push({type: 'buyChristmasDecoration', catalogId: pick(DECORATION_IDS)});
  out.push({type: 'buyJumpIsland'}); out.push({type: 'buyEpicIslet'}); out.push({type: 'welcomeAgency'});
  if (any) out.push({type: 'moveBuilding', id: any.id, x: any.x + Math.floor(rnd() * 9) - 4, y: any.y + Math.floor(rnd() * 9) - 4});
  out.push({type: 'buyBuilding', kind: pick(BUILDING_KINDS), x: Math.floor(rnd() * 40), y: Math.floor(rnd() * 56)});
  out.push({type: 'storeDecorationsInCell', x: Math.floor(rnd() * 12), y: Math.floor(rnd() * 14)});
  return out;
}
it('every accepted action produces a save that encodes and decodes', () => {
const scenarios = Object.keys(SCENARIOS) as any[];
for (const id of scenarios) {
  let now = 1_790_000_000_000; let s: any;
  try { s = scenarioState(id, now); } catch (e) { failures.set('scenario:' + id, String(e)); continue; }
  for (let step = 0; step < 120; step++) {
    now += Math.floor(rnd() * rnd() * 3 * 3600_000);
    try { s = advance(s, now); } catch (e) { failures.set('advance:' + id, String((e as Error).stack).slice(0, 400)); break; }
    for (const c of commands(s)) {
      if (rnd() < 0.6) continue;
      let r: any;
      try { r = act(s, c, now, rnd); } catch (e) { failures.set('throw:' + c.type + ':' + String((e as Error).message).slice(0, 80), id + ' ' + JSON.stringify(c)); continue; }
      if (!r.ok) { (refused[c.type] ??= {})[r.reason] = ((refused[c.type] ?? {})[r.reason] ?? 0) + 1; continue; }
      okCount[c.type] = (okCount[c.type] ?? 0) + 1;
      try { const json = encodeGame(r.state); const d = decodeGame(json); if (!d.ok) failures.set('decode:' + c.type + ':' + d.reason, id + ' ' + JSON.stringify(c)); }
      catch (e) { failures.set('encode:' + c.type + ':' + String((e as Error).message).replace(/\s+/g, ' ').slice(0, 300), id + ' ' + JSON.stringify(c)); continue; }
      s = r.state;
    }
  }
}
expect([...failures.entries()]).toEqual([]);
expect(Object.values(okCount).reduce((a, b) => a + b, 0)).toBeGreaterThan(1000);
// The recent actions are really played, not only refused.
for (const type of ['startCare', 'claimCare', 'picnic', 'buildSnowman', 'petRabbit', 'rewardJumpRope', 'rewardSkyGifts', 'rewardBennyFlight', 'finishBennyRun', 'moveBuilding', 'buyBuilding', 'clearDebris', 'evolveRabbit', 'bennySky', 'expand'])
  expect(okCount[type] ?? 0, type).toBeGreaterThan(0);
}, 300_000);
