import {COZY_EVENTS,currentCozyEvent,currentDiscovery} from '../config/cozyContent';
import type {Command,GameState,Refusal} from '../state/types';
import {cozyState,recordMemory} from './cozy';
import {decorationPlacementReason} from './decorations';
export function discoveryAvailable(s:GameState,now:number,id:string):boolean {return currentDiscovery(now).id===id && !(s.cozy?.discoveries.includes(id));}
export function claimDiscovery(s:GameState,now:number,id:string):boolean {
 if(!discoveryAvailable(s,now,id))return false;const d=currentDiscovery(now);cozyState(s).discoveries.push(id);
 recordMemory(s,{key:`discovery:${id}`,at:now,kind:'discovery',text:`${d.name} : ${d.text}`});return true;
}
export function advanceCozyEvent(s:GameState,command:Command,now:number):void {
 const event=currentCozyEvent(now);
 const matches=event.id==='welcome' ? command.type==='welcome'||command.type==='claimTrip' : command.type===event.action;
 if(!matches)return;
 const c=cozyState(s);let p=c.events.find(e=>e.id===event.id);
 if(!p){p={id:event.id,progress:0,completed:false};c.events.push(p);}if(p.completed)return;
 p.progress=Math.min(event.target,p.progress+1);
 if(p.progress===event.target){p.completed=true;recordMemory(s,{key:`event:${event.id}`,at:now,kind:'event',text:`${event.name} : ta carte souvenir est complète !`});}
}
/** Validate the entire translated group on a detached state, including mutual footprints. */
export function translatedDecorations(s:GameState,ids:readonly string[],dx:number,dy:number):{reason:Refusal|null;decorations:GameState['decorations']} {
 const invalid=()=>({reason:'INVALID_CHOICE' as const,decorations:s.decorations});
 if(!ids.length||ids.length>64||new Set(ids).size!==ids.length||!Number.isSafeInteger(dx)||!Number.isSafeInteger(dy)||(!dx&&!dy))return invalid();
 const draft=structuredClone(s);const moved=draft.decorations.filter(d=>ids.includes(d.id));
 if(moved.length!==ids.length||moved.some(d=>d.location.kind!=='outside'))return invalid();
 for(const d of moved)if(d.location.kind==='outside'){d.location.x+=dx;d.location.y+=dy;}
 for(const d of moved){const reason=decorationPlacementReason(draft,d.id,d.location);if(reason)return{reason,decorations:s.decorations};}
 return{reason:null,decorations:draft.decorations};
}
export {COZY_EVENTS};
