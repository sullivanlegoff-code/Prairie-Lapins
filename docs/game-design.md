# Catalogue courant et migration v20 - 26 octobre 2026

Le registre `src/config/species.ts` contient 32 espèces. Les notes de publication plus bas sont des archives.

| Lapin | Types | Rareté | Recette | Niveau |
|---|---|---|---|---:|
| Dinono | feu + métal | épique | types feu + métal, affection 6, probabilité 5 %, connaissance 450 pattes, sans garantie | 1 |
| Lapin en Bouée | feu + métal | rare | types feu + métal, affection 2, garantie ordinaire, sans prix de connaissance | 1 |

Bouée remplace Dinono entre Boudinet et Egiiipte dans l'ordre du registre et du tirage. Dinono rejoint les épiques après Orange. Son illustration et sa description sont conservées ; aucun invariant n'impose le niveau 11 à tous les épiques, donc son niveau 1 reste inchangé.

Bouée : design original B « Cocktail » choisi par le propriétaire le 26 octobre 2026, lapin gris en vacances, bouée turquoise à pois blancs, lunettes de soleil en cœur roses et jus de fruit à ombrelle. Comme pour Orange, master détouré par `scripts/prepare-rabbit-masters.mjs` depuis le concept hors dépôt, puis sprite dérivé de 425 × 428 px ; largeur monde 54, ancrage 12 (bas de la bouée au sol), regard à droite. Sans clignement ni truffe animée à cause des lunettes de soleil.

Les trois espèces sans sprite sont retirées du catalogue. En v16-v19, `lunettes` devient `boudinet`, `feu-glace` devient `glassofeu` et `perroquet` devient `phoenix`. Le lecteur convertit les adultes, y compris en voyage, et les naissances du nid/de la nurserie ; il conserve identités, noms, affection, habitats, trajets et dates. Il nettoie découvertes, carnet et droits historiques de niveau ; seul un adulte possédé converti ajoute sa nouvelle espèce aux découvertes. Une naissance reste cachée jusqu'à l'accueil. Les réservations ordinaires de Dinono sont annulées sans retirer le lapereau ni rallonger une croissance déjà lancée.

Une Bouée déjà logée en habitat paille y reste : la validation applique la tolérance historique `LEGACY_TYPES`, déjà utilisée pour Magicien. Les nouveaux placements suivent les types courants feu/métal (`habitatAccepts`). L'objectif historique `first-rare` reste lisible et demande une espèce rare quelconque ; `all-ordinary-rares` suit les 20 rares garantissables du registre, sans Dinono. Les neuf rares survivants de la liste de revenus bonifiés gardent leur bonus, sans nouveau tirage.

Les exports sont en v20 ; la chaîne v16-v19 est conservée, les versions 1-15 restent incompatibles. Les fichiers de `docs/test-saves/` restent intacts.

---

# Économie courante — partie A, sauvegarde v20

### Dépenses permanentes en cœurs — 26 octobre 2026

Une ferme achetée est de niveau 1 : foin, pissenlit, trèfle, persil et laitue. Dès le niveau joueur 9, `upgradeFarm {id}` coûte 30 cœurs et ouvre fanes de carotte, fenouil, pomme, fraise et banane, avec le moulin du dessin historique. Les niveaux joueur de chaque culture restent requis. L’amélioration est immédiate, possible pendant une culture, sans pièces, complément ni accélération. `farmLevel?: 2` absent signifie niveau 1. Les deux dessins partagent les mêmes sillons et les mêmes pousses.

L’agence achetée est de niveau 1 (un voyage). `upgradeAgency {id, fromLevel}` ouvre le niveau 2 pour 40 cœurs (deux voyages et 25 nourriture par heure de voyage), puis le niveau 3 pour 120 cœurs (trois voyages, nourriture conservée). Aucun niveau joueur supplémentaire n’est exigé pour ces améliorations. La nourriture est figée au départ : améliorer l’agence ne change pas un voyage déjà lancé. Un voyage prêt occupe sa place jusqu’à son accueil individuel.

La statue du robot coûte 80 cœurs, sans pièces. Son ancien `price` reste une donnée historique ; `heartPrice` porte le prix actuel. Le reçu `paidHearts` interdit toute revente de ces nouveaux exemplaires. Les anciens exemplaires conservent leur reçu en pièces et leur règle historique de revente. Les autres décorations conservent leurs prix.

Migration v18 → v19 : toutes les fermes construites deviennent niveau 2 gratuitement, sans modifier leur culture ; `travel.trip` devient `travel.trips` (tableau vide en l’absence de voyage). L’accueil de Coco et les récompenses/dates des voyages restent acquis. Les migrations v16 et v17 rejoignent cette conversion par la chaîne existante ; les versions futures restent refusées. Les améliorations demandent confirmation dans l’interface et les refus ne débitent rien.

Référence exécutable : `src/config/` pour les valeurs, `src/simulation/` pour les règles. Joueur cible : trois sessions de cinq minutes à 8 h, 13 h et 20 h, avec une nuit de douze heures. Les travaux prêts attendent sans péremption et les habitats couvrent au moins la nuit de 12 h de revenus à pleine capacité et à l’affection 20.

Une partie neuve commence avec **350 pattes, 0 nourriture et 12 cœurs**, Paille affection 1 seul, habitat Paille, nid et nurserie offerts sur la parcelle sud-ouest (coordonnées fines 6,40 ; 2,36 ; 10,36). Le budget minimal du parcours est 350 − 200 − 80 + 50 − 60 − 10 = **50 pattes de marge**, avant les autres récompenses et revenus. Les anciens documents indiquant 10 herbes au départ, un départ central ou un format v8/v9 sont historiques.

| Valeur | Règle courante |
|---|---|
| Revenu commun | 10 + (affection − 1), soit 10–29 pattes/h |
| Revenu rare | 14 + (affection − 1), soit 14–33 pattes/h ; 12 rares bonus : 17–36 pattes/h |
| Revenu épique | 20 + (affection − 1), soit 20–39 pattes/h |
| Revenu légendaire | 26 + (affection − 1), soit 26–45 pattes/h |
| Capacité des habitats N1/N2/N3 | 3 / 5 / 7 individus |
| Stockage de tous les habitats N1/N2/N3 | Selon le type : N1 de 1 300 à 2 900, N2 de 2 600 à 4 800 ; N3 : 5 600 pattes pour tous (détail ci-dessous) |
| Communs Paille / Neige / Feu / Bélier Gris / Volant | 80 / 80 / 180 / 350 / 600 pattes |
| Habitats Paille / Neige / Feu / Métal / Vol | 200 / 200 / 450 / 800 / 1 200 pattes |
| Universel | 350 pattes |
| Amélioration N2 | 50 % du prix d’achat du type |
| Amélioration N3 | 10 cœurs |
| Extensions successives | 600 / 1 800 / 4 500 / 9 000 / 16 000 / 26 000 / 40 000 / 60 000 ; niveaux requis conservés |
| Ferme / Cuisine | 60 / 100 pattes ; deux fermes maximum |
| Statue de l’Affection | 30 000 pattes, niveau 15, une seule ; vendue parmi les bâtiments |

### Nourriture et ferme (25 octobre 2026)

L’ancienne « herbe » s’appelle désormais **nourriture** partout, avec son logo peint : une botte de foin nouée, piquée d’un brin de trèfle. Le stock reste unique (clé interne `grass`, inchangée dans les sauvegardes). Le logo accompagne chaque montant de nourriture et le mot lui-même ; il remplace le trèfle du HUD.

La ferme cultive dix aliments, du moins au plus aimé des lapins. Plus un aliment est aimé, plus il coûte, plus il dure, plus il s’ouvre tard et plus il donne de nourriture par récolte. Les cultures longues couvrent les absences entre les trois sessions (5 h, 7 h et la nuit de 12 h).

| Culture | Niveau | Pattes | Nourriture | Durée |
|---|---:|---:|---:|---:|
| Foin (`foin`, tutoriel) | 1 | 10 | 20 | 5 min |
| Pissenlit | 1 | 18 | 40 | 15 min |
| Trèfle | 3 | 30 | 70 | 30 min |
| Persil | 5 | 50 | 120 | 1 h |
| Laitue romaine | 7 | 80 | 200 | 2 h |
| Fanes de carotte | 9 | 120 | 290 | 3 h |
| Fenouil | 11 | 160 | 380 | 4 h |
| Pomme | 13 | 240 | 560 | 6 h |
| Fraise | 16 | 330 | 760 | 8 h |
| Banane | 19 | 450 | 1 000 | 10 h |

Le prix est payé au lancement. Quantité et durée normale sont figées dans chaque culture ; une accélération change seulement sa date de fin. Pendant la culture, de petites pousses se dressent dans les cinq sillons de la ferme ; à maturité, l’aliment lui-même les remplace et une bulle annonce la quantité à récolter. Une commande v17 en cours devient la culture qui la montre (petite → foin, moyenne → trèfle, longue → fenouil, nuit → banane) en gardant sa quantité et sa durée d’origine ; une commande v16 conserve ses anciens 20/40/100 et 5/15/60 minutes. La mission « Une culture plus longue » (identifiant historique `night-order`) demande une culture d’une heure ou plus.

### Affection, statue et naissances rares

Affection 1–20, sans faim ni dégradation. Le repas qui fait passer de *a* à *a* + 1 coûte : 2, 4, 8, 14, 22, 32, 45, 60, 80, 110, 140, 180, 230, **1 500** (14 → 15), puis 400, 480, 570, 670, 800 nourriture, soit 5 347 pour aller de 1 à 20. Sans la **Statue de l’Affection**, l’affection s’arrête à 14 (repas et Cuisine) ; un lapin déjà plus haut dans une ancienne partie garde son affection. Le repas de l’affection 15 est le plus cher de tous : une vraie récompense.

Quand les deux parents ont au moins 10 d’affection, les chances d’épique et de légendaire sont multipliées par 1,5 ; à partir de 15 pour les deux, par 2 (l’affection la plus basse des deux décide). Exemple : Magicien 5 % → 7,5 % → 10 % ; Dragon et Requin, qui demandent déjà 10, passent à 3 % puis 4 %. Les tirages restent des rapports entiers exacts, en demi-pourcentages. Rares jamais vendus. Prix des recettes payantes, Cuisine, constructions et niveaux d’accès conservés.

XP : passage N → N+1 = **arrondi(90 × N^0,85)** depuis le 25 octobre 2026 (niveau 22 vers le 20e jour ; auparavant 1,15), plafond 30, un cœur par niveau. Le barème initial demandé 25 × N^1,5 faisait atteindre le niveau 5 pendant le tutoriel, 10 après 2,5 jours écoulés, 15 après 10,5 jours et 20 après 33 jours. Seuls le coefficient et l’exposant ont été ajustés pour le rythme cible. Repas : 6 XP plus 1 par tranche de 200 nourriture dépensée (13 XP pour l’affection 15 ; base relevée de 5 à 6 le 26 octobre 2026 pour compenser la ferme de niveau 1) ; achat commun : 10 ; naissance commune : 10, rare : 20 (Épique 110 et Légendaire 180 conservés) ; première découverte commune : +60, rare : +250 ; lancement de reproduction : 5 ; constructions inchangées ; première pose de chaque modèle de décoration : 10, une fois par référence même après revente ; mission principale : 40, quotidienne : 50, bonus quotidien : 0.

Collection : poids ordinaires 30 par commun et 30 par rare admissible. Paille × Neige reste un tirage rare certain. Les 24 rares ordinaires actuels participent à la garantie de nouvelle espèce : après sept échecs admissibles, la huitième tentative garantit une espèce manquante admissible à la paire et au niveau. Les recettes spéciales, Épiques, Légendaires et Mythiques restent exclues. La libération d’un doublon rend 10 nourriture pour un commun ou 25 pour un rare, sans XP ; dernier individu et parent occupé restent protégés.

Les quotidiennes demandent de récolter 100 pattes (récompense 60 pattes), récolter 40 nourriture (+30 nourriture) et lancer une reproduction (+40 pattes). L’identifiant historique `gain-affection` est conservé pour la troisième, dont la règle est désormais la reproduction. Bonus des trois : deux cœurs. Cadeau : deux cœurs par tranche de 24 h, cumul de trois cadeaux maximum (six cœurs), sans décaler la prochaine échéance lors d’une réclamation tardive.

Migration v16 → v17 réelle et déterministe : ressources, affection, lapins, bâtiments, stock et résultats/dates des reproductions et croissances sont préservés. Le niveau et la fraction dans le niveau sont convertis depuis l’ancienne courbe 50 × N^1,6, avec arrondi inférieur à un point d’XP, sans récompense de niveau au chargement. Compteur de garantie plafonné à sept ; modèles de décoration déjà posés marqués récompensés ; quotidienne d’affection complétée reste réclamable, réclamation et bonus déjà reçus restent acquis. Versions 1–15 : rejet `INCOMPATIBLE_CATALOG` conservé. Fixture encodée par le véritable code v16 dans `tests/fixtures/economy-v16.json`.

### Habitats, revenus et agence de voyage (25 octobre 2026)

Le stockage dépend du type aux niveaux 1 et 2, dans l’ordre strict Paille < Neige < Feu < Universel < Métal < Vol. Au niveau 3, tous les habitats stockent 5 600 pattes. Les capacités restent 3 / 5 / 7 lapins.

| Habitat | Stockage N1 | Stockage N2 | Stockage N3 |
|---|---:|---:|---:|
| Paille | 1 300 | 2 600 | 5 600 |
| Neige | 1 500 | 3 000 | 5 600 |
| Feu | 1 800 | 3 400 | 5 600 |
| Universel | 2 100 | 3 800 | 5 600 |
| Métal | 2 500 | 4 300 | 5 600 |
| Vol | 2 900 | 4 800 | 5 600 |

Au chargement, un ancien stock au-dessus du nouveau plafond, mais dans les anciens plafonds 2 400 / 4 000 / 5 600, est ramené au nouveau plafond ; son excédent en pièces entières est versé au solde. Un stock dépassant à la fois le plafond actuel et l’ancien est refusé. Cette conversion n’est appliquée qu’une fois, sans nouveau crédit au prochain chargement.

À l’affection 1, les communs produisent 10 pattes/h, les rares 14, les épiques 20 et les légendaires 26. Neuf rares survivants du tirage unique du 25 octobre ont une base de 17 : `amethyste`, `boudinet`, `bretonette`, `egiiipte`, `frisket`, `princesse-neige`, `roukette`, `virvoletant`, `wat-wat`. Chaque point d’affection au-delà de 1 ajoute une patte/h ; aucun nouveau tirage au chargement.

L’agence de voyage s’achète parmi les bâtiments dès le niveau 8 pour 1 000 pattes, un exemplaire maximum. Coco, hôte non collectionnable en chemise hawaïenne et lunettes de soleil, accueille le joueur en quatre bulles la première fois. Cet accueil terminé est sauvegardé ; Coco reste ensuite présent sans répéter le guide.

La capacité de l’agence est de un, deux ou trois voyages selon son niveau. Un parent au nid ne peut pas partir. La destination surprise et la durée entière de 3 à 10 h sont tirées ensemble parmi les 72 couples possibles : Londres, Vannes, Le Caire, Hammamet, Le Lavandou, Bandol, Lille, Paris, Marrakech. Le départ est gratuit. Le voyageur garde sa place et ses revenus dans son habitat ; il disparaît visuellement de celui-ci et ne peut être nourri, reproduire, déménager, être confié ou cuisiner jusqu’à son accueil au retour.

Le voyage rapporte 1 cœur pour 3–4 h, 2 pour 5–7 h, 3 pour 8–10 h. La destination et le minuteur sont affichés pendant le voyage. À la fin, une bulle cœur apparaît sur l’agence ; le voyageur déclare « Ces vacances à … étaient super ! » (ou « au Caire / au Lavandou »). Le bouton « Accueillir · + N cœurs » crédite le souvenir une seule fois et libère le voyageur. Le retour attend sans péremption ; aucune accélération n’est proposée. L’état est conservé dans la sauvegarde v19 et ses dates suivent le recalage de l’horloge. [Règles, textes et préparation des illustrations](travel-agency.md).

## Lapins ajoutés le 25 octobre 2026

Décision du propriétaire, avec les dessins livrés dans `Design des lapins` (détourés et recadrés par `scripts/prepare-rabbit-masters.mjs`, puis réduits par `scripts/derive-rabbit-art.mjs`). Ils ne clignent pas encore des yeux et ne bougent pas la truffe : ce sera une mission suivante.

| Espèce | Types | Rareté | Obtention |
|---|---|---|---|
| Boudinet | métal + paille | rare | reproduction, éléments métal + paille, affection 2 |
| Dinono | feu + métal | épique | reproduction, éléments feu + métal, affection 6, 5 %, connaissance 450 |
| Lapin en Bouée | feu + métal | rare | reproduction, éléments feu + métal, affection 2, garantie |
| Egiiipte | vol + métal | rare | reproduction, éléments vol + métal, affection 2 |
| Piment | vol + feu | rare | reproduction, éléments vol + feu, affection 2 |
| Tunini | neige + vol | rare | reproduction, éléments neige + vol, affection 2 |
| Bretonette | métal + vol | rare | reproduction, éléments métal + vol, affection 2 |
| Dadi | neige + vol | épique | 5 %, éléments neige + vol, affection 6, niveau 11 |
| Maxou | neige + vol | épique | 5 %, éléments neige + vol, affection 6, niveau 11 |
| Orange | paille + neige | épique | 5 %, éléments paille + neige, affection 6, niveau 11 |
| Lapin Magicien | paille + métal (avant : métal + vol) | épique | 5 %, éléments paille + métal, affection 6, niveau 11 |
| Lapin Dragon | feu + vol | légendaire | 2 %, uniquement Dadi × Phoenix, affection 10, niveau 14 |
| Lapin Requin | neige + métal | légendaire | 2 %, uniquement Maxou × Wat Wat, affection 10, niveau 14 |

Les six rares suivent la règle standard des rares (garantie comprise, indice de types gratuit). Le propriétaire a fixé les types des Épiques et les parents des Légendaires ; pour le reste (5 %, affection 6, niveau 11, connaissance à 450 pattes ; 2 %, affection 10, niveau 14, connaissance à 900), ils reprennent provisoirement les seules règles existantes, celles de Magicien et de Dragon, en attendant son arbitrage. Un Magicien déjà logé sous ses anciens types (habitat Vol) reste où il est au chargement ; les nouveaux placements suivent ses types actuels.

Orange : le dessin livré reproduisait un personnage protégé (Miffy), qui ne peut pas entrer dans ce dépôt public. Le propriétaire a choisi le 25 octobre 2026 un design original parmi trois concepts peints : B « Lanterne d’hiver » (robe en lanterne d’amour-en-cage, chapeau de paille enneigé). Master détouré par `scripts/prepare-rabbit-masters.mjs` depuis le concept (hors dépôt), sprite 339 × 430, largeur monde 46. Sans clignement ni truffe pour l’instant, comme les autres lapins du 25 octobre.

Résultats, limites et achats restants : [progression du joueur](player-progression.md). Partie B (objectifs et lisibilité) : suite de missions principales durables, indices de types parents pour les 14 rares illustrés, compteur des récompenses complètes de la Cuisine, cumul des cadeaux de cœurs affiché, heure de fin des commandes, grandes décorations plus ambitieuses (600 à 4 000 pattes ; statue du robot à 80 cœurs) avec revente plafonnée au prix payé. Détail : [progression du joueur](player-progression.md#objectifs-durables-et-lisibilité-partie-b).

---

# Historique des règles antérieures (non applicable à l’économie v17)

Les chiffres et migrations v8/v9 ci-dessous décrivent les anciennes versions. Les parcours fondés sur `previousStart` reproduisent le départ central retiré ; ils ne décrivent pas une partie neuve. La référence courante ci-dessus les remplace.

> Interface actuelle : [menus, confort tactile et comparaisons](ui-comfort.md). Navigation et styles harmonisés, sans changement de règles ou de sauvegarde.

> Validation actuelle : [parcours, budget et rythme sur 24 h](start-validation.md). Les prix, revenus, probabilités et récompenses sont conservés.

> Mise à jour : [aides d’initiation facultatives et première naissance](initiation-aids.md). Les délais normaux, le transfert manuel et les probabilités restent inchangés.

> Règles courantes : reproduction manuelle, missions actuelles et [début guidé facultatif](guided-start.md), sauvegardes v9 et [progression du joueur](player-progression.md). Les descriptions des anciennes prévisualisations plus bas constituent l’historique ; les règles ci-dessous les remplacent pour le jeu normal et le laboratoire.

## Départ et migration v8

Toute nouvelle partie contient un habitat Paille niveau 1 en (16,16), un nid en (12,12), une nurserie en (20,12), et seulement Paille affection 1. Seule Paille est découverte. Toutes les empreintes sont de 4 × 4 sur la grille fine, sans collision sur la parcelle centrale. Ressources initiales inchangées : 300 pattes, 10 herbes, 12 cœurs. Les anciennes missions de possession du nid et de la nurserie sont retirées du parcours actif ; leurs réclamations historiques sont conservées. Ces deux équipements ne sont plus achetables, même indirectement.

La conversion v7 → v8 préserve les bâtiments déjà possédés, tous les occupants, ressources, travaux et résultats. Les équipements manquants sont ajoutés gratuitement, aux positions préférées ou à la première position fine libre sur le terrain acquis. Aucun objet n’est déplacé. S’il n’existe aucune place, Aménagement propose leur placement gratuit après libération d’une empreinte. Un seul exemplaire de chacun est autorisé. Le format v8 n’ajoute rien automatiquement au rechargement. La copie v7 originale est conservée sous `prairie-lapins.backup.before-v8` (stockage séparé au laboratoire).

Les lapereaux déjà en nurserie y restent avec leurs dates exactes. Pour une ancienne reproduction terminée dont un parent a été déplacé, son habitat actuellement enregistré devient son habitat de retour. Un parent déjà confié reste absent ; l’interface l’explique et aucun individu n’est recréé. Le résultat en attente, son identité et ses réservations de découverte sont conservés. Les coordonnées v7 ne changent pas d’unité.

# Référence du prototype — habitats et aménagement

Cette référence reprend les règles et chiffres approuvés par le joueur. Une modification d'équilibrage doit être précédée d'une explication de sa raison. Les paramètres exécutables se trouvent dans `src/config/balance.ts`, `src/config/missions.ts` et `src/config/habitats.ts`.

La version de travail est `Project-L/prairie-lapins-prototype`. `production` et le laboratoire utilisent les sauvegardes **v8**, le nid et la nurserie offerts, la reproduction gratuite avec transfert manuel et les missions du début actuel. Les prévisualisations Comptes **v4** et Décorations **v5** restent figées et isolées. La référence habitats antérieure comptait 361 tests. Le dossier historique `V1.0.4` correspond au palier missions à sauvegarde **v3**, avec 230 tests. La consolidation visuelle ajoute huit tests de disposition/sélection ; elle conserve intégralement les règles ci-dessous. Le bilan courant est dans [progress.md](progress.md).

## Concept et périmètre

Jeu mobile solo de collection et de gestion d'une prairie de lapins. Boucle : récolter des pattes, produire de l'herbe, nourrir, reproduire, accueillir, construire et agrandir. Univers, noms, interface et visuels originaux. Les pattes financent les achats et productions ; l'herbe augmente l'affection. Aucun entretien obligatoire, faim, maladie, perte d'affection ou lapin perdu pendant l'absence.

Application web Phaser + TypeScript, utilisation tactile sur iPhone Safari. Le jeu normal est publié sur https://sullivanlegoff-code.github.io/Project-L/ et fonctionne ordinateur éteint. Laboratoire `/dev/`, comptes expérimentaux `/preview/accounts/` (en pause), décorations `/preview/decorations/` (v5 locale séparée). Progression locale avec export/import de secours ; PWA et mode hors connexion restent ultérieurs. Aucun achat réel ni publicité.

Prévisualisation Décorations : quinze espèces, collection, carnet de reproduction, missions principales et quotidiennes, enclos, ferme, nid, nurserie, achats, placement, déplacement, récolte, nourriture, reproduction, accueil, deux extensions, habitats spécialisés et améliorations, et sauvegarde. Les espèces ont des types fixes et une rareté distincte. Les six types de base sont paille, neige, terre, feu, métal et vol. Arc-en-ciel reste réservé à une étape future.

Le chantier Aménagement ajoute douze décorations esthétiques, achetées uniquement en pattes. Inventaire d’exemplaires uniques, grille fine 4 × 4 par case de bâtiment, rotations des objets compatibles, douze références exclusivement extérieures, déplacements/rangement gratuits et mode photo. Aucun bonus ni modification des règles de reproduction. À la demande du joueur du 9 octobre 2026, les décorations seules deviennent revendables : 50 % du prix d’achat en pattes, arrondi inférieur, aucun cœur remboursé, confirmation explicite par exemplaire et écriture atomique avant activation. La sélection directe suit le dessin visible, avec priorité lapins en jeu normal et décorations en Aménagement ; photo sans panneau d’objet. Catalogue, collisions, propriété, migrations et prix : [decorations.md](decorations.md).

Reportés : mini-jeux, énergie, vêtements, événements, catalogue complet et nouveaux visuels des lapins. Dragon introduit une recette à espèces précises.

## Partie initiale et terrain

Le jeu normal et le laboratoire utilisent l’île à neuf parcelles, ses bâtiments sur grille fine et le zoom validé. Illustrations, projection, caméra et ressources initiales sont conservées ; le format courant est v8. Les prévisualisations historiques restent figées. [Conception visuelle historique](island.md), [terrain](land-v6.md) et [reproduction courante](manual-breeding-v8.md).

- 300 pattes, 10 herbes et 12 cœurs.
- Un habitat Paille niveau 1 en coordonnées fines `(16,16)`, un nid `(12,12)`, une nurserie `(20,12)`, et uniquement Paille d’affection 1. Nid et nurserie sont offerts et ne s’achètent pas.
- Parcelle centrale de 12 × 12 petits carrés acquise au départ, au sein d’une île potentielle de neuf parcelles.
- Huit parcelles supplémentaires indépendantes, achetées au choix pour 500, 1 000, …, 4 000 pattes selon le nombre déjà acquis.
- Chaque bâtiment occupe 4 × 4 petits carrés libres, avec placement et déplacement par pas d’un petit carré. Les décorations restent exclusivement extérieures.
- Construction immédiate ; pas de démolition dans le prototype.
- Habitat Paille initial de niveau 1 : trois places, type Paille. Tous les habitats peuvent atteindre les niveaux 2 et 3, avec cinq puis sept places.
- Deux fermes au maximum ; un nid et une nurserie au maximum.
- Nurserie d'une place. Au niveau 1, quinze individus demandent cinq habitats ; les améliorations permettent désormais de concentrer davantage de lapins sur les mêmes cases. Les deux extensions offrent plus de possibilités d'aménagement.

## Espèces

| Identifiant stable | Nom | Types | Rareté | Obtention | Affection minimale des deux parents | Croissance |
|---|---|---|---|---|---:|---:|
| paille | Lapin Paille | paille | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| neige | Lapin Neige | neige | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| terre | Lapin Terre | terre | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| brumelin | Brumelin | paille + neige | peu commun | reproduction uniquement | 2 | 15 min |
| mottelin | Mottelin | paille + terre | peu commun | reproduction uniquement | 2 | 15 min |
| feu | Lapin Feu | feu | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| belier-gris | Lapin Bélier Gris | métal | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| volant | Lapin Volant | vol | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| lunettes | Lapin à Lunettes | métal + paille | rare | reproduction uniquement | 4 | 30 min |
| perroquet | Lapin Perroquet | vol + feu | rare | reproduction uniquement | 4 | 30 min |
| feu-glace | Lapin Feu Glacé | feu + neige | rare | reproduction uniquement | 4 | 30 min |
| bouee | Lapin en Bouée | paille + feu | rare | reproduction uniquement | 4 | 30 min |
| geant | Lapin Géant | terre + paille | épique | reproduction uniquement | 6 | 60 min |
| magicien | Lapin Magicien | métal + vol | épique | reproduction uniquement | 6 | 60 min |
| dragon | Lapin Dragon | vol + feu | légendaire | exactement Perroquet × Feu | 10 | 120 min |

L'achat d'un commun l'accueille immédiatement à l'affection 1 ; aucune croissance ni condition de niveau de joueur. Le minimum d'affection du tableau concerne uniquement la reproduction. Les types de la recette doivent tous être présents dans l'union des deux parents ; leurs espèces précises ne sont pas imposées, sauf Dragon qui exige Perroquet et Feu. Les neuf espèces de reproduction ne sont jamais achetables, y compris avec un complément de cœurs.

Brumelin et Mottelin restent des noms provisoires validés pour ce prototype. Une espèce est découverte au premier accueil dans un enclos, achat compris. La découverte reste enregistrée indépendamment des individus possédés.

## Économie

| Achat ou action | Coût | Délai ou effet |
|---|---:|---|
| Lapin commun | 80 pattes | immédiat, affection 1 |
| Enclos supplémentaire | 120 pattes | immédiat, trois places |
| Ferme | 60 pattes | immédiat |
| Nid | Offert, un exemplaire | immédiat |
| Nurserie | Offerte, un exemplaire | immédiat |
| Première extension | 500 pattes | immédiat, 6 × 2 cases |
| Deuxième extension | 1 000 pattes | après la première, 9 × 2 cases |
| Reproduction | Gratuit (0 patte, 0 cœur) | 20 minutes puis transfert (automatique après la mission « Vers la nurserie ») |
| Croissance d'un commun | gratuit | 5 minutes |
| Croissance de Brumelin ou Mottelin | gratuit | 15 minutes |
| Croissance d'un nouveau rare | gratuit | 30 minutes |

| Commande de ferme | Coût | Herbe | Délai |
|---|---:|---:|---:|
| Petite | 10 pattes | 20 | 5 minutes |
| Moyenne | 18 pattes | 40 | 15 minutes |
| Grande | 40 pattes | 100 | 60 minutes |

Une ferme réalise une commande à la fois. Le produit attend une récolte manuelle ; pas de répétition automatique ni de péremption.

Revenu d'un lapin : `12 + 2 × (affection − 1)` pattes par heure.

| Affection | Pattes / heure |
|---:|---:|
| 1 | 12 |
| 5 | 20 |
| 10 | 30 |
| 20 | 50 |

Chaque habitat cesse d'accumuler lorsqu'il atteint son plafond. L'enclos universel de niveau 1 conserve son plafond de 600 ; les autres plafonds figurent ci-dessous. Récolte manuelle des pattes entières, conservation des fractions restantes. La rareté n'ajoute aucun multiplicateur dans ce prototype.

Affection : de 1 à 20. Passer de A à A + 1 coûte `2 × A` herbes, immédiatement. Coût total de 1 à 20 : 380 herbes. Aucune autre dépense, attente ou perte d'affection.

## Reproduction

Deux individus distincts d'affection minimale 2. Pas de sexes à gérer. Toutes les paires d'espèces sont autorisées. Les parents sont conservés, peuvent être nourris et continuent à produire leurs revenus. Ils apparaissent dans le nid et disparaissent visuellement de leurs habitats. Leur habitat d’origine et leur capacité restent réservés ; leurs revenus y continuent. La fiche indique « Au nid ». Déplacement, don et nouvelle reproduction sont interdits jusqu’au transfert manuel du lapereau, y compris après les 20 minutes. Nourrir reste possible.

L'ordre des parents ne change pas le tirage. Les tables historiques suivantes restent exactement inchangées lorsque l'union contient uniquement paille, neige et/ou terre, pour la distribution ordinaire, avant la réservation éventuelle de Géant :

| Types réunis | Paille | Neige | Terre | Brumelin | Mottelin |
|---|---:|---:|---:|---:|---:|
| Paille | 100 % | 0 % | 0 % | 0 % | 0 % |
| Neige | 0 % | 100 % | 0 % | 0 % | 0 % |
| Terre | 0 % | 0 % | 100 % | 0 % | 0 % |
| Paille + neige | 40 % | 40 % | 0 % | 20 % | 0 % |
| Paille + terre | 40 % | 0 % | 40 % | 0 % | 20 % |
| Neige + terre | 0 % | 50 % | 50 % | 0 % | 0 % |
| Paille + neige + terre | 20 % | 20 % | 20 % | 20 % | 20 % |

### Paires comprenant feu, métal ou vol

1. Réunir les types des deux parents, sans doublon.
2. Chaque commun correspondant à un type présent reçoit un poids de **40**.
3. Chaque espèce de reproduction ordinaire dont tous les types sont présents reçoit un poids de **20**, si ses conditions d'affection sont remplies. Brumelin et Mottelin demandent 2 ; Lunettes, Perroquet, Feu Glacé et En Bouée demandent **4 chez chacun des deux parents**. Géant, Magicien et Dragon ne rejoignent pas ces poids.
4. Retirer les recettes inaccessibles puis normaliser : `probabilité = poids / somme des poids`. Il n'y a pas de tirage suivi d'un refus ou d'une substitution.
5. Appliquer, le cas échéant, la garantie décrite ci-dessous.

Feu × Neige, hors garantie : aux affections 4/4, Feu 40 %, Neige 40 %, Feu Glacé 20 %. Aux affections 2/2 ou 4/3, Feu et Neige ont chacun 50 % ; Feu Glacé est exclu et cette paire ne fait pas avancer la malchance. Une reproduction reste autorisée dès 2 pour les deux parents.

Les recettes spéciales sont réservées après normalisation ordinaire : Géant 5 % avec terre+paille et affection 6/6 ; Magicien 5 % avec métal+vol et affection 6/6 ; Dragon 2 % avec exactement Perroquet et Feu, affection 10/10. Chacune compte une seule fois, ordre des parents indifférent. Les résultats ordinaires se partagent le reste proportionnellement. Exemples exacts et conditions : [catalogue quinze espèces](species.md). À plusieurs spéciaux admissibles, soustraire la somme de leurs chances, sans nouveau tirage ni substitution après échec.

Le résultat est choisi une seule fois, au lancement, puis enregistré avec son identité. Recharger ne le retire jamais au hasard. Chaque lapereau accueilli commence à l'affection 1.

### Protection contre la malchance

La protection concerne **Brumelin, Mottelin, Lunettes, Perroquet, Feu Glacé et En Bouée**, exclusivement. Géant, Magicien et Dragon sont exclus. Un spécial sur une tentative admissible compte comme un échec ordinaire ; son accueil ne remet pas ce compteur à zéro. La garantie remplace entièrement le pool, chances spéciales comprises. Une tentative est admissible si, après filtrage des types et de l'affection, sa table comprend au moins une de ces espèces non découverte. Les autres tentatives laissent le compteur inchangé. Chaque échec admissible incrémente le compteur. Après neuf échecs, la dixième tentative admissible garantit une espèce inconnue admissible ; si plusieurs sont possibles, chacune a exactement `1 / nombre de recettes inconnues admissibles` de chances. Les communs n'entrent jamais dans la garantie.

Précision pour les découvertes en attente : un résultat inédit d'une de ces six espèces tiré au lancement interrompt provisoirement la série d'échecs et ramène le compteur à zéro. Il porte une réservation de découverte persistée, sans ajouter son espèce aux découvertes. L'accueil effectif d'une nouvelle espèce de reproduction remet également le compteur à zéro. Ainsi, un résultat garanti en attente n'est pas laissé avec un compteur de neuf échecs et ne peut pas être annulé par un rechargement. Les tentatives admissibles suivantes comptent depuis cette réservation ; aucun résultat en attente n'est supprimable. Une réservation n'est pas une découverte : les règles antérieures d'admissibilité sont conservées.

### Nid et nurserie

À la fin des 20 minutes, « Envoyer dans la nurserie » devient disponible. Aucun transfert automatique : délai terminé, absence, rechargement et libération de la nurserie laissent le résultat et les parents au nid. Si elle est occupée, l’interface explique le blocage. Le clic valide transfère l’identité et le résultat déjà tiré, commence la croissance à cet instant, rend les parents à leurs habitats et libère le nid en une opération sauvegardée. Un refus, une sauvegarde impossible ou une double pression ne perd ni ne duplique d’individu. L’espèce reste secrète jusqu’à la fin de croissance et la découverte est enregistrée lors de l’accueil.

Depuis le 25 octobre 2026 (rythme de trois sessions de 5 minutes par jour), une fois la mission initiale « Vers la nurserie » réclamée, le transfert devient automatique : à la fin des 20 minutes, le lapereau rejoint le plus petit couchage libre, sa croissance commence à la fin de la reproduction et les parents retournent dans leurs habitats. Si la nurserie est pleine, il attend au nid et part dès qu’un accueil ou un nouveau couchage libère une place ; sa croissance commence alors à cet instant. Un lapereau lancé à une session est ainsi prêt à la suivante, où le joueur l’accueille et relance une reproduction. Le tutoriel et le transfert manuel restent inchangés avant cette mission. Aucun changement de sauvegarde.

### Collection et carnet

La collection est une liste défilante de quinze espèces, compteur découvertes/15, avec filtres combinables de type, rareté et découverte. Les espèces inconnues restent des silhouettes. Le carnet, accessible depuis la collection ou un nid libre équipé d'une nurserie, montre les neuf recettes, leurs types, leur affection minimale et leur durée de croissance. Il propose les paires d'individus possédés compatibles par types et signale les parents à nourrir ou occupés.

Les chances du carnet et du nid utilisent le même calcul que la simulation, garantie incluse. « Recette possible » ne promet pas une découverte ; une garantie partagée indique son exacte probabilité. Préparer une paire depuis le carnet sélectionne seulement les parents dans le nid, sans paiement ni tirage. Un nid occupé ou des parents insuffisamment nourris empêchent cette préparation. Le résultat déjà déterminé reste masqué jusqu'à la fin de croissance ; consulter les recettes ne le révèle pas. Les types, conditions et probabilités publiques restent consultables.

Les variantes provisoires conservent la silhouette de lapin : orange/flamme, gris/oreilles tombantes/métal, ailes, lunettes, plumage pastel/ailes, orange/bleu glacé. Les réglages de projection, caméra et zones de sélection de l'étape 4 sont conservés.

## Temps, sauvegarde et protections

- Les revenus et délais progressent pendant l'absence. Les récoltes et accueils restent manuels.
- Avant achat, accueil, déplacement, nourriture ou départ d'un lapin, les revenus sont calculés avec les anciens occupants et niveaux.
- Les fractions de pattes sont conservées sans arrondir à chaque reprise.
- Le temps simulé ne recule jamais : une horloge en arrière ne retire rien et ne recompte aucun revenu.
- Une avance de l'horloge peut accélérer ce jeu local ; aucun contrôle serveur n'est prévu.
- Toute action refusée restitue l'état original sans dépense ni autre mutation.
- Confier un doublon est gratuit et irréversible après confirmation dans l’interface. Le dernier individu possédé de chaque espèce est protégé, ainsi qu'un parent en reproduction active.
- Un lapereau sans place attend dans la nurserie. Aucun résultat ne peut être écrasé.
- JSON versionné, identifiants stables, dates de fin persistées, validation avant remplacement d'une partie.
- Sauvegarde automatique, restauration et export/import sont implémentés. Format courant exporté v8 ; import des versions 1 à 8, sauvegarde locale avant conversion.


## Cœurs — équilibrage validé le 6 octobre 2026

Monnaie facultative pour terminer un délai ou compléter les pattes manquantes d’un achat ou d’une production. Le lancement d’une reproduction est gratuit et exclu du complément en cœurs. Aucun achat réel, publicité, paiement automatique ou besoin de cœurs pour progresser. Les tarifs sont centralisés dans `HEARTS`, dans `src/config/balance.ts`. Les recettes, probabilités, revenus et seuils d’affection restent identiques ; la reproduction v8 est gratuite et son transfert est manuel.

| Paramètre | Valeur validée |
|---|---:|
| Dotation d'une nouvelle partie | 12 cœurs, une fois |
| Dotation lors de la migration v1 → v2 | 12 cœurs, une fois |
| Récompense à réclamer manuellement | 2 cœurs |
| Première disponibilité | 24 heures après création ou migration |
| Disponibilité suivante | 24 heures après chaque réclamation |
| Récompenses cumulées pendant l'absence | Une seule récompense disponible |
| Accélération | `ceil(temps restant / 5 minutes)` cœurs |
| Complément de pattes | `ceil(pattes manquantes / 25)` cœurs |

L'heure de référence est `max(heure fournie, lastSimulatedAt)`. Une horloge qui recule ne rouvre pas une récompense déjà réclamée. Les droits sont dans l'état de partie, jamais dans les préférences visuelles. Il s'agit d'un cadeau renouvelable, pas d'un système de missions.

### Comptoir de Paille (fin de partie, 25 octobre 2026)

Pour donner un usage aux pattes et à l'herbe accumulées, le panneau des cœurs propose dès le **niveau 10** le comptoir de Paille : un cœur contre **250 pattes** ou **100 herbes**. Dans un même cycle quotidien, chaque échange d'une ressource coûte 25 % de plus que le précédent (250, 313, 391… pattes), avec 30 échanges au plus par ressource ; les prix reviennent au départ au cycle suivant. Commande `exchangeForHeart` au prix affiché (un prix périmé est refusé), sans XP. Sauvegarde : champ facultatif `market` {cycle, pattes, grass}, sans changement de version. Dans la simulation 3 × 5 min, avec une réserve gardée de 3 000 pattes et 500 herbes, les pattes restent autour de 5 000 et l'herbe autour de 600 au lieu de s'accumuler ; les cœurs, utiles pour les accélérations, les couchages et les améliorations, s'accumulent à leur tour (environ 400 au 20e jour, 1 100 au 50e, car le joueur simulé ne les dépense que pour les améliorations d'habitat). Le niveau 22 reste atteint au 20e jour.

### Accélération

Concerne une production de ferme, une reproduction ou une croissance **en cours**. À la confirmation, le contrôleur avance le temps normalement, puis la simulation recalcule le prix pour le même délai identifié. Un prix diminué est appliqué ; un prix supérieur au montant confirmé est refusé. Une étape terminée, absente ou remplacée ne peut pas être payée. Exemples : 1 min → 1 cœur ; 5 min → 1 ; 6 min → 2 ; 20 min → 4.

La fin de l'étape choisie est fixée à l'heure simulée actuelle. Cela n'avance ni l'horloge globale, ni les revenus, ni les délais voisins. Ferme : produit prêt, récolte manuelle. Reproduction : termine seulement son délai, avec le résultat identique. Les parents et le lapereau attendent le transfert manuel, même si la nurserie est libre. La croissance commence au clic de transfert. Croissance : résultat révélé et prêt, accueil manuel. Identité, espèce, garantie et réservation sont conservées, sans nouveau tirage ; la découverte reste enregistrée à l'accueil.

Une reproduction toujours en cours peut donc être accélérée malgré une nurserie occupée, avec avertissement explicite dans la confirmation. Cette règle de la demande actuelle remplace la restriction de la proposition initiale. Une reproduction déjà terminée qui attend au nid ne propose aucun paiement. Une croissance dans une prairie dont tous les enclos sont pleins ne propose pas d'accélération ; libérer une place reste nécessaire. Aucun cœur ne contourne une capacité.

### Complément

Actions : achats de fermes/habitats/lapins communs, améliorations d’habitat, extensions de parcelles et commandes de ferme. Nid, nurserie et lancement d’une reproduction sont gratuits et exclus du complément. Les autres conditions (case, capacité, disponibilité, affection, limites) sont vérifiées avant toute proposition ou dépense. L'herbe n'est jamais substituable.

Pour coût C et pattes P insuffisantes : manque `C − P`, prix `ceil((C − P) / 25)` cœurs. La réussite consomme P pattes et ce nombre de cœurs, sans crédit supplémentaire. Exemple : un lapin à 80 pattes, solde 30 → 30 pattes + 2 cœurs ; après achat, 0 patte, sans monnaie rendue sur l'arrondi.

Le joueur choisit explicitement « Compléter », puis confirme le détail. Le paiement normal reste disponible selon ses règles et n'utilise jamais automatiquement les cœurs. Le prix en pattes et en cœurs ne peut dépasser les montants confirmés. Si une modification du portefeuille imposerait plus de pattes ou plus de cœurs, il faut un nouveau devis ; si les pattes suffisent maintenant, revenir au paiement normal. Un bâtiment n'est payé qu'après choix définitif de sa case et confirmation ; toute annulation reste gratuite.

### Transactions et sauvegarde v2

Commandes explicites `claimHearts`, `accelerate`, `payWithHearts`. Toutes passent par `GameController.perform` puis `act`, sans mutation de ressources par l'affichage. Refus : état de la transaction inchangé ; l'avance temporelle séparée du contrôleur est conservée. Une confirmation n'est utilisable qu'une fois ; la protection contre les doubles pressions reste active.

JSON v2 ajoute `hearts` et `nextHeartGiftAt`. La migration valide d'abord le v1 strictement, copie tous ses champs de progression, puis ajoute la dotation et l'échéance. Les v2 gardent leur solde à chaque lecture/import. Un import v1 calcule la première échéance à la confirmation effective (et non au simple aperçu). Réimporter un vieux v1 remplace volontairement la partie par cette ancienne progression migrée : aucun cumul de soldes entre parties.

Le palier de onze espèces de l’étape 6 **conservait la version 2** : aucun champ supplémentaire ni changement de structure. Le catalogue est une configuration, pas une liste copiée dans chaque sauvegarde. Le lecteur reconnaît les nouveaux identifiants et les durées de croissance correspondantes. Une ancienne partie voit onze entrées sans modifier ses ressources, individus, bâtiments, découvertes, fractions, résultats ou réservations ; aucune nouvelle dotation de cœurs. Les horodatages avancent ensuite normalement. Les imports v1 restent migrés selon la règle existante. Une ancienne livraison limitée à cinq espèces ne reconnaît pas les nouveaux identifiants : après avoir accueilli un nouveau lapin, continuer avec cette livraison ou une version ultérieure.

Le stockage conserve la clé historique `prairie-lapins.save.v1` pour retrouver les anciennes parties ; le champ JSON `version` est l'autorité. Avant écriture d'une migration, le v1 brut est copié sous `prairie-lapins.backup.before-v2`. Un échec de copie ou d'écriture préserve la sauvegarde active antérieure. L'import n'active le candidat qu'après écriture réussie. En cas d'échec de sauvegarde d'une action jouée, la mémoire reste disponible et exportable avec avertissement. Les lecteurs v1 stricts ne savent pas charger un export v2.

Les durées v1 restent vérifiées exactement. En v2, un délai raccourci est admissible seulement s'il est déjà terminé, commence avant sa fin et ne dépasse pas la durée normale. Aucune date future raccourcie incohérente n'est acceptée.

Le jeu demeure local sans anti-triche serveur : une avance volontaire de l'horloge ou une restauration d'export est possible. La caméra, les proportions et le zoom sont conservés ; le dernier test humain les valide sur iPhone. Ce retour ne valide pas les nouvelles reproductions, les dépenses de cœurs ou l'export/import.


## Missions — équilibrage validé et implémenté à l'étape 7

Les missions soutiennent achats, collection, nourriture et récoltes ; aucune fonctionnalité existante n'est verrouillée derrière elles. Elles ne modifient pas les prix, revenus, probabilités, délais ou le cadeau indépendant de 2 cœurs toutes les 24 heures. Configuration : `src/config/missions.ts`.

### Principales — début actuel v8

Le parcours initial affiche une seule mission à la fois, la suivante après réclamation. Ordre : affection 2 → 10 herbes ; ferme → 20 herbes ; récolte de 20 herbes → 30 pattes ; deux parents d’affection ≥ 2 → 20 pattes ; reproduction lancée → 20 herbes ; transfert manuel → 30 pattes ; accueil d’un lapereau de reproduction → 50 pattes.

Après la première naissance récompensée : objectifs parallèles de collection (3 espèces / 50 pattes, Brumelin / 1 cœur, 5 espèces / 2 cœurs), développement (2 habitats / 30 herbes, Terre / 50 pattes), affection 5 / 1 cœur, décoration posée / 20 pattes et extension / 100 pattes. Les actions anticipées restent reconnues. Aucun résultat de reproduction n’est promis.

Possession, découverte et affection utilisent l’état ; récolte, reproduction, transfert, accueil et pose utilisent des compteurs d’actions réussies persistés. Un achat ne constitue pas une naissance. Aucun historique d’action absent n’est reconstitué. Les identifiants équivalents et toutes les anciennes réclamations restent conservés ; nid, nurserie et première rare sont retirés de la liste active. Une carte disparaît après réclamation, sans perdre son historique. Format v8 étendu avec compteurs optionnels à la lecture, initialisés à zéro lorsqu’ils manquent. Le détail des identifiants, récompenses, reprises et limites est dans [missions-current.md](missions-current.md).

### Quotidiennes et bonus

| Identifiant stable | Objectif par cycle | Récompense |
|---|---|---|
| collect-pattes | Récolter 100 pattes dans les enclos | 60 pattes |
| collect-grass | Récolter 40 herbes dans les fermes | 30 herbes |
| gain-affection | Lancer une reproduction au nid | 40 pattes |
| bonus du cycle | Avoir réclamé les trois récompenses ci-dessus | 2 cœurs |

Depuis le 25 octobre 2026, une quotidienne par session : les trois s'ouvrent l'une après l'autre, dans l'ordre du tableau. La première est ouverte au début du cycle ; chacune des suivantes s'ouvre **4 heures** après la réclamation de la précédente (`DAILY_MISSION_GAP`, heure d'ouverture persistée dans `daily.nextAt`, champ facultatif sans changement de version). Seule la mission ouverte progresse : une action faite avant son ouverture ne compte pas. Le panneau affiche la mission en cours, ou le temps avant son ouverture, et la liste des suivantes. Avec des sessions vers 8 h, 13 h et 20 h, le joueur réclame une mission à chaque visite et le bonus le soir. Un nouveau cycle repart de la première mission, ouverte aussitôt.

Le premier cycle commence à la création ou à la migration. Durée fixe : **24 heures**. Référence persistée `referenceAt` ; cycle courant `floor((heure monotone − referenceAt) / 24 h)`. À la frontière exacte, le nouveau cycle commence avant l'action. Les cycles restent alignés sur cette référence, sans minuit local et sans décalage lors d'une réclamation. Après absence, sauter directement au cycle courant ; ne cumuler aucun cycle manqué.

À chaque renouvellement, les trois compteurs, leurs réclamations et le bonus sont réinitialisés. Les anciennes récompenses non réclamées expirent, bonus compris. Le panneau l'annonce explicitement et affiche le temps restant. Les principales ne sont pas affectées par le renouvellement.

Seuls les événements d'actions réussies sont comptés : pattes entières effectivement retirées des enclos, herbes effectivement récoltées, niveaux effectivement gagnés par nourriture. Les quantités sont conservées même au-delà de l'objectif. Ne comptent pas les récompenses, ressources de départ/importées, compléments en cœurs, revenus en attente, commandes non récoltées, refus ou annulations. Une production commencée avant le cycle compte lors de sa récolte dans le cycle actuel. Il n'y a aucun rattrapage d'actions antérieures à la migration.

Le bonus demande les trois **réclamations**, pas seulement les objectifs terminés. Une seule réclamation du bonus par cycle. Il s'ajoute au cadeau de cœurs existant sans en modifier le solde autrement ni l'échéance. Les cœurs restent facultatifs et sans achat réel/publicité.

### Interface et transactions

Bouton Missions sous les compteurs, indicateur discret de récompenses disponibles, onglets Principales et Quotidiennes. Chaque carte affiche titre, condition, progression, récompense, coût gratuit et état En cours / À réclamer. Après réclamation, la carte disparaît ; une liste vide affiche un message discret. Les quotidiennes réapparaissent au prochain cycle. Réclamation explicite et brève animation respectant la préférence de réduction des mouvements. Aucun panneau de mission imposé. Le guidage facultatif décrit ci-dessous accompagne les nouvelles parties ; les anciennes parties peuvent le reprendre volontairement depuis Paramètres. Les raccourcis ouvrent un panneau, sans achat ni action de jeu.

Commandes `claimMainMission`, `claimDailyMission`, `claimDailyBonus`, traitées par la simulation et le contrôleur. Les réclamations quotidiennes portent l'identité temporelle du cycle : un ancien bouton ne peut réclamer une récompense d'un cycle suivant. Les boutons de mission devenus obsolètes après import sont inactifs. L'état conserve le droit acquis et le paiement ensemble ; double pression ou rechargement ne redonne pas une récompense déjà enregistrée. Un refus ne change aucune ressource. L'avancement du temps séparé par le contrôleur reste conservé, comme avant.

### Sauvegarde version 3 — historique du palier missions

La v3 ajoute `missions` : principales acquises/réclamées, référence et indice du cycle, compteurs/réclamations courants et bonus réclamé. Cette structure persistante justifie le changement de version. Les v1 et v2 sont validées selon leur format, puis converties ; l'import v3 conserve son état de missions et avance normalement le temps, sans réinitialisation ni fusion.

- Depuis v2 : tous les champs précédents conservés, y compris cœurs, cadeau, fractions, résultats et réservations. Aucune redotation. Principales évaluées, quotidiennes à zéro, référence `max(heure de migration, dernière heure simulée)`.
- Depuis v1 : mêmes règles, avec la dotation historique de 12 cœurs et le premier cadeau 24 heures après migration. Pas d'historique d'actions inventé.
- À l'import v1/v2, la référence est fixée à la confirmation effective. La partie importée est écrite avant activation, sans fusion des récompenses avec la partie remplacée.
- La clé active reste `prairie-lapins.save.v1` pour retrouver la progression. Copie brute avant migration v2 sous `prairie-lapins.backup.before-v3` ; la copie v1 historique sous `prairie-lapins.backup.before-v2` est conservée. Échec de copie/écriture : ancien contenu actif intact.
- La validation refuse identifiants de missions inconnus, doublons, principales réclamées sans acquisition, quotidiennes réclamées sans objectif, bonus prématuré et cycle incohérent. Un état ancien décodé peut attendre son avance normale : son cycle nouvellement ancré n'a alors aucune action comptée. L'avance ne peut reculer avant cette référence.
- Un ancien client v1/v2 ne lit pas la v3. Continuer avec cette livraison après migration. Une restauration volontaire d'un ancien export restaure aussi ses anciennes récompenses, sans fusion ; ce jeu local n'est pas un serveur anti-triche.

Les sauvegardes restent liées à l'origine du site. Le mode développement conserve sa sauvegarde, son horloge et ses préférences séparées. Les préférences d'interface ne donnent aucun droit aux missions.


## Habitats et aménagement — règles validées de l'étape 8

Les chiffres suivants sont ceux approuvés dans la demande de cette étape ; aucune proposition d'équilibrage supplémentaire n'est appliquée. Les règles de reproduction, revenus par lapin, affection, missions et cadeaux de cœurs sont conservées.

| Identifiant | Habitat | Types acceptés | Achat | Identité visuelle actuelle |
|---|---|---|---:|---|
| universal | Enclos universel | tous | 120 pattes | bois, herbe, buissons et fleurs pastel |
| paille | Prairie de paille | paille | 200 pattes | sol doré, botte de paille et épis |
| neige | Jardin enneigé | neige | 200 pattes | sol glacé, neige douce et cristaux bleus |
| terre | Terrier de terre | terre | 200 pattes | terre brune texturée, rochers, buisson et terrier |
| feu | Clairière de feu | feu | 200 pattes | sol pêche, pierres chaudes et fleurs orange |
| metal | Atelier de métal | métal | 200 pattes | sol dallé, clôture grise et poteaux à rivets |
| vol | Jardin des airs | vol | 200 pattes | sol vert pâle, nuages et fanions pastel |

| Famille | Niveau | Places | Plafond de pattes | Coût pour atteindre le niveau |
|---|---:|---:|---:|---:|
| Universel | 1 | 3 | 600 | achat 120 |
| Universel | 2 | 5 | 900 | 200 |
| Universel | 3 | 7 | 1 200 | 400 |
| Spécialisé | 1 | 3 | 900 | achat 200 |
| Spécialisé | 2 | 5 | 1 500 | 300 |
| Spécialisé | 3 | 7 | 2 100 | 600 |

Une case par habitat, quel que soit son niveau. Construction et amélioration immédiates, niveau par niveau ; pas de démolition, revente ou conversion. Le détail de niveau est un à trois repères sur la clôture. Les occupants supplémentaires utilisent des rangées dédiées, sans changer la taille des lapins ni le rayon de sélection.

La compatibilité demande au moins le type de l'habitat parmi les types du lapin : Perroquet → feu/vol/universel, Feu Glacé → feu/neige/universel, Lunettes → métal/paille/universel. Achat, accueil en provenance de la nurserie et transfert vérifient compatibilité et places avant paiement ou mutation. Aucun déménagement automatique des anciens lapins. Une incompatibilité n'est jamais contournée par un complément en cœurs.

Les revenus utilisent exactement la même formule, sans bonus de type ou rareté. Les parents en reproduction continuent de produire dans leur habitat. Avant transfert, nourriture ou amélioration, l'avance temporelle calcule les revenus avec l'ancien état. Améliorer conserve les fractions et le stock atteint avec l'ancien plafond ; les revenus perdus à plein ne sont jamais récupérés. Déplacer un habitat conserve occupants, type, niveau et stock.

Les destinations affichent type, effectif/capacité et refus explicites. Boutique en trois sections ; panneau d'habitat avec revenus horaires, stock/plafond et coût/effet du niveau suivant. L'amélioration et les deux extensions demandent une confirmation. Achat spécialisé, amélioration et deuxième extension acceptent le complément facultatif de pattes par cœurs aux tarifs existants, après validation des autres conditions. Annuler un placement ou une confirmation ne dépense rien.

Commandes : `buyBuilding` conserve `kind: enclosure` et accepte `habitatType` (universel par défaut) ; `upgradeHabitat` porte `id` et `fromLevel` ; `expand` porte `stage` 1 ou 2 (1 par défaut pour les anciens appels). Le niveau attendu et l'étape d'extension refusent les confirmations périmées et doubles dépenses. Toutes passent par le contrôleur et la même simulation transactionnelle.

Terrain initial 3 × 2 ; première extension 6 × 2 ; deuxième 9 × 2. Le second achat exige le premier. La mission `bigger-meadow` reste liée au premier et ne redonne pas sa récompense. Les coordonnées existantes ne changent pas. Le rendu montre la prochaine bande d'herbes hautes et adapte les limites latérales. Zoom initial 1,05, minimum 0,8 et maximum 1,65 conservés ; le recentrage garde son point de référence. Aucun ajustement de bornes ou d'orientation n'est appliqué au milieu d'un geste tactile.

### Sauvegarde version 4

Chaque bâtiment reçoit `habitat` : `{type, level}` pour les enclos/habitats, `null` pour les autres bâtiments. `expanded` conserve le droit à la première extension ; `secondExpanded` ajoute celui de la seconde. Ces données persistantes imposent v4.

- Depuis v3 : anciens enclos → universels niveau 1 ; deuxième extension non acquise. Tous les autres champs sont copiés, notamment missions acquises/réclamées, référence et compteurs quotidiens, cœurs/cadeau, occupants, identifiants, coordonnées, fractions, délais, découvertes et réservations. Aucun nouveau cadeau ni récompense automatique. Le temps avance ensuite normalement, avec les expirations quotidiennes habituelles.
- Depuis v2 : migration des missions selon les règles historiques, sans redotation de cœurs, puis ajout des habitats.
- Depuis v1 : règles historiques des cœurs et missions, puis ajout des habitats. Les 12 cœurs ne sont attribués qu'à cette migration historique.
- Export v4 ; import v1/v2/v3/v4 avec validation avant activation, annulation et échec d'écriture sans remplacement de la partie active. Aucune fusion des sauvegardes.
- Validation des types, niveaux entiers 1–3, plafonds, effectifs, compatibilité de chaque occupant, cases et ordre des extensions. Un habitat non valide ne peut pas être importé.
- Clé active inchangée `prairie-lapins.save.v1`. Copie brute v3 avant migration sous `prairie-lapins.backup.before-v4`. Les copies historiques v1 et v2 gardent leurs clés. Un échec de copie/écriture conserve l'ancien contenu actif et signale l'erreur. Les anciennes versions du jeu ne lisent pas v4.

Le mode test garde stockage et horloge séparés. Aucune ressource de test n'est attribuée automatiquement ; le scénario facultatif du guide ne remplace la partie de test qu'après un import explicite. Les sauvegardes restent locales, liées à l'origine et sans garantie de permanence.

## Consolidation visuelle — prairie, habitats et occupants

La prairie reçoit une ombre légère sous sa bordure, des nuances végétales douces et des fleurs déterministes. Le décor végétal reste à l'écart des empreintes des bâtiments. Il n'utilise jamais le générateur aléatoire de la reproduction.

Les sept variantes d'habitat partagent un socle bas, un sol texturé, une bordure claire et une clôture avec un à trois repères de niveau. Les six spécialisés utilisent les couleurs et motifs de la table précédente. Les motifs les plus grands restent sur les bords pour laisser les visages et les bulles lisibles. Les sources des dessins vectoriels originaux sont `src/display/habitatArt.ts` ; aucun asset externe ni décoration achetable n'est ajouté.

Les dispositions de quatre à sept lapins sont adaptées à l'effectif : quatre en deux rangées de deux, cinq en trois puis deux, six en deux rangées de trois, sept en trois puis deux puis deux. Les trois emplacements initiaux restent inchangés. Les lapins avant sont remontés pour dégager le nom de l'habitat et sa bordure. Oreilles, ailes, plumages, lunettes et autres signes distinctifs des onze espèces sont conservés.

Le rendu classe les occupants selon leur profondeur animée. La sélection suit le centre visible du corps à chaque image ; elle choisit le corps le plus proche du toucher et, seulement à distance égale, le lapin au premier plan. La liste du panneau d'habitat reste un autre moyen de choisir chaque individu.

Les petits déplacements sont limités à ±3 pixels horizontalement et ±1,5 pixel verticalement, avec un bond supplémentaire de 5 pixels après nourriture. Ces mesures sont dans les coordonnées du monde avant zoom. La taille des lapins reste ×1,3, le rayon de sélection reste 27 pixels écran, et les boutons/panneaux gardent leurs dimensions tactiles. La projection régulière de 176 × 148 par case et les zooms minimum 0,8, initial 1,05 et maximum 1,65 sont conservés.

Cette passe ne change aucun état persistant, règle économique, probabilité, revenu ou capacité. Le format reste v4, avec les mêmes migrations et les mêmes clés `prairie-lapins.save.v1` et `prairie-lapins.development.*`. L'aperçu conseillé utilise le port 5175 et `?dev=1`, séparément de la version utilisée sur 5173. L'origine changeant avec le port, le transfert d'une partie se fait par export/import volontaire ; le stockage de 5173 reste distinct.

La référence de 361 tests est complétée par huit tests utiles de disposition/sélection, notamment pour tous les occupants d'un habitat de niveau 3 aux zooms minimum et initial et aux extrema des mouvements : **369 tests réussis dans 10 fichiers**, TypeScript strict et build validés. Les essais dans Chromium, avec un viewport paysage de 852 × 393 et une partie de test séparée, complètent les parcours HTML simulés. Ils ne valident pas Safari ni les gestes sur iPhone physique ; le nouveau parcours humain et le bilan courant sont dans [visual-iphone-test.md](visual-iphone-test.md) et [progress.md](progress.md), avec les autres vérifications dans [habitats-iphone-test.md](habitats-iphone-test.md).

## Finition de la prévisualisation — 9 octobre 2026

Les douze identifiants, prix, empreintes et règles v5 sont conservés. La démonstration place effectivement les huit objets extérieurs et les quatre références intérieures (six exemplaires répartis sur deux habitats). Les trois places intérieures de chaque habitat restent distinctes des places de lapins.

Outils propres à Décorations : départ avec les ressources ordinaires ; démonstration aérée de tout le catalogue ; sept occupants et trois objets dans l’habitat initial ; terrain dense à deux extensions, 512 objets possédés dont 140 posés. Les exemplaires supplémentaires restent en réserve. Chaque changement de scénario demande confirmation et passe par le validateur/import transactionnel. Ces quatre commandes ne sont pas exposées dans le laboratoire ordinaire.

Pendant une pose : message neutre avant sélection, refus ou validation avec symbole et texte, commandes de confirmation/annulation visibles pendant le défilement. L’objet à son ancien emplacement est atténué pendant l’aperçu ; il retrouve son apparence entière après annulation ou sortie. Prix, économie, perspective, zoom et taille des lapins inchangés. Arbres et arches sont légèrement réduits, avec la même échelle pour l’aperçu et l’objet posé. Photo utilise toujours la capture système et laisse fonctionner les sauvegardes.


## Extension de contenu du 9 octobre 2026

Les quatre nouvelles espèces réutilisent la silhouette et l’animation existantes, avec couleur unie séparée des règles par identifiant stable. Aucun nouvel art ou accessoire. La v5 reste inchangée et les naissances en cours conservent identité/délais. Seule la prévisualisation Décorations reçoit ce catalogue pendant cette étape ; normal/laboratoire/comptes publiés restent v4 et onze espèces. Le scénario de collection est volontairement préparé à quinze espèces dans le test isolé, avec parents affection 10 et nid libre. Les missions et les formules de revenus/nourriture ne sont pas rééquilibrées. [Règles exactes](species.md).


## Début guidé facultatif — délais normaux

Le guidage d’interface suit le début actuel : caméra/Recentrer, fiche et repas de Paille (affection 2), achat/placement de ferme, petite production (5 minutes), collection pendant l’attente, récolte, repas de Neige (affection 2), reproduction gratuite Paille/Neige (20 minutes), place disponible et recette de Brumelin, transfert manuel, croissance puis accueil. Une première naissance commune suffit : aucun hybride n’est garanti et aucune probabilité n’est modifiée. Trois aides facultatives à usage unique peuvent terminer la première petite production, la première reproduction et la croissance de son résultat. Elles ciblent un travail précis, sont persistées atomiquement et ne changent ni l’horloge globale ni le tirage ; récolte, transfert et accueil restent manuels. Les anciennes sauvegardes sans droits n’en reçoivent pas automatiquement.

Une carte compacte propose un objectif, une phrase et « Me guider ». Ce bouton recentre ou ouvre un panneau, sans exécuter d’achat, nourriture, production, reproduction, transfert ou accueil. L’accentuation est statique et respecte la réduction des mouvements. Fermer les panneaux, quitter et reprendre le guidage depuis Paramètres reste possible ; aucune fonctionnalité n’est verrouillée.

Les étapes de jeu sont déduites de l’état et des événements persistés des missions. Les consultations collection/carnet et l’introduction caméra restent des préférences d’interface locales, indépendantes des récompenses et de la sauvegarde v8. Les actions anticipées sont reconnues. Une carte peut réclamer une mission prête par la commande existante, sans récompense supplémentaire ; l’identifiant réclamé reste sauvegardé et la mission disparaît. Les consultations sont réévaluées à partir des préférences persistées, sans dépendre d’un panneau encore ouvert. Une ancienne partie n’est ni réinitialisée ni inscrite automatiquement au parcours.

Nourrir augmente l’affection, sans faim ni entretien obligatoire. La suggestion de récolte de pattes apparaît seulement lorsqu’un habitat contient au moins une patte entière récoltable. Le jeu libre propose collection, affection et habitats, plus décoration et extension facultatives ; pour Terre, un deuxième habitat est suggéré si le premier est plein. Aucune cascade de fenêtres de tutoriel n’est déclenchée.


## Présentation de la monnaie principale

L’interface affiche désormais le montant et une pièce dorée illustrée, y compris dans les missions, revenus et confirmations. Le libellé accessible est « pièces ». Les noms internes historiques `pattes`, les tarifs et les sauvegardes v8 sont conservés. Voir [currency-coin.md](currency-coin.md).

## Boutique — parcours d’achat et de placement (étape 2)

Habitats, fermes et décorations : l’ouverture du placement est un aperçu sans propriété ni dépense. La confirmation revalide terrain acquis, empreinte, collisions et ressources, puis crée et paie atomiquement. Annuler retrouve la catégorie et son défilement ; une réussite sélectionne l’objet sur l’île. Une décoration peut aussi être achetée explicitement pour l’inventaire, sans placement ; la pose d’un exemplaire possédé reste gratuite. Les décorations restent exclues du complément en cœurs.

Pour un commun, vérifier d’abord les habitats compatibles et leurs places libres, parents au nid compris. Le choix se fait sur l’île (caméra disponible, autres actions neutralisées), puis le joueur confirme l’achat et l’accueil immédiat dans l’habitat choisi, même s’il est seul. Sans place, la boutique propose des habitats compatibles ou l’amélioration d’un habitat compatible non maximal, sans achat automatique. Les compléments en cœurs conservent leur confirmation, liée à la destination définitive. Les achats ne sont activés qu’après une sauvegarde réussie. Aucun nouvel état d’aperçu n’est sauvegardé ; recharger ne réalise aucun achat. Sauvegardes v8, prix et règles inchangés.

## Achats — paliers permanents (étape 3)

Les missions existantes portent les conditions : première naissance (`first-birth`) → Terre ; 3 découvertes (`varied-family`) → universel ; 5 (`growing-collection`) → Feu ; 7 (`seven-species`) → Volant. Paille, Neige, Bélier Gris et tous les habitats spécialisés restent disponibles au départ. Le nouvel objectif 7 espèces récompense uniquement le droit d’achat de Volant, sans monnaie. Les droits s’activent à l’atteinte du palier, avant réclamation et indépendamment de l’ordre d’affichage des missions. Une découverte est enregistrée seulement lors d’un accueil ou achat réussi ; aucune recette ni probabilité n’est filtrée par ces droits.

Les cartes verrouillées restent visibles avec condition et progression ; leur bouton ouvre le suivi du palier. Un raccourci d’habitat pour une espèce propose uniquement les habitats compatibles achetables. Une notification regroupe les nouveaux droits sans ouvrir la boutique. Les commandes d’achat et devis en cœurs vérifient ces droits à la confirmation. Prix, placement et accueil de l’étape 2 restent identiques.

Sauvegardes v8 : ajout compatible du champ optionnel `purchaseUnlocks`, enregistré par la même transaction que l’action réussie. À la lecture d’un état ancien sans ce registre, les découvertes, compteurs et objectifs déjà acquis/réclamés prouvent les paliers. Un commun déjà découvert conserve aussi son droit d’achat ; posséder plusieurs universels prouve leur droit historique. Un universel initial seul ne le prouve pas. Les nouvelles parties portent un registre vide, ce qui réserve ces exceptions aux états anciens. Aucun événement de naissance ni récompense n’est fabriqué. Les droits enregistrés restent acquis après départ d’un individu, changement de cycle ou import/rechargement du même état. Le nouveau départ de l’étape 4 est décrit ci-dessous ; les universels existants restent utilisables.

Laboratoire : « Achats — paliers 4 → 5 → 7 espèces » prépare quatre découvertes effectives, un Brumelin prêt à accueillir et des habitats compatibles. Son accueil débloque Feu au cinquième ; achat de Feu puis reproduction Paille/Terre permettent d’essayer le palier 7, sans garantie ni modification des probabilités.

## Étape 4 — départ Paille seul

Les nouvelles parties portent `startCourse: "paille-solo"` (champ optionnel v8). Un état sans ce champ conserve son ancien ordre de missions et son ancien guidage, sans transformation de bâtiment, retrait de lapin, nouveau droit d’aide ou récompense rétroactive. Les commandes refusent les deux nouveaux objectifs sur ces états.

Ordre initial : `snow-habitat` (posséder Jardin enneigé, aucune monnaie), `welcome-snow` (Neige effectivement découvert/accueilli, 60 pièces uniques), puis les anciens identifiants `first-meal`, `parents-ready`, `at-nest`, `first-farm`, `first-harvest`, `to-nursery`, `first-birth`, avec leurs récompenses inchangées. Une validation/réclamation fait disparaître l’objectif actif. Les actions anticipées restent acquises. Deux habitats reste une branche ultérieure, sans interrompre l’initiation.

Le guidage mène aux catégories Habitats puis Lapins, avec placement/accueil confirmés manuellement et annulation gratuite. Recette de Brumelin consultée avant reproduction gratuite ; ferme et petite production pendant l’attente ; collection, récolte, transfert, croissance et accueil. Une naissance commune suffit et débloque Terre lors de l’accueil. Brumelin peut entrer dans Paille ou Neige. Les trois aides ciblent toujours leurs travaux exacts et persistent ; si le nid est prêt, le transfert manuel devient prioritaire.

Budget sans revenus/cœurs : 300 − 200 − 80 + 60 = 80 ; ferme 60 et petite production 10 laissent 10 sans autre récompense. Avec tous les objectifs initiaux réclamés, après les deux repas et une première naissance : 140 pièces, 76 herbes, 12 cœurs (sans branches ni quotidiennes). Délais normaux : petite production 5 min en parallèle de reproduction 20 min ; croissance commune 5 min, Brumelin 15 min. Aucun prix, revenu, résultat ou probabilité changé. Emplacements libres possibles sur le centre : Neige (12,16) ou (20,16), ferme (16,12).

Laboratoire : « Début guidé — nouvelle partie » et aides inutilisées reprennent le nouveau départ exact ; conservation des aides prépare la croissance liée avec achats réels et récompense unique. « Début guidé précédent — compatibilité » garde l’ancien départ pour vérifier sa continuité.

## Chargement (26 octobre 2026)

Le moteur Phaser (environ 1,2 Mo minifié) est servi dans son propre fichier, séparé du code du jeu (environ 530 Ko) : `vite.config.ts`, `manualChunks`. Les deux se chargent en parallèle et le moteur, qui change rarement, reste en cache. L’écran de chargement n’active « Jouer » qu’une fois toutes les textures chargées (îles, bâtiments, lapins, icônes) ; il peut donc durer un peu plus longtemps sur une connexion lente, sans écran blanc ensuite.
