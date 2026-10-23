import {levelUnlockContents} from '../simulation/levelRights';
import {newlyPurchasableRecipes} from '../simulation/recipes';
import {SPECIES} from '../config/balance';
import {DECORATIONS} from '../config/decorations';
import {HABITATS} from '../config/habitats';
import type {GameController, ConfirmedProgressionGain} from '../application/GameController';
import {ProgressionNotices, mergeLevelNotices, type LevelNotice} from '../ui/progressionNotices';

/** Presentation of confirmed commands only. Snapshots solely select the current party. */
export function mountProgressionFeedback(controller: GameController, preferenceKey: string,
  animateBar: (gain: ConfirmedProgressionGain) => void) {
  const host=document.getElementById('player-xp-feedback')!,dialog=document.getElementById('player-level-dialog') as HTMLDialogElement;
  const title=document.getElementById('level-up-title')!,range=document.getElementById('level-up-range')!,reward=document.getElementById('level-up-reward')!;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),format=new Intl.NumberFormat('fr-FR');
  const abort=new AbortController(),options={signal:abort.signal};
  let notices: ProgressionNotices | null=null,identity:string|undefined,active:LevelNotice|null=null,xp=0;
  let pumpTimer: ReturnType<typeof setTimeout>|undefined,hideTimer: ReturnType<typeof setTimeout>|undefined;
  function cancelEffects(){clearTimeout(pumpTimer);clearTimeout(hideTimer);pumpTimer=undefined;xp=0;host.hidden=true;active=null;if(dialog.open)dialog.close();}
  function busy(){return document.body.classList.contains('arranging') || document.body.classList.contains('photo-mode') ||
    !document.getElementById('game-panel')!.hidden || !!document.querySelector('dialog[open]:not(#player-level-dialog)') ||
    getComputedStyle(document.getElementById('portrait-notice')!).display!=='none';}
  function pump(){
    pumpTimer=undefined;if(busy()||!notices)return;
    const pending=notices.take();if(!pending)return;
    active=mergeLevelNotices(active,pending);
    title.textContent=`Niveau ${active.toLevel} atteint !`;
    range.textContent=active.toLevel-active.fromLevel>1 ? `Niveau ${active.fromLevel} → ${active.toLevel}` : '';
    range.hidden=!range.textContent;
    reward.textContent=`${format.format(active.heartsGranted)} ${active.heartsGranted===1?'cœur déjà reçu':'cœurs déjà reçus'}.`;
    const unlocks=document.getElementById('level-up-unlocks')!;
    unlocks.replaceChildren();
    const state=controller.getSnapshot().state;
    const recorded=new Set((active.unlocks??[]).map(target=>JSON.stringify(target)));
    const contents=state?levelUnlockContents(state,active.fromLevel,active.toLevel).filter(target=>recorded.has(JSON.stringify(target))):[];
    unlocks.hidden=!contents.length;
    if(contents.length){
      const heading=document.createElement('h3');heading.textContent='Déblocages';unlocks.append(heading);
      const list=document.createElement('ul');
      for(const target of contents){
        const item=document.createElement('li');
        if(target.family==='species')item.textContent=`${SPECIES[target.id].name} · ${target.action==='purchase'?'Disponible en boutique':'Peut désormais être obtenue par reproduction, sous réserve de ses conditions.'}`;
        else if(target.family==='extension')item.textContent=`Extension ${target.rank} · Possibilité d’acheter une extension supplémentaire`;
        else if(target.family==='decoration')item.textContent=`${DECORATIONS[target.id].name} · Disponible en boutique`;
        else if(target.family==='habitatUpgrade')item.textContent=`${HABITATS[target.id].name} : amélioration au niveau ${target.toLevel} disponible · possibilité payante`;
        else if(target.family==='habitatPurchase')item.textContent=`${HABITATS[target.id].name} · Disponible en boutique`;
        list.append(item);
      }
      const recipes=state?newlyPurchasableRecipes(state,contents):0;
      if(recipes){const item=document.createElement('li');item.dataset.recipeShop=String(recipes);item.textContent=`${recipes>1?'Recettes':'Recette'} en boutique · ${recipes}`;list.append(item);}
      unlocks.append(list);
    }
    if(!dialog.open)dialog.showModal();
  }
  function schedule(){clearTimeout(pumpTimer);pumpTimer=setTimeout(pump,250);}
  const unsubscribe=controller.subscribe(snapshot=>{
    if(snapshot.presentationId!==identity){cancelEffects();identity=snapshot.presentationId;notices=identity?new ProgressionNotices(preferenceKey+'.progression',identity):null;schedule();}
  });
  const stopGains=controller.onProgressionGain(gain=>{
    if(gain.presentationId!==identity)return;
    animateBar(gain);xp+=gain.xpGained;host.textContent=`+${format.format(xp)} XP`;host.hidden=false;
    host.classList.toggle('xp-still',reduced.matches);host.classList.remove('xp-rise');
    if(!reduced.matches){void host.offsetWidth;host.classList.add('xp-rise');}
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{host.hidden=true;xp=0;},1500);
    if(gain.rewardedLevels.length){const state=controller.getSnapshot().state;notices?.add({fromLevel:gain.fromLevel,toLevel:gain.toLevel,heartsGranted:gain.heartsGranted,unlocks:state?levelUnlockContents(state,gain.fromLevel,gain.toLevel):[]});}
    schedule();
  });
  document.getElementById('continue-level-up')!.addEventListener('click',()=>dialog.close(),options);
  dialog.addEventListener('close',()=>{active=null;schedule();},options);
  for(const event of ['pointerdown','pointermove','pointerup','wheel','touchstart','touchmove','touchend'])dialog.addEventListener(event,e=>e.stopPropagation(),options);
  window.addEventListener('resize',schedule,options);
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  observer.observe(document.getElementById('game-panel')!,{attributes:true,attributeFilter:['hidden','class','data-view']});
  for(const d of document.querySelectorAll('dialog'))observer.observe(d,{attributes:true,attributeFilter:['open']});
  return ()=>{unsubscribe();stopGains();abort.abort();observer.disconnect();cancelEffects();};
}
