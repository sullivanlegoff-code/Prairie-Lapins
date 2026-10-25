# Agrandissement de l'île (+30 % demandé) — étape 1 : état des lieux et plan

**Décision du propriétaire (2026-10-17, transmise par l'agent de pilotage) : plan validé tel quel** (`877b587`) — parcelles 4 × 4 (+33,3 % par axe, île maximale 12 × 12), cases 176 × 148 inchangées, bâtiments de départ aux positions proposées, prix et niveaux des extensions inchangés, sauvegarde v11 avec la migration décrite (copie `before-v11`, décorations invalides en inventaire, refus sans écriture si un bâtiment restait invalide), découpage A, B, C accepté.

**Étape A réalisée** (`12404f9`) : source unique `src/config/islandGeometry.ts`. **Étape B réalisée** (`72d8240` géométrie et positions, `cc78052` sauvegarde v11, `7eafcea` laboratoire, `13ca1f6` caméra, `a134144` tests) : parcelles 4 × 4, `LEGACY_ISLAND` figée pour v1–v10, migration v11 et copie `before-v11` ; détails dans la Passation de `progress.md`. **Étape C réalisée** (jointure, mémoire, Recentrer, grille, contrôles navigateur ; voir la Passation de `progress.md`). **Chantier terminé**, en attente de l'essai iPhone du propriétaire.

2026-10-17, Claude Code. **Analyse seulement : aucun changement de jeu commité.** Décision du propriétaire : l'île de départ, chacune des 8 extensions et donc l'île maximale grandissent d'environ 30 % en largeur et en profondeur, arrondi aux cases entières, empreinte 4 × 4 des bâtiments conservée. Les sauvegardes existantes ne sont pas à préserver à tout prix, mais le chargement d'une ancienne sauvegarde ne doit jamais planter ni corrompre une partie.

## 1. État des lieux (lu dans le code à `d80668e`)

### Grille et parcelles

| Élément | Valeur actuelle | Source |
| --- | --- | --- |
| Case « grosse » (projection) | 176 × 148 unités monde, origine (120, 120) | `src/config/visual.ts` (`grid`) |
| Grille fine | 4 × 4 cases fines par grosse case, soit 44 × 37 unités | `FINE_GRID = 4`, `src/config/decorations.ts:19` |
| Parcelle | 3 × 3 grosses cases = 12 × 12 fines = 528 × 444 unités | `PARCEL_SIZE = 3`, `src/config/land.ts` |
| Carte | 9 × 9 grosses = 36 × 36 fines = 1584 × 1332 unités | `MAP_SIZE = 9`, `visual.grid.columns/rows = 9` |
| Parcelles | 9 : `center` (3,3) de départ, puis NO (0,0), N (3,0), NE (6,0), O (0,3), E (6,3), SO (0,6), S (3,6), SE (6,6), en grosses cases | `PARCELS`, `src/config/land.ts` |
| Bâtiment | 4 × 4 fines = 1 grosse case | `buildingFootprint`, `src/simulation/placement.ts` |
| Prix d'extension | `parcelles possédées × 500` : 500, 1000 … 4000 (18 000 au total) | `extensionPrice`, `land.ts` |
| Verrous de niveau | extensions 1 à 8 aux niveaux 4, 6, 8, 10, 12, 15, 18, 22 | `src/config/progression.ts:54` |
| Départ / maximum | 1 parcelle (9 grosses cases) / 9 parcelles (81) | `createGame`, textes `GameUI.ts:899,907` |

Une parcelle accueille au plus 9 bâtiments (une grosse case chacun).

### Ce qui dépend de ces dimensions

- **Règles** : `parcelAt` (littéraux `9` et `3`), `acquiredCell`, `acquiredFootprint` (`land.ts`) ; tout placement de bâtiment ou de décoration passe par `footprintPlacementReason` (`placement.ts`). `terrainWidth`/`visibleColumns` renvoient `9` en dur (`src/simulation/habitats.ts:12-13`). L'heuristique « aucune case libre » utilise `parcelles × 9` (`src/ui/models.ts:50`).
- **Bâtiments de départ** (`src/state/initial.ts`) en cases fines : nid (12,12), nurserie (20,12), habitat Paille (16,16). C'est-à-dire, dans la parcelle centrale (12 à 23) : nid et nurserie sur la première rangée, aux deux bords, et Paille centré dessous. Le groupe occupe les colonnes locales 0 à 11 et les lignes 0 à 7 : 4 rangées vides en bas.
- **Décorations** : emplacements `outside` en cases fines, vérifiés comme les bâtiments ; les emplacements `habitat` (slots) ne dépendent pas de la carte. Le scénario dense parcourt `36 × 36 = 1296` cases (`src/dev/scenarios.ts`).
- **Caméra** (`src/ui/gestures.ts`) : point de départ et Recentrer sur `focusX/focusY = 4.5` (centre de la parcelle centrale) ; limites `bounds` dérivées de `columns/rows` ; `fullIsland()` et `minimumZoom` (adapter la carte entière avec 80 px d'eau) ; `clamp()` garde au moins 80 px d'une parcelle possédée visible. L'ancrage du pincement (`scale`) est indépendant des dimensions. Régions visibles construites avec `p.x + 3` et `p.y + 3` (`MeadowScene.ts:188-192`).
- **Rendu du terrain** : `drawParcelTerrain` (`src/display/parcelArt.ts`) en `3 * grid`, voisins en `±3`, 95 taches d'herbe par parcelle. Une texture par parcelle (`MeadowScene.drawGround`), avec une marge de 90 et une résolution plafonnée à 2 : actuellement 1416 × 1248 px, environ 7,1 Mo de mémoire graphique par parcelle, environ 64 Mo pour l'île complète. `islandArt.drawIslandTerrain` n'est appelé nulle part.
- **Mode Agrandissement et boutique Île** : contours et sélection des parcelles libres (`MeadowScene.ts:371-373`, `3 * grid`), centrage sur `p.x + 1.5` (`MeadowScene.ts:117`), vue d'ensemble `p.x + 3` (`MeadowScene.ts:99-103`), tap via `parcelAt(gridCell)` sur les grosses cases. Textes « + 9 cases » et « 81 cases » (`GameUI.ts:899,907`).
- **Laboratoire** (`src/dev/scenarios.ts`) : coordonnées fines en dur dans `fineBuildings`, `parcelEdges`, `decorationDemo`/`decoratedHabitat`/`decorationDense`, `manualBreeding` et la branche par défaut (`(3 + index % 3) * 4`). Tout scénario est revalidé par `decodeGame(encodeGame(s))`, donc une coordonnée invalide fait échouer le scénario sans corrompre la partie.
- **Tutoriel et missions** : aucune position en dur trouvée (`guidance.ts`, `missions.ts`). La mission d'extension compte les parcelles.
- **Tests** : environ 190 coordonnées littérales dans 27 fichiers sur 59. Les plus touchés sont `ui-dom` (44), `ui-models` (20), `simulation` (17), `buildings-v7` (17), `habitats` (12) et `decorations` (10). Fichiers liés à la carte : `parcels-v6`, `extension-levels`, `camera-overview`, `pinch-anchor`, `start-step4`, ainsi que les fixtures de migration (`tests/legacy.ts`, `tests/migration-fixtures.ts`, `tests/fixtures/published-v8-progression.json`). Toutes ne sont pas des cases fines : il y a aussi des points écran ou monde.
- **Contrôles navigateur** dépendant de coordonnées (9 sur 43) : `decorations-flow-check`, `farm-art-browser-check`, `farm-palette-check`, `island-browser-check`, `nest-art-browser-check` (déjà historique), `nest-design-check`, `nest-palette-check`, `nursery-art-browser-check`, `parcels-browser-check`.

### Sauvegarde v10

- Les bâtiments (`x`, `y`) et les décorations `outside` sont stockés en **cases fines absolues** ; les parcelles par **identifiant** (`acquiredParcels`). Les lapins, recettes, missions et productions n'ont pas de coordonnées.
- La validation de v7 à v10 (`src/persistence/json.ts`, superRefine) appelle `buildingPlacementReason` et `decorationPlacementReason` **avec la géométrie courante**. Si l'on agrandit les parcelles sur place, une partie v10 est jugée selon la nouvelle carte : nid (12,12) hors du nouveau centre (16 à 31), donc « Invalid building ». Le contrôleur passe alors en `invalid-save` (`GameController.load`) : **pas de plantage ni d'écrasement**, mais la partie devient illisible. Les migrations v1 à v6 (`json.ts:221-231`) produisent elles aussi des coordonnées dans l'ancienne géométrie.
- Conclusion vérifiée dans le code : **il faut une v11 et une migration**, et la validation des versions ≤ 10 doit utiliser l'**ancienne** géométrie. Précédent utile : la migration v6 vers v7 range déjà en inventaire une décoration devenue invalide (`json.ts:231`).

### Plateau « penché »

Le diagnostic (`docs/iphone-zoom-diagnosis.md`) établit une projection régulière, avec une profondeur comprimée 148/176 ≈ 0,84 sans cisaillement. L'impression vient plutôt du mélange de styles. Le plan **ne touche pas** à la taille des cases (176 × 148) : on ajoute des cases, le rapport reste 0,84 et n'est pas accentué. Le rapport d'une parcelle reste aussi identique : 704/592 = 528/444 = 1,19.

## 2. Plan chiffré

### Dimensions retenues

Arrondi à **4 × 4 grosses cases par parcelle** (16 × 16 cases fines). La cible exacte serait 3 × 1,3 = 3,9 grosses cases, ou 15,6 cases fines.

| | Actuel | Cible | Écart réel |
| --- | --- | --- | --- |
| Parcelle (départ ou extension), grosses cases | 3 × 3 = 9 | **4 × 4 = 16** | +33,3 % par axe, +77,8 % en surface |
| Parcelle, cases fines | 12 × 12 | **16 × 16** | +33,3 % |
| Parcelle, unités monde | 528 × 444 | **704 × 592** | +33,3 % |
| Bâtiments max par parcelle | 9 | 16 | |
| Île maximale, grosses cases | 9 × 9 = 81 | **12 × 12 = 144** | +33,3 % par axe |
| Île maximale, cases fines | 36 × 36 | **48 × 48** | |
| Île maximale, unités monde | 1584 × 1332 | **2112 × 1776** | |
| Positions des parcelles (grosses cases) | 0, 3, 6 | **0, 4, 8** | même disposition 3 × 3 |
| Point de recentrage `focusX/Y` | 4,5 | **6** | centre de la parcelle centrale |

15 cases fines (+25 %) est écarté : le bord des parcelles ne tomberait plus sur les grosses cases (15/4), alors que `parcelAt`, le tap d'extension et le rendu travaillent en grosses cases. 16 est l'arrondi entier le plus proche qui respecte la grille. **L'écart réel est donc +33 %, pas +30 %.**

### Bâtiments de départ

Le groupe garde son ordre et sa disposition relative. Il est décalé de **(+2, +4) cases fines à l'intérieur de la parcelle**, ce qui centre son empreinte de 12 × 8 dans les 16 × 16 : marge de 2 de chaque côté, de 4 en haut et en bas. Son centre coïncide avec le recentrage.

| Bâtiment | Actuel | Cible |
| --- | --- | --- |
| Nid | (12, 12) | **(18, 20)** |
| Nurserie | (20, 12) | **(26, 20)** |
| Habitat Paille | (16, 16) | **(22, 24)** |

### Stratégie de sauvegarde recommandée : v11 avec remappage par parcelle

1. Introduire une géométrie explicite : `LEGACY_LAND` (parcelle 3, carte 9) et `LAND` (parcelle 4, carte 12). Les fonctions de terrain prennent la géométrie en paramètre. La validation des versions 1 à 10 et leurs migrations existantes restent en `LEGACY_LAND`, sans changement.
2. Nouvelle **v11**, seule version écrite, validée en `LAND`. Migration unique de toute version ≤ 10 : d'abord la chaîne existante jusqu'à l'état v10 (ancienne géométrie), puis remappage de chaque coordonnée fine :
   `x' = 16 × ⌊x / 12⌋ + 2 + (x mod 12)` et `y' = 16 × ⌊y / 12⌋ + 4 + (y mod 12)`,
   appliqué aux bâtiments et aux décorations `outside`. Les parcelles possédées, la rotation, les occupants, les productions et les missions sont inchangés.
3. Propriétés démontrées, à vérifier par tests. La fonction est strictement croissante, avec un pas ≥ 1 par case. Les écarts entre objets ne diminuent jamais (+4 en franchissant une frontière de parcelle), donc **aucun chevauchement n'est créé**. Chaque case remappée reste dans une parcelle du même rectangle de parcelles d'origine, donc **sur un terrain possédé**. Le maximum vaut 32 + 4 + 11 = 47 < 48, donc **dans la carte**. Une partie neuve v10 migrée donne **exactement** la disposition de départ cible ci-dessus.
4. Filet de sécurité : l'état migré est revalidé en v11. Une décoration `outside` qui serait invalide passe en inventaire (même règle qu'en v7). Si un bâtiment restait invalide, la migration est refusée, le statut devient `invalid-save` et rien n'est écrit. Cela ne devrait jamais arriver selon le point 3.
5. Copie brute avant migration sous `prairie-lapins.backup.before-v11`, comme pour v10. Aller simple : un client v10 ne lit pas une partie ni un export v11.

**Partie v10 chargée** : migrée une fois en v11. Tout reste au même endroit relatif dans sa parcelle, et chaque parcelle gagne une bande libre de 2 cases à gauche, 2 à droite, 4 en haut et en bas (une rangée entière de grosses cases en plus). Rien n'est perdu, aucun débit, aucune récompense. La remise à zéro des anciennes parties n'est pas recommandée : elle détruirait silencieusement une partie alors que la migration est simple et prouvable.

### Prix et niveaux

**Inchangés** (500 × n ; niveaux 4 à 22). Pas d'incohérence bloquante : chaque extension offre 16 grosses cases au lieu de 9 au même prix, soit 78 % de place en plus par pièce. C'est un assouplissement, à surveiller seulement si l'économie de décoration devient trop généreuse. Textes à corriger : « + 16 cases », « 144 cases ». L'heuristique `models.ts:50` passe à `× 16`.

### Points de vigilance (observés sur la maquette, voir section 3)

- **Mémoire graphique** : une texture de parcelle à la résolution 2 ferait 1768 × 1544 px, soit environ 10,9 Mo ; environ 98 Mo pour 9 parcelles, contre 64 Mo aujourd'hui. Risque sur iPhone. Je propose de plafonner la résolution à 1,6, ce qui revient à environ 63 Mo, comme aujourd'hui. À mesurer et à faire valider visuellement.
- **Jointure visible** : sur la maquette, une fine ligne verticale apparaît entre deux parcelles sur l'île maximale en 390 × 844, au zoom minimal (≈ 0,15). Elle est absente de l'actuel au même cadrage. Cause **non diagnostiquée** : échantillonnage des textures au fort dézoom, ou bord dessiné. À traiter dans le prompt C.
- **Zoom minimal** : l'île maximale entière se voit vers 0,16 en portrait, contre 0,21 aujourd'hui. La règle `minimumZoom` s'adapte déjà ; détails peu lisibles à ce zoom, comme aujourd'hui.
- La densité du décor herbeux est portée à 169 taches par parcelle (95 × 16/9) dans la maquette, pour garder le même aspect.

## 3. Découpage en prompts

**Prompt A — géométrie paramétrée, sans changement visible.**
Une source unique de géométrie (`LAND` / `LEGACY_LAND`) ; tous les littéraux `3`, `9`, `1.5`, `36`, `81`, `95` dérivés de cette source (land, visual, habitats, parcelArt, MeadowScene, GameUI, models, scénarios) ; fonctions de terrain paramétrées ; validation ≤ v10 explicitement en `LEGACY_LAND`. **Valeurs inchangées (3 et 9).** Tests : la suite complète passe sans modifier une seule assertion ; nouveau test qui vérifie que `LAND` égale `LEGACY_LAND` à cette étape et que `parcelAt` ou `acquiredFootprint` donnent les mêmes résultats sur toute la carte. Typecheck et build.

**Prompt B — passage à 4 × 4, sauvegarde v11.**
`LAND` passe à parcelle 4 et carte 12, recentrage 6, positions de départ cibles, textes 16/144. v11, migration et remappage, copie de sauvegarde, filet de sécurité. Scénarios du laboratoire remappés par la même fonction. Tests à écrire :
- remappage croissant, dans la carte, sans chevauchement ;
- migration de toutes les fixtures v1 à v10 en v11 valides ;
- partie neuve v10 migrée égale à la disposition cible ;
- tests de propriété sur des états v10 aléatoires remplis (bâtiments et décorations, île complète) : zéro refus ;
- aller-retour v11 et refus d'un état incohérent sans écriture ;
- copie `before-v11`.

Les tests existants dont les coordonnées changent sont adaptés via un helper de remappage, en **listant chaque assertion modifiée** (règle 8), sans en affaiblir aucune. Suite complète avec un worker, typecheck, build local.

**Prompt C — rendu, caméra et vérifications.**
Plafond de résolution des textures et mesure de la mémoire ; diagnostic et correction de la jointure ; recentrage, vue d'ensemble, `clamp` et pincement contrôlés en 390 × 844 et 844 × 390 ; mode Agrandissement et boutique Île ; mise à jour des 9 contrôles navigateur concernés (ou statut historique justifié) ; captures avant/après ; `build:netlify` sans publication ; essai iPhone local à proposer au propriétaire.

## 4. Captures de contrôle (maquette temporaire non commitée)

Dossier hors Git : `<dossier-temporaire>\prairie-island-size-20261017\`

- `actuel\` : build local `9b47b07` (jeu identique à HEAD) ;
- `cible-plus33\` : build temporaire, révision `temp-island-plus33`, sources modifiées puis restaurées ;
- dans chaque dossier : `depart-*-ensemble.png`, `depart-*-recentre.png`, `maximale-*-ensemble.png`, en 390 × 844 et 844 × 390, plus `report.json` (aucune erreur navigateur) ;
- `build-cible\` : le build temporaire lui-même.

Les captures utilisent les scénarios existants du laboratoire « islandStart » et « islandFull », dans des contextes neufs. Le zoom d'ensemble est calculé pour cadrer l'île avec une marge d'eau, le même calcul s'appliquant à l'actuel et à la cible. Chromium sur PC, pas un iPhone.

La maquette ne modifiait que les constantes de carte (land, visual, habitats), les `3` du rendu (parcelArt, MeadowScene) et les positions de départ. Elle ne contenait **ni migration ni v11** : elle ne doit jamais charger une vraie sauvegarde. Sources restaurées par `git checkout` des six fichiers ; `git status` propre vérifié.

## 5. Coordonnées en dur restant après l'étape A (à traiter à l'étape B)

Comptage heuristique au `12404f9` : couples `x:…, y:…`, `"x":`, `emptyBuilding(…, x, y)` et appels `finePoint`/`gridPoint`/`destination`/`acquiredCell`/`acquiredFootprint`/`buildingPlacementReason`/`parcelAt`/`fineCell` avec un littéral. Il inclut des points écran ou monde et des décalages de rendu qui ne changeront pas : c'est une liste de fichiers à relire, pas un nombre exact de modifications.

Tests : `ui-dom` 44, `ui-models` 39, `buildings-v7` 37, `habitats` 18, `simulation` 17, `island-geometry` 14 (attentes de l'étape A, à remplacer par les nouvelles valeurs), `parcels-v6` 13, `camera-overview` 12, `decorations` 11, `rabbit-layout` 9, `purchase-birth-xp` 9, `manual-breeding` 9, `pinch-anchor` 7, `start-step4` 6, `decoration-xp` 6, `snow-art` 5, `hearts` 5, `level-gates` 4, `migration-fixtures.ts` 3, `guidance` 3, `start-economy` 2, `new-species` 2, `missions` 2, `missions-current` 2, `initiation` 2, `foundations` 2, `collection` 2, `purchase-unlocks` 1, `decoration-levels` 1. Plus le texte attendu « + 9 cases » (`ui-dom.test.ts:560`).

Fixtures de sauvegardes anciennes (`tests/fixtures/published-v8-progression.json` 26, `before-habitats-v3.json` 4, `before-collection-v2.json` 3, `docs/test-saves/*`) : **ne pas modifier**, ce sont les entrées de la migration ; seules les attentes après migration changent.

Contrôles navigateur (`docs/*.cjs`) : `farm-art-browser-check` 15, `nest-design-check` 11, `fine-buildings-browser-check` 11, `nest-palette-check` 10, `farm-palette-check` 8, `decorations-flow-check` 6, `nursery-art-browser-check` 5, `nest-art-browser-check` 5 (déjà historique), `decorations-browser-check` 5, `island-browser-check` 4, `guided-start-public-check` 4, `touch-policy-public-check` 3, `fine-buildings-public-check` 3, `decorations-selection-check` 3, `visual-browser-check` 2, `ui-comfort-public-check` 2, `missions-current-public-check` 2, `initiation-public-check` 2, `stability-browser-check` 1, `parcels-browser-check` 1, `camera-overview-browser-check` 1. Les contrôles `*-public-check` visent des publications passées : à marquer historiques ou adapter à l'étape C.

Code du jeu (étape B) : positions de départ `src/state/initial.ts` ; coordonnées des scénarios `src/dev/scenarios.ts` (`fineBuildings`, `parcelEdges`, `decorationDemo`/`decoratedHabitat`/`decorationDense`, `manualBreeding`, branche par défaut `(3 + index % 3) * 4`) ; sauvegarde `src/persistence/json.ts` (validation ≤ v10 à figer en ancienne géométrie, largeur `9` des versions ≤ 6) et `LAND` hérité de `src/config/habitats.ts`.
