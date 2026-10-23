// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {SPECIES} from '../src/config/species';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame} from '../src/state/initial';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import {NEW_RARES} from './rabbit-art-fixtures';
const cleanup:(()=>void)[]=[];
afterEach(()=>{cleanup.splice(0).forEach(f=>f());vi.unstubAllGlobals();});
it.each([false,true])('collection descriptions are gated by discovery (discovered=%s)',discovered=>{
  document.body.innerHTML=html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g,'');
  document.getElementById('loading-screen')!.hidden=true;document.getElementById('app')!.inert=false;
  vi.stubGlobal('requestAnimationFrame',()=>0);vi.stubGlobal('cancelAnimationFrame',()=>{});
  const s=createGame(0);s.recipeBook.push(...NEW_RARES.map(r=>r.id)as never[]);if(discovered)s.discovered.push(...NEW_RARES.map(r=>r.id)as never[]);
  const data=new Map([[SAVE_KEY,encodeGame(s)]]);const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},()=>0);
  const prefs=new PreferenceStore('test-frisket-icy');prefs.set({tutorial:false});
  const ui=new GameUI(c,{setRabbitPurchase:vi.fn(),setPlacement:vi.fn(),setDecorationSelection:vi.fn(),setPhoto:vi.fn(),setArrangement:vi.fn(),setExpansion:vi.fn(),setDecorationGhost:vi.fn(),setDecorationPlacement:vi.fn(),recenter:vi.fn()} as unknown as MeadowScene,()=>0,prefs);cleanup.push(()=>{ui.dispose();c.dispose();});
  ui.open({kind:'collection'});const text=document.getElementById('panel-content')!.textContent!;
  for(const {id} of NEW_RARES as readonly {id:keyof typeof SPECIES}[]){
    if(discovered){expect(text).toContain(SPECIES[id].name);expect(text).toContain(SPECIES[id].description);expect(document.querySelector(`img[data-rabbit-art="${id}"]`)).not.toBeNull();}
    else {expect(text).not.toContain(SPECIES[id].name);expect(text).not.toContain(SPECIES[id].description);expect(document.querySelector(`img[data-rabbit-art="${id}"]`)).toBeNull();}
  }
});
