import {jobKey, initiationAvailable} from '../simulation/initiation';
import {firstNurseryBaby, nurseryBuilding, nurseryFull} from '../simulation/nursery';
import type {GameState} from '../state/types';
import type {Preferences} from './preferences';
export type GuideTarget = 'camera' | 'snowShop' | 'rabbitShop' | 'reward' | 'paille' | 'farmShop' | 'farm' | 'collection' | 'neige' | 'nest' | 'nursery' | 'goals';
export interface GuideStep {id: string; title: string; text: string; target: GuideTarget; done?: boolean; buildingId?: string}
/** Interface guidance only. Rewards and accomplishments remain owned by missions/simulation. */
export function guidedStep(s: GameState, p: Preferences, now: number, staged = true): GuideStep {
  if (s.startCourse === 'paille-solo') return staged ? pailleStep(s,p,now) : soloStep(s,p,now);
  const step = (id: string, title: string, text: string, target: GuideTarget): GuideStep => ({id, title, text, target});
  const events = s.missions.events;
  if (events.welcome > 0) return {...step('free', 'Ta prairie, tes envies', 'Collection, affection, nouveaux habitats : choisis librement. Décorer et agrandir sont facultatifs.', 'goals'), done: true};
  if (!p.intro || !p.guideCamera) return step('welcome', 'Bienvenue dans la prairie', 'Glisse pour explorer, pince pour zoomer. Recentrer retrouve ta prairie. Ton habitat, Paille, Neige, le nid et la nurserie sont offerts.', 'camera');
  const paille = s.rabbits.find(r => r.species === 'paille');
  const neige = s.rabbits.find(r => r.species === 'neige');
  const breeding = s.buildings.find(b => b.breeding)?.breeding;
  const baby = firstNurseryBaby(nurseryBuilding(s)), full = nurseryFull(nurseryBuilding(s));
  // Later successful actions supersede feeding steps even if an old parent has left the game.
  if (!events.breed && !breeding && !baby) {
    if (paille && paille.affection < 2 && s.grass < 2) return step('food', 'De l’herbe pour Paille', 'Il manque de l’herbe. Réclame une mission prête ou produis-en à la ferme ; nourrir reste facultatif, sans faim à gérer.', s.buildings.some(b => b.kind === 'farm') ? 'farm' : 'farmShop');
    if (paille && paille.affection < 2) return step('paille', 'Un premier repas pour Paille', 'Ouvre sa fiche puis nourris-le jusqu’à affection 2. L’herbe augmente l’affection ; aucune faim ni entretien obligatoire.', 'paille');
    const farm = s.buildings.find(b => b.kind === 'farm' && b.order && b.order.endsAt <= now) ?? s.buildings.find(b => b.kind === 'farm' && b.order) ?? s.buildings.find(b => b.kind === 'farm');
    if (!farm) return step('farmShop', 'Notre première ferme', 'Achète une ferme pour 60 pattes, choisis une empreinte libre puis valide. Annuler ne dépense rien.', 'farmShop');
    if (!farm.order && !events.collectOrder) return step('production', 'Une petite production', 'La petite production coûte 10 pattes : 20 herbes après 5 minutes. Le bouton ne lance rien à ta place.', 'farm');
    if (!p.guideCollection) return step('collection', 'Une collection à découvrir', 'Paille et Neige sont connus. Les silhouettes représentent les espèces à découvrir ; aucune urgence pendant la production.', 'collection');
    if (!events.collectOrder) {
      const aided = initiationAvailable(s,farm.id,'order',jobKey(farm,'order') ?? '');
      return {...step('harvest', 'Récolter l’herbe', farm.order && farm.order.endsAt > now ? `Tu peux attendre sa fin normale et consulter la collection.${aided ? ' La ferme affiche le compte à rebours et propose aussi une aide gratuite facultative.' : ''} La récolte reste manuelle.` : 'Ton herbe est prête : ouvre la ferme et récolte-la.', 'farm'), buildingId:farm.id};
    }
    if (neige && neige.affection < 2 && s.grass < 2) return step('food', 'De l’herbe pour Neige', 'Il manque de l’herbe. Réclame une mission prête ou lance une autre production ; aucune dépense automatique.', 'farm');
    if (neige && neige.affection < 2) return step('neige', 'Le repas de Neige', 'Nourris Neige jusqu’à affection 2. Les deux individus pourront alors devenir parents.', 'neige');
    return step('breed', 'Deux parents au nid', 'Choisis Paille et Neige puis lance gratuitement : 0 patte et 0 cœur. La reproduction dure 20 minutes.', 'nest');
  }
  if (breeding) {
    return step('transfer', 'Vers la nurserie', breeding.endsAt > now ? 'Les parents restent au nid jusqu’au transfert manuel. Tu peux attendre 20 minutes ou utiliser l’aide gratuite si elle est disponible dans le nid ; envoie ensuite le lapereau pour faire rentrer les parents.' : full ? 'La nurserie est pleine. Libère une place en accueillant un lapereau prêt ; les parents et le nouveau lapereau attendent sans perte.' : 'Envoie manuellement le lapereau dans la nurserie. Sa croissance commence au clic, les parents rentrent et le nid se libère.', breeding.endsAt <= now && full ? 'nursery' : 'nest');
  }
  if (baby) return step('welcomeBirth', 'Notre première naissance', baby.readyAt > now ? 'Le lapereau grandit dans la nurserie. Tu peux attendre ou utiliser son aide gratuite si elle est disponible. Son espèce reste secrète jusqu’à la fin de croissance ; l’accueil reste manuel.' : 'Accueille le lapereau dans un habitat compatible. Le parcours se termine avec cet accueil.', 'nursery');
  // Imported histories can lack active jobs: do not create an individual or infer a birth.
  return step('breed', 'Une naissance à accueillir', 'Consulte le nid pour préparer une reproduction, ou la nurserie si un lapereau y attend. Aucune espèce particulière n’est obligatoire.', 'nest');
}

/** New starts share all commands, jobs and rewards with the existing course. */
function soloStep(s: GameState, p: Preferences, now: number, skipFarm = false): GuideStep {
  const step=(id:string,title:string,text:string,target:GuideTarget):GuideStep=>({id,title,text,target});
  const e=s.missions.events, nest=s.buildings.find(b=>b.kind==='nest'), baby=firstNurseryBaby(nurseryBuilding(s)), full=nurseryFull(nurseryBuilding(s));
  if(e.welcome) return {...step('free','Ta prairie, tes envies',`Collection, affection et nouveaux habitats : choisis librement. Décorer et agrandir restent facultatifs.`,'goals'),done:true};
  if(!p.intro || !p.guideCamera) return step('welcome','Bienvenue dans la prairie','Rencontre Paille ! Glisse pour explorer, pince pour zoomer ; Recentrer retrouve la prairie. Son habitat, le nid et la nurserie sont offerts.','camera');
  const snowHome=s.buildings.find(b=>b.habitat?.type==='neige');
  const missing=(price:number)=>s.pattes<price ? ` Il manque ${price-s.pattes} pattes. Réclame les récompenses disponibles ou récolte les revenus réellement produits ; aucun achat automatique.` : '';
  if(!e.breed && !nest?.breeding && !baby) {
    if(!snowHome) return step('snowShop','Un habitat pour Neige','Boutique → Habitats : choisis le Jardin enneigé pour 200 pattes puis confirme une empreinte libre. Annuler ne dépense rien.'+missing(200),'snowShop');
    if(!s.discovered.includes('neige')) return step('rabbitShop','Accueillir Neige','Boutique → Lapins : choisis Neige pour 80 pattes, puis son habitat et confirme l’achat.'+missing(80),'rabbitShop');
    if(!s.missions.claimed.includes('welcome-snow')) return step('snowReward','La bienvenue de Neige','Réclame les 50 pattes de l’accueil de Neige. Cette récompense unique prépare la ferme et la production.','reward');
    const paille=s.rabbits.find(r=>r.species==='paille'), neige=s.rabbits.find(r=>r.species==='neige');
    const hungry=paille && paille.affection<2 ? paille : neige && neige.affection<2 ? neige : null;
    if(hungry) return step(hungry.species,`Le repas de ${hungry.species==='paille'?'Paille':'Neige'}`,s.grass<2 ? 'Il manque de l’herbe. Réclame une mission prête ou produis-en à la ferme. Nourrir reste facultatif, sans faim ni entretien obligatoire.' : 'Ouvre sa fiche et nourris-le jusqu’à affection 2. L’herbe augmente l’affection, sans faim ni entretien obligatoire.',s.grass<2 ? (s.buildings.some(b=>b.kind==='farm')?'farm':'farmShop') : hungry.species==='paille'?'paille':'neige');
    return step('breed','Deux parents au nid','Choisis Paille et Neige puis lance gratuitement. Ils apparaissent au nid ; leurs places et revenus restent réservés dans leurs habitats.','nest');
  }
  if(nest?.breeding) {
    // A completed breeding must propose the useful manual transfer, never another farm timer.
    if(!skipFarm && nest.breeding.endsAt>now && !e.collectOrder) {
      const farm=s.buildings.find(b=>b.kind==='farm' && b.order && b.order.endsAt<=now) ?? s.buildings.find(b=>b.kind==='farm' && b.order) ?? s.buildings.find(b=>b.kind==='farm');
      if(!farm) return step('farmShop','Une ferme pendant l’attente','Les parents sont au nid et gardent leurs places. Achète une ferme pour 60 pattes pendant leurs 20 minutes d’attente.'+missing(60),'farmShop');
      if(!farm.order) return step('production','Une petite production','Produis 20 herbes pour 10 pattes, après 5 minutes. La récolte reste manuelle.'+missing(10),'farm');
      if(!p.guideCollection) return step('collection','Une collection à découvrir','Paille et Neige sont connus. Les silhouettes montrent les autres espèces à découvrir ; aucune urgence pendant l’attente.','collection');
      return {...step('harvest','Récolter l’herbe',farm.order.endsAt>now?'Consulte le compte à rebours dans la ferme. Attends la fin normale ou choisis l’aide gratuite facultative ; récolte ensuite manuellement.':'L’herbe est prête : ouvre la ferme et récolte-la.','farm'),buildingId:farm.id};
    }
    return step('transfer','Vers la nurserie',nest.breeding.endsAt>now?'Le nid affiche le compte à rebours. Attends ou termine gratuitement ce délai si l’aide est disponible ; le transfert reste manuel.':full?'La nurserie est pleine : accueille un lapereau prêt. Les parents attendent au nid sans perte.':'Envoie manuellement le lapereau dans la nurserie. La croissance commence maintenant ; les parents rentrent chacun dans leur habitat.',nest.breeding.endsAt<=now && full?'nursery':'nest');
  }
  if(baby) return step('welcomeBirth','Notre première naissance',baby.readyAt>now?'L’espèce reste secrète pendant la croissance. Attends ou utilise l’aide gratuite liée à cette naissance ; l’accueil reste manuel.':'Choisis un habitat compatible pour accueillir le lapereau. Le lapereau peut rejoindre un habitat Paille ou Neige.','nursery');
  return step('breed','Une naissance à accueillir','Consulte le nid pour préparer une reproduction. Aucune espèce particulière n’est obligatoire.','nest');
}

/** Scripted solo course: actual achievements supersede any obsolete instructions. */
function pailleStep(s: GameState, p: Preferences, now: number): GuideStep {
  const e = s.missions.events, nest = s.buildings.find(b => b.kind === 'nest');
  const baby = firstNurseryBaby(nurseryBuilding(s));
  if (e.welcome || e.breed || nest?.breeding || baby) {
    // Feeding and farming are no longer prerequisites once the birth is under way.
    return soloStep(s, {...p, intro: true, guideCamera: true, guideCollection: true}, now, true);
  }
  const step = (id: string, title: string, text: string, target: GuideTarget): GuideStep => ({id, title, text, target});
  const missing = (price: number) => s.pattes < price ? ` Il manque ${price - s.pattes} pattes. Réclame une récompense ou récolte les revenus disponibles.` : '';
  if (!s.buildings.some(b => b.habitat?.type === 'neige')) return step('snowShop', 'Un habitat pour Neige', 'Boutique → Habitats : achète le Jardin enneigé (200 pattes), puis place-le sur une empreinte libre.' + missing(200), 'snowShop');
  if (!s.discovered.includes('neige')) return step('rabbitShop', 'Accueillir Neige', 'Boutique → Lapins : accueille Neige (80 pattes) dans le Jardin enneigé.' + missing(80), 'rabbitShop');
  if (!s.missions.claimed.includes('welcome-snow')) return step('snowReward', 'La bienvenue de Neige', 'Réclame les 50 pattes de la mission « Accueillir Neige » pour préparer notre ferme.', 'reward');
  const farm = s.buildings.find(b => b.kind === 'farm' && b.order && b.order.endsAt <= now) ?? s.buildings.find(b => b.kind === 'farm' && b.order) ?? s.buildings.find(b => b.kind === 'farm');
  if (!farm) return step('farmShop', 'Notre ferme', 'Boutique → Bâtiments : achète et place la ferme (60 pattes).' + missing(60), 'farmShop');
  if (!e.collectOrder) {
    if (!farm.order) return step('production', 'De l’herbe pour nous', 'Lance la petite production : 10 pattes pour 20 herbes en 5 minutes.' + missing(10), 'farm');
    return {...step('harvest', 'Récolter notre herbe', farm.order.endsAt > now ? 'Dans la ferme, utilise l’aide gratuite de découverte ou attends, puis récolte les 20 herbes.' : 'Notre herbe est prête ! Récolte les 20 herbes dans la ferme.', 'farm'), buildingId: farm.id};
  }
  for (const species of ['paille', 'neige'] as const) {
    const r = s.rabbits.find(r => r.species === species);
    if (r && r.affection < 2) return step(species, `Le repas de ${r.name || SPECIES_NAME[species]}`, s.grass < 2 ? 'Il manque de l’herbe. Lance une production ou réclame une récompense.' : 'Ouvre la fiche de ce lapin et touche Nourrir jusqu’à affection 2.', s.grass < 2 ? 'farm' : species);
  }
  return step('breed', 'Retrouvons-nous au nid', `Touche le nid → Croiser, choisis ${s.rabbits.find(r => r.species === 'paille')?.name || 'Paille'} à gauche et Neige à droite, puis le bouton rouge Croiser. Les deux parents doivent être présents et à affection 2.`, 'nest');
}
const SPECIES_NAME = {paille: 'Paille', neige: 'Neige'};
