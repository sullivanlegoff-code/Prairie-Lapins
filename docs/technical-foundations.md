# Fondations techniques v6

Le pipeline actuel des sprites, les calculs DPR 3, le chargement différé de la scène et les mesures T1 sont décrits dans [Résolution des images](image-resolution.md). Les maîtres approuvés sont conservés dans `assets-source/` ; `public/` contient leurs dérivés contrôlés.

Le format de sauvegarde reste v6. Aucun changement de contenu, d’équilibrage, de dessin, de migration ou de clé de stockage. Les quinze espèces, neuf parcelles et douze objets extérieurs restent disponibles. Les comptes et Supabase restent en pause.

## Responsabilités et invariants

`config/` décrit les catalogues et paramètres ; les visuels restent associés aux identifiants stables. `simulation/` applique les règles sans Phaser, DOM, stockage ni horloge implicite dans les tests. `act` travaille sur une copie : un refus renvoie l’entrée intacte. `advance` gère séparément le temps monotone, les plafonds de revenus et le transfert du résultat déjà tiré vers la nurserie. Le contrôleur avance le temps avant une commande ; cette évolution indépendante peut donc survivre à son refus.

`GameController` possède l’état mutable et fournit des copies aux abonnés. L’interface et Phaser présentent cet état et émettent des commandes. Les devis réutilisent les conditions de la simulation ; celle-ci revalide coûts, disponibilités, cibles et clés de travaux. Une génération de session invalide les confirmations après tout import ou redémarrage réussi, même effectué directement par le contrôleur. Un remplacement refusé conserve la génération et la partie.

`persistence/json.ts` valide les entrées et les sauvegardes : ressources et horodatages sûrs, identifiants uniques, références valides, affection 1–20, habitats compatibles et non surchargés, centre acquis, bâtiments et empreintes décoratives sur terrain acquis sans collision, travaux et réservations de découverte cohérents, missions et récompenses cohérentes. Il n’y a pas de validation complète à chaque image. Les traces de tests utilisent cette frontière pour vérifier chaque état produit.

## Corrections ciblées

- Crédit commun avec contrôle des limites numériques pour revenus, récoltes, cadeaux, récompenses et reventes. Un dépassement conserve le travail ou le revenu disponible, sans crédit partiel.
- Allocation d’identifiant et échéances de nouveaux travaux contrôlées avant paiement et tirage. Le tirage reste unique au lancement ; les réservations, résultats et délais existants sont conservés.
- Détection d’un onglet obsolète avant une commande et par événement `storage`. Les commandes sont bloquées, l’état en mémoire reste exportable, aucun résultat aléatoire n’est tiré. Le listener est libéré à la fermeture du contrôleur.
- Notifications filtrées par clé et espace de stockage ; le laboratoire transmet uniquement ses clés préfixées.
- Confirmations fermées après remplacement et destruction de l’interface. Le cache anti-double pression conserve seulement sa fenêtre utile de 350 ms.
- Un nouveau départ réussi efface l’ancien compteur du message de conversion des objets intérieurs.

## Stockage et limites réelles

Les erreurs de lecture/écriture restent visibles. Toute commande réussie écrit son état complet avant adoption en mémoire (achats, ventes, récoltes, repas, reproduction, naissance, déplacements, placements, accélérations, missions, Cuisine, agrandissements). Un échec renvoie `ACTION_NOT_SAVED`, conserve l’état précédant la commande et affiche le message existant de refus et le statut de sauvegarde. Le temps avancé séparément reste en mémoire et sera sauvegardé lors d’un nouvel essai. Import et nouveau départ écrivent aussi avant de remplacer l’état.

**La comparaison lecture puis écriture de `localStorage` n’est pas une transaction entre onglets.** Deux onglets peuvent lire le même ancien contenu avant leurs écritures concurrentes ; les événements sont asynchrones et ne constituent pas un verrou. Les contrôles ajoutés arrêtent une session après un changement observé, mais ne promettent pas une exclusion mutuelle. Utiliser un seul onglet par partie ; en cas de conflit, exporter la copie en mémoire puis recharger. Aucun effacement global du stockage, aucune synchronisation automatique et aucun transfert normal/laboratoire.

## Vérifications reproductibles

`npm test` inclut les régressions et trois traces de 180 commandes avec graines 17, 104729 et 20261009 : achats, nourriture, reproduction, accélération, agrandissement, pose/rangement/vente, récompenses et refus. Après chaque étape : intégrité de l’entrée, validation v6, aller-retour de sauvegarde, nombre de tirages et équivalence d’une avance longue avec deux avances sans action. Une erreur imprime la graine et la trace. Ces tests utilisent une horloge injectée, sans attente réelle.

`docs/foundations-browser-check.cjs <url> [révision]` contrôle les événements réels entre deux onglets, le refus d’achat depuis l’onglet obsolète, son export, les ouvertures répétées de panneaux, la rotation du viewport, les événements de cycle de vie et l’isolation du laboratoire. La CI exécute également les parcours existants de migration, gestes, production et laboratoire. Le cache graphique du terrain est conservé ; aucun changement de rendu ne justifie une nouvelle campagne de mesures.

Ces essais Chromium ne remplacent pas un essai Safari sur iPhone. Parcours manuel :

1. Acheter/poser une décoration, la déplacer, annuler puis ranger/vendre avec confirmation ; recharger et vérifier l’inventaire et les pattes.
2. Lancer une reproduction, quitter Safari, revenir et tourner l’iPhone ; vérifier les délais, les panneaux et l’accueil sans double récompense.
3. Ouvrir deux onglets du même jeu, agir dans le second ; vérifier l’avertissement dans le premier, exporter sa copie puis le recharger. Une action au laboratoire doit laisser la partie normale intacte.

## Fiabilité du chargement et de l’horloge

Après 45 secondes, les étapes requises Images du jeu et Prairie deviennent lentes, sans échec définitif : « Connexion lente, le chargement continue… ». Une réussite tardive les termine et rend « Jouer » disponible. Une vraie erreur reste bloquante ; « Réessayer » recharge la page et relance tous les chargeurs.

Un recul d’horloge strictement supérieur à cinq minutes recale du même écart `lastSimulatedAt`, `nextHeartGiftAt`, la référence quotidienne, les débuts/fins de commandes et reproductions, les débuts/fins de croissance de chaque lapereau, ainsi que les deux dates embarquées dans chaque clé d’initiation (y compris les clés closes/utilisées). Le recensement repose sur `GameState` et le schéma strict v16 ; Cuisine stocke des indices de cycles, pas des dates. Durées restantes, indices, gains déjà acquis et droits consommés sont conservés ; aucun revenu ne rémunère le recul. Les petites corrections restent monotones. Les dates historiques recalées peuvent être antérieures à l’époque Unix : seuls ces champs de dates acceptent alors des entiers signés, sans changer les contraintes des ressources ni celles de l’heure courante.

Les régressions sont dans `tests/loading-screen.test.ts` (faux timers) et `tests/fond-fiabilite.test.ts` (écriture refusée sur les 30 commandes, retour d’horloge de deux jours, rechargement et absence de doubles gains).

Textes harmonisés : nombre d’espèces communes calculé depuis le catalogue ; envie gourmande de Paille à la place de sa faim ; vouvoiement dans la sélection Cuisine, ses prérequis, le choix d’habitat et son guidage tactile, les aides d’accélération, la validation du prénom, la félicitation de niveau et les consignes du parcours solo (achats, récompenses, ferme, récolte, repas, nid). Les répliques de Paille gardent leur tutoiement.

### Liste des textes modifiés (I5)

- Boutique : « Les 5 espèces communes à accueillir. » (nombre issu de `SHOP_SPECIES`, filtré sur la rareté commune).
- Paille : « J’ai une folle envie d’herbe à grignoter ! Tu me fais tourner la tête ! Bah ouais ! »
- Cuisine : « Choisissez votre lapin » ; « Vous avez besoin d’un lapin pour cuisiner. »
- Achat de lapin : « Choisissez un habitat » ; « Choisissez d’abord un habitat. » ; « Touchez un habitat encadré sur l’île, puis confirmez. Glissez ou pincez pour explorer. Aucun paiement avant confirmation. »
- Accélération : « Aide facultative, une seule fois pour ce travail. Vous pouvez toujours attendre. » ; « Les cœurs permettent aussi de terminer certains délais. Vous pouvez toujours attendre. »
- Prénom : « Choisissez un prénom : le champ est vide. » ; « Choisissez un prénom valide de 32 caractères maximum. » ; « Le prénom n’a pas pu être enregistré. Réessayez ou passez le tutoriel. »
- Niveau : « Bravo, votre prairie grandit avec vous ! »
- Guidage, manque de pattes : « Il manque {nombre} pattes. Réclamez une récompense ou récoltez les revenus disponibles. »
- Guidage, habitat Neige : « Boutique → Habitats : achetez le Jardin enneigé (200 pattes), puis placez-le sur une empreinte libre. »
- Guidage, Neige : « Boutique → Lapins : accueillez Neige (80 pattes) dans le Jardin enneigé. »
- Guidage, mission : « Réclamez les 50 pattes de la mission “Accueillir Neige” pour préparer notre ferme. »
- Guidage, ferme : « Boutique → Bâtiments : achetez et placez la ferme (60 pattes). »
- Guidage, production : « Lancez la petite production : 10 pattes pour 20 herbes en 5 minutes. »
- Guidage, attente : « Dans la ferme, utilisez l’aide gratuite de découverte ou attendez, puis récoltez les 20 herbes. »
- Guidage, récolte : « Notre herbe est prête ! Récoltez les 20 herbes dans la ferme. »
- Guidage, herbe manquante : « Il manque de l’herbe. Lancez une production ou réclamez une récompense. »
- Guidage, repas : « Ouvrez la fiche de ce lapin et touchez Nourrir jusqu’à affection 2. »
- Guidage, nid : « Touchez le nid → Croiser, choisissez {prénom de Paille} à gauche et Neige à droite, puis le bouton rouge Croiser. Les deux parents doivent être présents et à affection 2. »


## Fluidit? : voisins, carnet et tic passif (T2?T4)

La sc?ne conserve les voisins par habitat et r?utilise leur tableau de positions. L'ordre s?quentiel des mouvements reste identique : un voisin d?j? avanc? dans l'image est observ? dans sa nouvelle position. Un changement de profondeur chez n'importe quel r?sident d?clenche le tri de toute la couche, donc aussi des r?sidents immobiles ; la reconstruction de la couche la trie ?galement.

Le carnet groupe d'abord les individus par esp?ce. Les comptes de paires compatibles r?sultent des effectifs (n ? (n ? 1) / 2 pour une m?me esp?ce), sans examiner toutes les paires d'individus ni calculer leurs probabilit?s. Les sections repli?es ne construisent aucun bloc de paire. ? l'ouverture, trois paires au plus sont calcul?es, avec priorit? aux parents nourris et disponibles ; ? Voir plus ? calcule et affiche le reste. Les probabilit?s, restrictions et actions viennent des m?mes r?gles. L'?tat ouvert/repli? et le choix ? Voir plus ? survivent aux rafra?chissements et sont r?initialis?s au remplacement de partie. L'acc?s complet aux paires dans le mod?le reste disponible par un getter paresseux m?moris?.

Le contr?leur compare les seules mutations possibles de advance : heure simul?e, revenus, cycle quotidien, missions termin?es, aides closes et transition des droits historiques. Le registre des achats compare aussi ses identifiants. D?s qu'un changement est d?tect?, tout le r?sultat de advance est adopt?, y compris les dates de cadeaux, les commandes, les reproductions, tous les lapereaux et les cl?s d'initiation recal?es. Un recul de plus de cinq minutes change n?cessairement l'heure simul?e : apr?s chaque avance, celle-ci est au moins ?gale ? la r?f?rence quotidienne. Aucun de ces champs recal?s n'est perdu. Les cadeaux et accueils restent des actions manuelles.

La r?vision d'affichage change aux unit?s enti?res r?coltables, aux ?ch?ances et aux r?glements de missions/aides, ainsi qu'aux commandes r?ussies. Le panneau reste intact pendant un tic sans changement visible. Les compteurs, barres, boutons de cadeau et tarifs d'acc?l?ration sont projet?s chaque seconde sans reconstruction. La boucle des compteurs demande aussi une avance au franchissement d'une ?ch?ance (commande, reproduction, naissance, cadeau ou cycle quotidien) ; les actions deviennent disponibles d?s cette seconde. Une action durable reste ?crite avant adoption. Aucun tic identique ne r??crit la sauvegarde ; une avance d'horloge reste un changement durable m?me si son revenu n'atteint pas encore une unit? enti?re.

PROGRESSION est valid?e puis gel?e r?cursivement au chargement du module ; les configurations personnalis?es restent valid?es ? chaque requ?te. Le catalogue est construit au chargement, sans validation ajout?e aux requ?tes.

R?gressions : tests/notebook-performance.test.ts, tests/ui-dom.test.ts, tests/controller.test.ts et tests/decoration-scene.test.ts. La comparaison cibl?e est confront?e au r?sultat complet de advance pour tous les sc?narios, apr?s attente, ?ch?ances, renouvellement quotidien et recalage ; chaque ?tat sauvegard? est relu et compar?. Un test contr?le sp?cifiquement les dates de cadeau, de croissance et la cl? d'initiation apr?s recalage puis rechargement.

### Mesures navigateur T2?T4

Chromium 141.0.7390.37, PC Windows, viewport 1000 ? 700, DPR 1. Une seule instance ?ph?m?re, ferm?e apr?s les captures. Vite arr?t? ensuite. Baseline : seule la fonction update de HEAD est extraite par git show, transpil?e puis inject?e dans le module servi au navigateur. Les fichiers de travail et les ressources T1 restent identiques. Aucun stash. Le code extrait est conserv? dans %TEMP%/prairie-fond-3/baseline-update.js.

Pour chaque sc?nario : m?mes mouvements clon?s avant chaque s?rie, boucle du jeu suspendue, appels simul?s ? 60 Hz, 500 appels de chauffe par version puis dix s?ries altern?es de 1 000 appels. Moyenne du temps CPU par appel (hors rendu GPU, hors co?t du reset, sans capture pendant la mesure).

| Sc?nario | Lapins / groupes | Avant (ms) | Apr?s (ms) | Baisse |
|---|---:|---:|---:|---:|
| decorationDense | 7 / 1 | 0.00582 | 0.00419 | 28 % |
| habitats | 42 / 6 | 0.04885 | 0.02381 | 51 % |

Le sc?nario historique decorationDense contient seulement sept lapins dans un habitat ; habitats compl?te la mesure des groupes avec 42 lapins dans six habitats. Les valeurs tr?s courtes d?pendent du JIT et de la pr?cision de l?horloge ; elles ne mesurent ni la m?moire Safari ni les FPS sur iPhone.

Reproduction : d?marrer Vite sur 127.0.0.1:5199 avec --configLoader runner, puis PLAYWRIGHT_MODULE pointant vers Playwright et node scripts/check-t2-t4.cjs. Le script ferme Chromium dans finally. Rapports et captures hors d?p?t : %TEMP%/prairie-fond-3/update-report.json, notebook-open.png et notebook-pairs.png. Les deux captures ont ?t? regard?es : carnet lisible, section ouverte avec paires, section voisine repli?e. Z?ro erreur JavaScript ; une demande audio annul?e lors du changement de sc?nario (ERR_ABORTED), sans incidence sur la mesure.

Validation de cette moiti? : typecheck, 132 fichiers / 2 044 tests avec --maxWorkers 1 --testTimeout 30000 --configLoader runner, build --configLoader runner, git diff --check et les sept d?rivations --check (lapins, clignements, habitats, ?le, ?tapes d??le, d?corations, nurserie). Build r?ussi avec le signalement de chunk > 500 ko. Pas de commit, push ou staging. Les mesures PNG/RGBA de T1 restent dans docs/image-resolution.md ; aucun asset T1 modifi? par cette moiti?.
