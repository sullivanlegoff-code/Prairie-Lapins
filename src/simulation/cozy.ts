import {HOUR, SPECIES, type Destination} from '../config/balance';
import type {GameState} from '../state/types';

export interface Memory {key: string; at: number; kind: 'birth' | 'friendship' | 'travel' | 'discovery' | 'event'; text: string}
export interface CozyState {
  bonds: {a: string; b: string; duration: number; celebrated: boolean}[];
  album: Memory[];
  souvenirs: {destination: Destination; visits: number}[];
  discoveries: string[];
  events: {id: string; progress: number; completed: boolean}[];
}
export const FRIENDSHIP_TIME = 6 * HOUR;
export function cozyState(s: GameState): CozyState {
  return s.cozy ??= {bonds: [], album: [], souvenirs: [], discoveries: [], events: []};
}
export function recordMemory(s: GameState, memory: Memory): void {
  const c = cozyState(s);
  if (c.album.some(m => m.key === memory.key)) return;
  c.album.push(memory); c.album = c.album.slice(-80);
}
const name = (s: GameState, id: string) => {const r = s.rabbits.find(r => r.id === id); return r ? r.name ?? SPECIES[r.species].name : 'Un lapin';};
/** Accumulate only time actually shared in an enclosure, with no economic effects. */
export function advanceFriendships(s: GameState, elapsed: number, now: number): void {
  if (!s.cozy && (elapsed <= 0 || s.rabbits.length < 2)) return;
  const c = cozyState(s), ids = new Set(s.rabbits.map(r => r.id));
  c.bonds = c.bonds.filter(b => ids.has(b.a) && ids.has(b.b));
  const busy = new Set([...(s.travel?.trips.map(t => t.rabbitId) ?? []), ...s.buildings.flatMap(b => b.breeding?.parents ?? [])]);
  const groups = new Map<string, string[]>();
  for (const r of s.rabbits) if (!busy.has(r.id)) {const list = groups.get(r.enclosureId) ?? []; list.push(r.id); groups.set(r.enclosureId, list);}
  for (const list of groups.values()) for (let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++) {
    const [a,b]=[list[i],list[j]].sort(); let bond=c.bonds.find(x=>x.a===a&&x.b===b);
    if(!bond){if(c.bonds.length>=512)continue; bond={a,b,duration:0,celebrated:false};c.bonds.push(bond);}
    const before=bond.duration;
    bond.duration=Math.min(FRIENDSHIP_TIME, bond.duration+Math.max(0,Math.min(elapsed,FRIENDSHIP_TIME)));
    // Dated at the instant the shared time reaches the threshold, so splitting the advance cannot move the memory.
    if(bond.duration>=FRIENDSHIP_TIME&&!bond.celebrated){bond.celebrated=true;recordMemory(s,{key:`friend:${a}:${b}`,at:now-elapsed+(FRIENDSHIP_TIME-before),kind:'friendship',text:`${name(s,a)} et ${name(s,b)} sont devenus complices.`});}
  }
}
export function bestFriend(s: GameState, id: string): string | null {
  const candidates=(s.cozy?.bonds ?? []).filter(b=>b.celebrated&&(b.a===id||b.b===id));
  candidates.sort((a,b)=>b.duration-a.duration||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));
  const bond=candidates[0]; return bond ? bond.a===id?bond.b:bond.a : null;
}
export function rememberBirth(s: GameState,id: string,now: number): void {
  recordMemory(s,{key:`birth:${id}`,at:now,kind:'birth',text:`Bienvenue à ${name(s,id)} dans la prairie !`});
}
export function rememberTrip(s: GameState,id: string,destination: Destination,startedAt:number,now:number): void {
  const c=cozyState(s);let souvenir=c.souvenirs.find(x=>x.destination===destination);
  if(!souvenir){souvenir={destination,visits:0};c.souvenirs.push(souvenir);} souvenir.visits=Math.min(9999,souvenir.visits+1);
  recordMemory(s,{key:`trip:${id}:${startedAt}`,at:now,kind:'travel',text:`${name(s,id)} rapporte un souvenir de ${destination}.`});
}
