// Plays random real commands in every laboratory scenario and checks that each accepted result
// can be saved and reloaded: an action accepted by the rules must never be lost at save time.
import {expect, it} from 'vitest';
import {act, advance, encodeGame, decodeGame} from '../src/simulation';
import {scenarioState, SCENARIOS} from '../src/dev/scenarios';
import {DAILY_MISSION_IDS, MAIN_MISSION_IDS} from '../src/config/missions';
import {DECORATION_IDS} from '../src/config/decorations';
import {SPECIES_IDS} from '../src/config/balance';
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
  if (p1) out.push({type: 'rewardCuisine', rabbitId: p1, recipeId: pick(['salad','chicken'])});
  out.push({type: 'exchangeForHeart', resource: pick(['pattes','grass']), expectedCost: 0});
  const job = b.find((x: any) => x.order || x.breeding); if (job) out.push({type: 'accelerate', id: job.id, stage: job.order ? 'order' : 'breeding', jobKey: 'x', maxHearts: 99});
  if (p1 && rnd() < 0.05) out.push({type: 'release', id: p1});
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
}, 120_000);
