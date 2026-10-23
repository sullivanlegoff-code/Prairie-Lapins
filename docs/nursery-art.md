# Nurserie v2 — état final validé

Référence actuelle de la Nurserie (mise à jour le 2026-10-22, dépôt au commit `aaa16cd`). Le code fait foi ; ce document le résume. L'ancienne Nurserie (bâtiment-lapin rond, quatre couchages peints) est décrite en fin de page, section « Ancienne version ».

## Règles de jeu

- **Une seule Nurserie.** Elle fait partie des bâtiments de départ (`placeStarterBuilding` ne sert qu'à la recréer si elle manque), jamais achetable (`buyBuilding` refuse `nursery`), jamais vendable (aucune commande de vente de bâtiment) et jamais dupliquée (limite 1, vérifiée à l'achat et à la lecture d'une sauvegarde). Elle reste **déplaçable** (`moveBuilding`). Empreinte logique 4 × 4, sélection et zone tactile inchangées.
- **Sauvegarde v13.** `Building.nursery = {capacity: 1..4, babies: [{slot: 0..3, birth, startedAt, readyAt}]}` remplace l'ancien champ `baby`. Capacité initiale **1** ; la migration v12 → v13 place un éventuel bébé en `slot 0`, capacité 1, sans modifier ses dates ni son identifiant (sauvegarde brute conservée sous `prairie-lapins.backup.before-v13`, avec le mécanisme de copies numérotées existant). La validation rejette doublons de slot, slot ≥ capacité, bébés > capacité, charge utile sur un autre bâtiment et deuxième Nurserie.
- **Progression permanente 1 → 2 → 3 → 4**, un couchage à la fois, **en Cœurs uniquement** (jamais de pièces). Commande `unlockNurserySlot {fromCapacity, expectedCost}` : refus atomiques `MISSING_BUILDING`, `STALE_ACTION` (demande périmée ou double clic), `MAX_NURSERY_CAPACITY`, `PRICE_CHANGED`, `NOT_ENOUGH_HEARTS`. Elle ne modifie que les Cœurs et la capacité : bébés, slots et délais restent identiques.
- **Tarifs centralisés et provisoires :** `NURSERY.unlockHearts` dans `src/config/balance.ts` (aujourd'hui 10, 25 puis 50 Cœurs). Ce sont des valeurs d'équilibrage à régler plus tard, pas des constantes structurelles. L'action et l'interface lisent le même prix via `nurseryUnlockQuote` (`src/simulation/nursery.ts`) ; les tests n'en copient aucun.
- **Slots stables.** Un bébé garde son slot jusqu'à son départ ; aucun bébé ne bouge. `transferBirth` place la naissance du Nid dans le **plus petit slot libre** sous la capacité ; si tout est plein, le Nid attend (`BUSY`). Les commandes qui visent un bébé (`welcome`, `accelerate`, `initiationAid`) portent son **`birthId`** : une demande périmée est refusée sans toucher un autre bébé, et l'aide gratuite du tutoriel reste liée à sa naissance. Les helpers purs sont dans `src/simulation/nursery.ts`.

## Rendu

### Base et overlays séparés
- **Base approuvée :** `public/assets/buildings/nursery-v2-base.png` (RGBA 1254 × 1254, quatre coussins vides, aucun bébé, voile, cadenas ni halo). Largeur monde 168, `originY` calculé depuis le contact au sol mesuré (ligne 1050 du PNG, sur le bord avant de l'empreinte), comme pour le Nid ; nom et bulle « Prêt ! » inchangés (`labelY` 73, `actionY` 46).
- **Quatre états par couchage**, dérivés de `nurserySlotStates` (verrouillé au-delà de la capacité, sinon vide, en croissance ou prêt ; prêt si `readyAt <= lastSimulatedAt`) :

| État | Overlays affichés |
|---|---|
| Vide | aucun (coussin seul) |
| Verrouillé | voile + cadenas |
| En incubation | bébé emmailloté partagé |
| Prêt | même bébé + halo doux statique |

  Le bébé est le même sprite, à la même échelle, pour toutes les espèces ; aucune espèce n'est lue pendant l'incubation. Il est couché dans son coussin (rotation −78°, image existante, non redessinée), le bâtiment restant droit. Le halo est un dégradé radial généré une fois, sans animation.
- **Modèle et configuration :** `src/config/nurseryArt.ts` (ancres, échelles, décalages, halo), `src/display/nurseryOverlayModel.ts` (placement pur), `src/display/nurseryOverlays.ts` (objets Phaser).

### Correspondance des slots et ancres
Repère commun : les pixels du PNG de la base, indépendants de la caméra (monde = pixel × `168 / 1254`). Les slots se remplissent par la rangée avant puis par la rangée arrière, de gauche à droite : le premier coussin utilisable est donc le plus proche et le plus grand.

| Slot | Position | Ancre (px) | Creux mesuré |
|---|---|---|---|
| 0 | avant gauche | (429, 522) | 363 × 183 |
| 1 | avant droit | (830, 522) | 361 × 180 |
| 2 | arrière gauche | (456, 338) | 313 × 154 |
| 3 | arrière droit | (801, 338) | 312 × 154 |

Les overlays de la rangée arrière sont à 88 % de ceux de la rangée avant. Échelles (fraction de la base) : bébé 0,245, voile 0,29, cadenas 0,10. Aucun couchage n'est interactif : une seule Nurserie sélectionnable.

### Rendu réel et aperçu de déplacement
Un même ensemble de 16 objets (`CushionSet`) sert au vrai bâtiment et à son fantôme, donc une seule implémentation des quatre états. Les objets sont créés une fois ; une signature (position et états) évite tout travail inutile. Pendant un déplacement, le vrai bâtiment garde ses overlays à son emplacement ; le fantôme à destination montre les quatre états actuels, avec la même opacité (0,55) et la même teinte (vert valide, rouge refusé) que sa base. Il suit la cellule pendant pan et zoom, se met à jour si un bébé devient prêt, se masque en mode photo, puis disparaît à l'annulation ou à la confirmation (objets conservés pour réutilisation, détruits à l'arrêt de la scène). Un import sans Nurserie supprime ses overlays.

### Sources, dérivés et régénération
- **Sources approuvées conservées, inchangées** : `nursery-v2-base.png`, `nursery-v2-baby.png`, `nursery-v2-veil.png`, `nursery-v2-lock.png` (1254² chacun). Empreintes (SHA-1 de blob Git) : base `ae79e797…`, bébé `345a98f9…`, voile `9b463845…`, cadenas `e4b25a0a…`.
- **Le jeu charge uniquement des dérivés** réduits : `nursery-v2-baby-192.png`, `nursery-v2-veil-192.png`, `nursery-v2-lock-96.png`. Tailles choisies d'après l'affichage maximal mesuré (le framebuffer Phaser vaut les pixels CSS ; au zoom 1,65, rangée avant : 68, 80 et 28 px pour un canevas complet). Origines et échelles restent exprimées dans le repère artistique 1254² (`sourceSize`), si bien que chaque dérivé tombe exactement où tombait sa source.
- **Régénérer** : `node scripts/derive-nursery-overlays.mjs` ; **contrôler** sans écrire : `node scripts/derive-nursery-overlays.mjs --check`. Réduction seule, moyenne d'aire en arithmétique entière sur couleur prémultipliée (déterministe, sans frange), aucune dépendance. Les sources doivent correspondre aux empreintes approuvées.
- **Gain (calcul, pas mesure de RAM iPhone)** : 3 × 1254² × 4 = 18 870 192 octets RGBA avant, 331 776 après (−98 %) ; PNG : 1 927 212 → 49 913 octets. Ce calcul n'inclut ni copies CPU, ni mipmaps, ni coûts du pilote. Les originaux restent dans `public/` et sont livrés mais jamais demandés par le jeu.

## Laboratoire et validation

### Scénarios du laboratoire (Paramètres → Scénarios préparés)
Définis dans `src/dev/scenarios.ts`, chargés dans la partie de test séparée (jamais dans le jeu normal ni dans son build) :
- **« Nurserie — déblocages »** : capacité 1, vide, exactement les Cœurs des trois achats ;
- **« Nurserie — quatre états »** : capacité 3 avec un bébé prêt (slot 0), un bébé en incubation (slot 1, deux minutes restantes), un couchage vide (slot 2) et un verrouillé (slot 3), une naissance terminée dans le Nid, des habitats avec place, des Cœurs pour le dernier déblocage et une accélération.

### Principaux contrôles
- **Tests :** `tests/nursery-v13.test.ts` (état et migration), `nursery-multi.test.ts` (slots, Nid, accueil, accélération, aide gratuite), `nursery-unlock.test.ts` (déblocages), `nursery-overlays.test.ts` (états, géométrie, dérivés), `nursery-scenarios.test.ts` (scénarios).
- **Navigateur (Playwright) :** `docs/nursery-overlays-browser-check.cjs` (overlays réels et fantôme ; nécessite un serveur Vite de développement, voir l'en-tête du script), `docs/nursery-scenarios-browser-check.cjs` (scénarios par le vrai sélecteur et l'interface), `docs/nursery-art-browser-check.cjs` (parcours Nurserie sur le jeu compilé, via `scripts/replay-land-checks.sh`).
- **Production :** `scripts/verify-production.mjs` (lancé par `npm run build:netlify` / `build:pages`) vérifie la base, les trois sources, les trois dérivés (signature, dimensions, alpha, empreintes) et l'isolation des scénarios.

### État de validation
- **Exécuté lors des missions précédentes**, dernier résultat rapporté : suite complète **79 fichiers, 1487 tests** ; typecheck et `git diff --check` propres ; build neuf jeu (42 fichiers) et laboratoire (38 fichiers) avec `verify-production` ; contrôle des overlays (14 vérifications), des scénarios (7 vérifications, en 844 × 390 et 667 × 375) et `nursery-art-browser-check`, tous sans erreur de page ; build compilé du laboratoire servi par l'adresse LAN, essayé en Chromium et WebKit sous Windows.
- **Pendant cette mission (documentaire) :** aucun build, replay ni test relancé ; seuls les chemins et commandes cités ont été vérifiés, ainsi que le diff.
- **Essai iPhone par le propriétaire :** il a testé sur iPhone en Safari, avec le build compilé du laboratoire servi localement (procédure : `docs/local-iphone-testing.md`) et rapporte : « J'ai testé sur iPhone, la Nurserie me paraît très bien et tout fonctionne bien. » C'est une validation du propriétaire ; aucun modèle, version d'iOS, mesure de performance ni capture de cet essai n'est consigné.
- **Mode écran d'accueil (standalone) : non confirmé.**

### Limites non bloquantes
- La bulle « Prêt ! » recouvre la porte et le médaillon au zoom normal : sa zone tactile limite `actionY` à 49 ; non retouchée.
- Les prix de déblocage sont provisoires, à régler ultérieurement ; un éventuel palier de niveau pour les déblocages n'est pas décidé.
- Le contrôle de publication de `../.github/scripts/verify-published.mjs` ne vérifie toujours que l'ancien `nursery-bunny-house.png`, pas les nouveaux assets ; non actualisé, la publication restant suspendue.
- Aux petites tailles (50 à 75 px de large), le cadenas et le halo ne sont plus lisibles ; les quatre coussins restent comptables.
- Trois contrôles historiques indépendants (`manual-breeding-browser-check`, `manual-breeding-public-check`, `guided-start-public-check`) échouaient déjà avant ce chantier, aux mêmes assertions ; non réparés.

## Ancienne version (Nurserie v1, remplacée)

Avant les commits `7889cb1` (état v13) et `8efb37d` (nouvelle base), la Nurserie utilisait `public/assets/buildings/nursery-bunny-house.png` (RGBA 1254², blob `468b2e72…`) : un bâtiment-lapin rond avec visage et oreilles, quatre couchages pastel **toujours vides** peints dans l'image, sur une planche de bois en losange. Un seul bébé à la fois (champ `baby`, sauvegarde ≤ v12), aucun déblocage. L'original de référence est conservé dans `docs/references/nursery/Nurserie-original.png`.

Cet asset reste dans `public/` (il est encore cité par le script de publication ci-dessus) mais n'est plus chargé par le jeu. Les anciennes captures de `docs/proofs/nursery/` montrent ce rendu v1, **pas** le rendu actuel ; les captures de la v2 ont été produites hors dépôt à chaque mission et ne sont pas conservées ici.
