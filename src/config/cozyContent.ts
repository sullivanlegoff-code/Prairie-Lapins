import type {DecorationId} from './decorations';
import type {Destination} from './balance';
export const DECORATION_COLLECTIONS: {id:string;name:string;description:string;items:DecorationId[]}[] = [
 {id:'lecture',name:'Coin lecture',description:'Des histoires à partager à l’ombre.',items:['tree','small-bookcase','large-bookcase']},
 {id:'gouter',name:'Goûter au jardin',description:'Une pause douce après la récolte.',items:['hay-bale','honey-pot','bush']},
 {id:'vacances',name:'Douces vacances',description:'Un petit coin de vacances dans ta prairie.',items:['coconut-palm','otter-plush','bunny-slippers']},
 {id:'fete',name:'Jour de fête',description:'Des lumières et des chemins pour se retrouver.',items:['birthday-candle','hanukkah-menorah','dirt-path']},
];
export const TRAVEL_STORIES: Record<Destination,readonly [string,string,string]> = {
 Londres:['Un ticket froissé du grand bus rouge.','Une feuille ramassée entre deux averses.','Une invitation pour le thé, avec une place pour toi.'],
 Vannes:['Un coquillage gardé au fond du sac.','Un dessin des maisons penchées.','Le souvenir d’un goûter face au port.'],
 'Le Caire':['Un grain de sable dans chaque chaussure.','Un croquis des grandes pyramides.','Une étoile observée au-dessus du désert.'],
 Hammamet:['Une carte du petit port bleu.','Un ruban couleur de soleil.','Le souvenir d’une promenade les pieds dans l’eau.'],
 'Le Lavandou':['Une fleur séchée entre deux pages.','Un galet poli par la mer.','Une carte qui sent encore les vacances.'],
 Bandol:['Un petit dessin de voilier.','Un souvenir de sieste à l’ombre.','Une carte du coucher de soleil sur le port.'],
 Lille:['Un billet de promenade dans le vieux quartier.','Une recette de gaufres griffonnée.','Une photo souvenir de la grande place.'],
 Paris:['Un ticket de métro soigneusement plié.','Un dessin de la tour aperçue au loin.','Un souvenir de pique-nique au bord de l’eau.'],
 Marrakech:['Un ruban aux couleurs du marché.','Un dessin des jardins au petit matin.','Une carte parfumée à la menthe.'],
};
export const COZY_EVENTS = [
 {id:'harvest',name:'Fête des récoltes',description:'Récolte six cultures pour garder la carte du grand goûter.',action:'collectOrder',target:6},
 {id:'welcome',name:'Saison des retrouvailles',description:'Accueille trois lapereaux ou retours de voyage pour compléter la carte des retrouvailles.',action:'welcome',target:3},
 {id:'garden',name:'Jardin en fête',description:'Acquiers trois nouveaux objets pour garder la carte du jardin en fête.',action:'buyDecoration',target:3},
] as const;
export const DISCOVERIES = [
 {id:'lost-slippers',name:'Les chaussons égarés',text:'Quelqu’un est reparti pieds nus après sa sieste…',art:'bunny-slippers'},
 {id:'forgotten-book',name:'Le livre oublié',text:'Une page est cornée : l’histoire reprendra demain.',art:'small-bookcase'},
 {id:'little-feast',name:'Le goûter secret',text:'Il reste juste assez de miel pour un dernier invité.',art:'honey-pot'},
 {id:'sleepy-plush',name:'La peluche voyageuse',text:'Elle aussi avait envie de voir un autre coin de prairie.',art:'otter-plush'},
 {id:'birthday-wish',name:'Un vœu discret',text:'Une petite bougie attend quelqu’un à célébrer.',art:'birthday-candle'},
 {id:'hay-trail',name:'La piste de foin',text:'Quelques brins racontent une course particulièrement joyeuse.',art:'hay-bale'},
] as const;
export const currentCozyEvent = (now:number) => COZY_EVENTS[new Date(now).getUTCMonth()%COZY_EVENTS.length];
export const currentDiscovery = (now:number) => DISCOVERIES[Math.floor(now/(4*60*60*1000))%DISCOVERIES.length];
