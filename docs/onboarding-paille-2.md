# Tutoriel de Paille — compte rendu

Travail réalisé sur `feature/onboarding-paille`, en conservant la mise en scène non commitée présente au départ. Aucun `git add`, commit ou push. Le dossier `.claude/`, déjà présent, n’a pas été modifié.

## Parcours et déclencheurs

Les étapes sont dérivées de la sauvegarde, des horodatages et des préférences ; aucun compteur d’étape n’est ajouté à la simulation. Les répliques et les libellés des boutons de Paille sont centralisés dans `src/ui/onboarding.ts`.

| Étape | Déclencheur réel | Action guidée |
| --- | --- | --- |
| 1 | Absence d’habitat Neige | Scène d’accueil et prénom via `renameRabbit`, Boutique/Habitats, Jardin enneigé, fantôme préposé et bouton Confirmer. |
| 2 | Habitat Neige présent, Neige non découverte | Boutique/Lapins, Neige, choix du Jardin enneigé, confirmation de l’achat. |
| 3 | Neige découverte, mission `welcome-snow` non réclamée | Missions affichant directement Accueillir Neige et son bouton Réclamer : +50 pattes. |
| 4 | Récompense réclamée, ferme absente | Boutique/Bâtiments, ferme, zone libre conseillée ; aucune case sélectionnée avant le toucher du joueur, puis Confirmer. |
| 5 | Ferme présente, première récolte absente | Petite production, retour de Paille, aide gratuite `order`, nouveau retour de Paille, Récolter 20 herbes. |
| 6 | Récolte faite et affection d’un parent inférieure à 2 | Fiche et Nourrir pour le prénom choisi, puis fiche et Nourrir pour Neige. |
| 7 | Les deux parents ont affection 2, aucune reproduction lancée | Scène face à face, nid/Croiser, fenêtre avec Paille à gauche et Neige à droite, bouton rouge Croiser. |
| 8 | Reproduction en cours puis terminée | Aide gratuite `breeding`, retour de Paille, halo et main sur la bulle cœur du nid ; le toucher transfère le bébé et dirige la caméra vers la nurserie. |
| 9 | Lapereau dans la nurserie, puis croissance terminée | Répliques de la nurserie, aide gratuite `growth`, puis destination compatible libre mise en évidence pour l’accueil. |
| 10 | `missions.events.welcome > 0` | Déverrouillage immédiat, réplique finale puis nouvelle réplique sur les récompenses ; Voir les missions termine le tutoriel et ouvre les Missions. |

Le bouton de Paille navigue et met en évidence ; le joueur effectue chaque achat, repas, récolte, croisement, aide et accueil. Les autres boutons sont grisés, marqués `aria-disabled` et interceptés. Les ouvertures de panneaux et les sélections canvas sont également filtrées. L’activation clavier des boutons traverse le même filtre de clic. Paramètres, fermeture/reprise, Recentrer et Passer le tutoriel restent disponibles ; la fenêtre de croisement contient elle-même Paramètres et Passer le tutoriel.

La scène de dialogue assombrit le jeu sans bloquer les gestes de caméra autour des personnages et de la bulle. Le mode portrait est utilisable directement pendant ce parcours. Le placement possède un panneau bas en portrait et une caméra dirigée vers le fantôme ou la zone conseillée. La main cesse de bouger avec `prefers-reduced-motion`.

Fermer un panneau rejoue l’intervention courante. Recharger reprend depuis les faits réels et conserve le prénom. Une aide déjà utilisée propose l’attente ou les cœurs, avec le vrai bouton payant et sa confirmation habituelle. Les motifs de refus des règles restent affichés. Les anciennes parties sans `startCourse: paille-solo` et le laboratoire conservent leur présentation libre.

## Économie et premier lapereau

Seuls deux paramètres économiques changent : `BALANCE.initialGrass = 0` et la récompense `welcome-snow = 50`. Les données des sauvegardes existantes ne sont pas réécrites pour appliquer ces valeurs.

Parcours DOM sans autre récompense réclamée : pattes **300 → 100 → 20 → 70 → 10 → 0**, herbes **0 → 20 → 18 → 16**. Les trois aides sont enregistrées dans `initiation.used` ; aucun cœur n’est dépensé. Les cœurs passent de 12 à 13 par la récompense de niveau déjà existante ; ce gain n’a pas été ajouté par le tutoriel.

La simulation autorise déjà de réclamer une mission éligible et accomplie sans réclamer les objectifs précédents. L’interface affiche donc directement `welcome-snow` à l’étape 3. `snow-habitat` reste à réclamer après le tutoriel : aucune validation ni récompense supplémentaire n’est automatique.

Paille × Neige à affection 2 donne **Frisket ou Icy, à 50 % chacun**. Les deux espèces sont de types **Paille et Neige**, accessibles dès le niveau 1. La Prairie de paille et le Jardin enneigé ont chacun 3 places et un seul parent : les deux possèdent donc une place compatible libre. Le guidage met en évidence le premier habitat compatible libre ; les captures montrent aussi un accueil dans le Jardin enneigé. Aucune règle de reproduction ou d’habitat n’a changé.

## Fichiers touchés

Production :

- `src/ui/onboarding.ts`, `src/ui/PailleDialogue.ts` : tâches, répliques, retours et prénom.
- `src/ui/GameUI.ts`, `src/ui/guidance.ts`, `src/ui/preferences.ts` : navigation, verrouillage, dérivation des étapes et préférences.
- `src/display/onboarding.css`, `src/display/MeadowScene.ts`, `src/main.ts` : mise en scène, halos/mains, zone conseillée, caméra et import CSS.
- `src/config/balance.ts`, `src/config/missions.ts` : les deux changements économiques autorisés.
- `src/dev/scenarios.ts` : herbes explicites pour les scénarios historiques qui effectuent déjà des repas.

Tests : `tests/onboarding-dom.test.ts`, `tests/start-step4.test.ts`, `tests/ui-dom.test.ts`, `tests/regression-start.ts`, `tests/controller.test.ts`, `tests/catalog-reset.test.ts`, `tests/feed-breed-xp.test.ts`, `tests/level-gates.test.ts`, `tests/parcels-v6.test.ts`, `tests/progression-save.test.ts`, `tests/purchase-birth-xp.test.ts`.

Documentation : ce fichier.

## Assertions et fixtures adaptées

- `onboarding-dom.test.ts` : l’ancien parcours qui appelait directement les commandes est remplacé par deux parcours complets avec le vrai contrôleur et les boutons réels, tirages 0,1 et 0,65. Assertions des six soldes de pattes, des herbes 0/20/18/16, des trois aides, de 13 cœurs finaux, des deux espèces, des parents préremplis, du fantôme `(0,32)`, de l’absence de case présélectionnée pour la ferme, des actions hors étape inertes et de Recentrer. Reprises aux achats, récompense, production, repas, reproduction et nurserie ; prénom conservé. Aide consommée : bouton payant accessible puis récolte après attente. Le rafraîchissement du contrôleur conserve le halo du bouton de croisement. Fermeture et abandon du croisement, Paramètres, abandon global, anciennes parties et laboratoire vérifiés. Nouvelles répliques vérifiées littéralement.
- `start-step4.test.ts` : départ `[300,10,12] → [300,0,12]` ; après `welcome-snow`, `80 → 70` ; production après ferme, `30 → 0` dans le nouvel ordre du parcours ; fin avec toutes les récompenses explicitement réclamées, `[140,76,14] → [130,66,14]` ; budget minimal final `[10,13] → [0,13]`. La ferme et sa récolte précèdent les repas ; le guidage attend `breed` après les repas et `transfer` après le lancement. L’ordre exact des neuf missions réclamées est adapté à ce parcours et reste vérifié sans autoriser de mission supplémentaire.
- `level-gates.test.ts` : pattes après accueil récompensé `80 → 70`, puis après ferme `20 → 10`.
- `parcels-v6.test.ts` : ressources initiales `[300,10,12,1] → [300,0,12,1]`.
- `progression-save.test.ts` : ressources initiales `[300,10,12] → [300,0,12]` ; deux fixtures de repas reçoivent explicitement 10 herbes afin de conserver leurs assertions de gain d’XP et de rollback.
- `controller.test.ts` : résumé d’import `grass:10 → grass:0` ; fixtures explicites à 10 herbes pour les tests d’immutabilité et d’échec de sauvegarde d’un repas. Leurs assertions de 8 ou 10 herbes sont conservées.
- `ui-dom.test.ts` : herbes de la partie neuve du laboratoire après récompense de ferme `30 → 20` ; ancien raccourci Me guider remplacé par le bouton de Paille, Jardin enneigé et budget 300 vérifiés. Le test de présentation historique des aides utilise explicitement le scope laboratoire. Trois fixtures de repas servant à franchir des niveaux reçoivent 10 herbes ; les assertions de déverrouillage restent identiques. Doubles de scène complétés pour les nouveaux effets de guidage.
- `catalog-reset.test.ts` : l’action persistée après réinitialisation est un renommage réussi plutôt qu’un repas sans herbe ; les assertions de non-réinitialisation et de conservation de la partie sont inchangées.
- `feed-breed-xp.test.ts`, `purchase-birth-xp.test.ts` : fixtures de repas explicitement dotées de 10 herbes ; assertions métier conservées.
- `regression-start.ts` : les anciennes parties simulées conservent explicitement leurs 10 herbes historiques ; cela évite de modifier les assertions des régressions des anciennes parties.

## Validations exécutées

- `npm run typecheck` : succès.
- `npm test -- --configLoader runner --maxWorkers 2` : **123 fichiers, 1 944 tests réussis**.
- `npm test -- --configLoader runner --maxWorkers 2 tests/start-step4.test.ts` : **4 tests réussis**, après renforcement de la vérification de l’ordre exact des missions.
- `npm run build -- --configLoader runner` : succès ; avertissement Vite sur la taille du bundle principal, sans erreur de compilation.
- `git diff --check` : succès.
- Chromium Playwright : captures 1100×850 et 390×844 ; vérification des rectangles des boutons ciblés, tous dans le viewport ; vérification que l’animation de la main vaut `none` en réduction des animations ; déplacement et zoom réalisés et comparés visuellement.

Le lancement Vite standard demandé a rencontré une erreur de lecture du chargeur esbuild dans cet environnement ; le même serveur a été lancé avec `--configLoader runner`, sur `127.0.0.1:5199`. Il est arrêté en fin de travail.

## Captures et limites

Dossier hors dépôt : `%TEMP%\prairie-onboarding-2`.

Pour chaque préfixe `1100` et `390` : `-step1.png`, `-step3.png`, `-step5.png`, `-step6.png`, `-step7.png`, `-step10-dialogue.png`, `-step10.png`, `-locked.png`. Vérification visuelle réalisée ; corrections du portrait, de la position du fantôme, de la lisibilité des parents sélectionnés et de la main proche du bord du panneau.

Captures supplémentaires : `-camera-before.png`, `-camera-pan.png`, `-camera-zoom.png`. Script reproductible : `capture.cjs`. Journaux : `tests-final.txt`, `build-final.txt`, `chromium-final.txt`, dans le même dossier temporaire.

Les captures de scènes sont préparées à partir d’états produits par `createGame` et `act`, puis les panneaux et mises en évidence sont ouverts par les boutons visibles. Le parcours complet sans commandes directes est vérifié dans le DOM simulé, avec le vrai contrôleur. Le transfert au moyen de la bulle cœur passe par `GameUI.select`, l’entrée publique du canvas. Le contrôle Chromium du zoom utilise la molette ; le pincement tactile et Safari sur appareil physique n’ont pas été essayés. Les gestes sur la zone occupée par une bulle ou un panneau restent naturellement capturés par cette interface.

`debug.log` et les journaux temporaires créés à la racine du dépôt ont été supprimés.
