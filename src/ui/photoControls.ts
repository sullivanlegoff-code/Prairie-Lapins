/** Photos are downloaded on this device, never inserted in the cloud save. */
export function mountPhotoControls(parent: HTMLElement, capture: () => Promise<Blob>) {
  const root=document.createElement('div'),button=document.createElement('button'),link=document.createElement('a'),message=document.createElement('span');
  root.id='photo-controls';root.hidden=true;button.type='button';button.textContent='Prendre la photo';link.textContent='Enregistrer ou ouvrir la photo';link.hidden=true;link.target='_blank';link.rel='noopener';message.setAttribute('role','status');root.append(button,link,message);parent.append(root);
  let url:string|null=null,generation=0;
  const clear=()=>{generation++;if(url)URL.revokeObjectURL(url);url=null;link.hidden=true;link.removeAttribute('href');message.textContent='';button.disabled=false;};
  const take=async()=>{clear();const current=generation;button.disabled=true;message.textContent='La photo se prépare…';try{const blob=await capture();if(current!==generation)return;url=URL.createObjectURL(blob);link.href=url;link.download=`prairie-lapins-${new Date().toISOString().slice(0,10)}.png`;link.hidden=false;message.textContent='Ta photo est prête. Elle reste sur ton appareil.';}catch{if(current===generation)message.textContent='La photo n’a pas pu être prise. Réessaie.';}finally{if(current===generation)button.disabled=false;}};
  button.addEventListener('click',take);
  return {setVisible(active:boolean){root.hidden=!active;if(!active)clear();},dispose(){clear();button.removeEventListener('click',take);root.remove();}};
}
