import type {GameState,Refusal} from '../state/types';
import {decorationPlacementReason} from './decorations';
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
