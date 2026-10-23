import {act} from '../src/simulation';
import type {GameState} from '../src/state/types';
export function sendToNursery(s:GameState,now=s.lastSimulatedAt){const n=s.buildings.find(b=>b.kind==='nest')!;const r=act(s,{type:'transferBirth',id:n.id,birthId:n.breeding!.birth.id},now);if(!r.ok)throw Error(r.reason);return r.state;}
