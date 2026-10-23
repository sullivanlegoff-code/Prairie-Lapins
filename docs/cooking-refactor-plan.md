# Plan proposé — cuisine par manipulation d'objets

Audit du 17 octobre 2026, référence applicative `661ab84`, validé en `cab49fc`. Le **socle et la recette Salade sont implémentés**. Poulet reste prévu pour une étape ultérieure. Aucun bâtiment, récompense, sauvegarde, boutique ou déblocage.

## Socle réalisé le 17 octobre 2026

- Modules actifs : `recipes.ts`, `engine.ts`, `geometry.ts`, `scene.ts`, `drag.ts`, `ui.ts`, `main.ts`, plus `art.ts` pour les dessins SVG provisoires. Aucun ajout de dépendance. L'ancien service, son score et ses recettes ne sont plus exécutés.
- Repère logique **1000×440**, ajustement uniforme dans le viewport de scène après safe areas. Coordonnées client/logiques explicites ; dessin, hitbox (minimum 48 px CSS) et zone de dépôt distincts. Les objets DOM sont stables pendant le geste. Le redimensionnement réinitialise les positions sans interpolation ; seules les fins de drop sont animées.
- Modèle : id/type/kind, préparation, emplacement/zone, flags, ancre, home, draggable, visible, interactive. Snapshots copiés. Intention `select` ou `drop` vers une zone ou un objet ; validation et prévisualisation partagent les règles du moteur. Un aliment à la fois sur la planche, retour à sa réserve ; préparation conservée. Couteau : retour au support et détection de l'aliment sur planche, sans découpe. Saladier/four déclarés mais refusés pour l'instant ; bouteilles sélectionnables, sans effet culinaire.
- Pointer Events avec capture sur la surface stable, décalage de prise, seuil **7 px CSS**, rendu temporaire par rAF. Aucun effet logique avant pointerup valide. Destination calculée géométriquement sous capture, priorité objet/zone déterministe. Refus : retour à l'ancre, message et feedback doux ; aucune pénalité.
- Politique **pinch-zoom** conservée sur la scène après essais Chromium tactiles et Pointer Events WebKit ; manipulation sur liens/boutons ordinaires. Second doigt annule et bloque jusqu'au relâchement des doigts. pointercancel/perte de capture/rotation/masquage/resize annulent sans progression ; les interruptions système oublient aussi les pointeurs dont le relâchement peut manquer.
- Portrait : scène invisible/inert et moteur bloqué. Paysage fondé sur matchMedia, recalcul par ResizeObserver/resize/visualViewport. Raisons de pause cumulées portrait/hidden/manual. Une horloge interne active est prévue pour les futures cuissons ; aucun chrono de partie ni cuisson n'est exécuté dans ce socle.
- Vérification : ciblés **25/25** ; navigateur **202/202**, dont **101 Chromium** (touches natives CDP) et **101 WebKit Windows** (drags natifs souris passant par Pointer Events, annulation/multitouch injectés), en 844×390, 667×375 et 1280×800, avec portrait 390×844. Ce ne sont pas des validations iPhone réelles. Anciennes assertions des règles retirées remplacées explicitement ; tests hors Cuisine inchangés. Détails finaux dans la passation et `cooking-minigame.md`.

## Recette Salade réalisée le 17 octobre 2026

- Sélection initiale générique par identifiant de recette ; Salade active, Poulet affiché indisponible. La sélection configure la visibilité des objets et démarre l'horloge de recette.
- Transitions moteur : aliment `whole` en `reserve` → planche libre ; intention `use-tool(knife, food)` si l'aliment entier est sur la planche → `cut`, couteau au support ; aliment coupé vers sa réserve en gardant sa préparation ou vers le saladier. Le saladier accepte les trois aliments coupés, puis les verrouille en place. Aucun état combiné position/préparation.
- Tap court sur `olive-oil` est une intention `select`. Il est refusé tant que les trois ids de nourriture ne sont pas coupés dans le saladier. Sinon le flag `oliveOilAdded` termine l'objectif ; la scène rend les ingrédients réellement dans le saladier et le filet d'huile.
- Résultat : temps actif et actions culinaires invalides (refus de drop/tap), sans score ni économie. Les pauses existantes gèlent le temps. Pointercancel, multitouch, orientation et interruptions système restent des annulations sans erreur. Rejouer réinitialise la source logique puis replace tous les objets sans transition visuelle pour éviter de saisir un sprite encore en mouvement.
- Validation : voir passation dans `docs/progress.md` et détails/procédure propriétaire dans `docs/cooking-minigame.md`. Aucun test iPhone physique de cette étape n'est revendiqué.
- Reste : recette Poulet (découpe, soja avant miel, four/cuire 5 s), test iPhone propriétaire de la Salade, polish visuel éventuel. La sélection alternative accessible par destination et l'aide après inactivité restent polish ultérieur.

## État constaté lors de l'audit initial (historique, avant le socle)

Route `/cooktap-prototype/`, servie en dev par Vite et compilée par un troisième sous-build isolé de `scripts/build-pages.mjs` (mode `cooking-prototype`, public propre). `main.ts` monte `ui.ts` et appelle `CookingSession.advance()` toutes les 100 ms avec un delta `performance.now()`. `engine.ts` contient les recettes, commandes et règles. `index.html` et `style.css` dessinent uniquement des cartes/boutons DOM : aucun Canvas, Phaser ou drag-and-drop. `ui.ts` délègue les clics natifs, conserve les boutons pendant les mises à jour et nettoie les listeners par AbortController.

Trois recettes actuelles : salade salade/tomate/fromage, pizza, pâtes. Trois commandes initiales, arrivée toutes les 6 s, maximum 3, expiration après 24 s, service de 75 s, score 100/60/30 selon rapidité, 0 en cas d'erreur. État de préparation par commande, cuisson de 3 s. Portrait et paysage autorisés actuellement. Pause sur visibilitychange/pagehide, reprise par bouton ; aucune gestion d'orientation dans les règles.

Tests : `tests/cooking-prototype.test.ts` (14 cas DOM/moteur), `docs/cooking-prototype-check.cjs` (180 contrôles cumulés Chromium/WebKit, taps, pas de véritables drags). Vérification d'isolation dans `scripts/verify-cooking-prototype.mjs`, entrée reconnue par `scripts/verify-production.mjs`. Derniers résultats consignés, non rejoués pendant cet audit : typecheck/build réussis, suite 1177/1177. Documentation : `cooking-minigame.md`, passation, notices et provenance vendor.

Conserver route, séparation des bundles/public, absence de stockage/audio, notifications accessibles, nettoyage et principe de temps explicite testable. Remplacer commandes, score, expirations, SESSION_MS, recettes actuelles, actions génériques par boutons et rendu des cartes. Garder vendor et licences comme provenance, hors runtime.

## Architecture recommandée

- `recipes.ts` : données des deux recettes et définitions de transitions typées.
- `engine.ts` : objets, emplacements, faits, transitions et objectifs ; aucune dépendance au DOM.
- `scene.ts` : scène DOM stable, décor SVG/CSS, représentation des états et zones.
- `geometry.ts` : coordonnées de scène, échelle, zones de contact et résolution des chevauchements.
- `drag.ts` : Pointer Events et capture ; envoie des commandes au moteur.
- `main.ts` : montage, horloge de cuisson active, visibilité et orientation ; `ui.ts` : sélection de recette, aides, résultat, recommencer.

Choix : **DOM positionné + SVG décoratif**, sans nouvelle dépendance. Isométrie dessinée dans le décor, pas de perspective CSS 3D sur les objets. Repère logique unique (par exemple 1000×560), ajusté dans l'espace réellement disponible, avec cibles tactiles mesurées en pixels CSS. Table en fond ; réserves autour ; planche au centre ; couteau à côté ; saladier et huile d'un côté, soja/miel et four de l'autre. Objets inutiles à la recette masqués. Z-index explicite et objet traîné au premier plan. Pas de collisions physiques nécessaires.

Modèle proposé : chaque `ItemInstance` a un id, un type/tags, une préparation (`whole`, `cut`, `raw`, `cooked`), un emplacement (`tray`, `board`, `bowl`, `oven`), des faits (`soyAdded`, `honeyAdded`, etc.) et un ancrage validé. L'état du saladier conserve les ids de ses contenus et l'assaisonnement. L'état de recette conserve les faits et le travail de cuisson restant. Ne pas confondre position et préparation : un aliment coupé peut retourner en réserve sans redevenir entier.

Une `RecipeDefinition` contient instances initiales, zones/capacités, transitions et objectifs. Une transition décrit événement (drop/tap/fin de cuisson), sujet/cible, conditions, effets et feedback. Conditions all/any typées ; effets limités (déplacer, changer préparation, ajouter fait/contenu, démarrer cuisson). Pas d'eval ni branche spécifique à un nom de recette. Le moteur vérifie références, états, capacités et conditions avant une modification atomique ; l'objectif générique détermine la réussite.

## Déroulement des deux recettes

**Salade** : pour chacun de mozzarella, tomate et concombre : réserve entière → drop planche libre → couteau déposé sur cet aliment → coupé sur planche → drop saladier. Le couteau revient toujours à son support après usage. Les trois branches sont indépendantes, donc six ordres de préparation possibles. Planche à une place ; aliment coupé déplaçable en réserve pour libérer la place si nécessaire. Dépôt d'un aliment entier dans le saladier refusé. Tap huile accepté quand les trois aliments coupés sont dans le saladier ; ajout unique d'huile, puis objectif atteint et validation automatique. Aucun bouton Servir obligatoire.

**Poulet** : cru en réserve → planche → couteau sur poulet → découpé → tap soja → tap miel → drop four → cuisson 5000 ms de temps actif → cuit → recette réussie automatiquement. Soja/miel ciblent le poulet de la recette active sur la planche. Le miel avant soja et l'entrée au four sans découpe/deux assaisonnements sont refusés. Les bouteilles restent à leur place. Aucun délai de service ni score.

## Tactile et interruptions

Pointerdown mémorise pointeur, décalage de prise et ancrage validé ; setPointerCapture maintient le suivi hors de l'objet. Seuil de quelques pixels CSS pour distinguer tap et drag ; pointermove ne change que la représentation temporaire, via transform/rAF. Pointerup convertit le point de contact utile en coordonnées de scène et teste les zones explicitement : ne pas utiliser event.target comme cible sous capture. Une zone valide émet une commande ; sinon retour à l'ancrage validé, feedback texte/visuel et aide éventuelle. Aucun effet de recette avant validation du drop. Pas de tap résiduel après un drag. Zones visuelles et zones tactiles distinctes (≥44–48 px réels), priorité déterministe si elles se chevauchent.

`touch-action: pinch-zoom` sur la surface pour laisser le zoom d'accessibilité et empêcher le pan à un doigt, `manipulation` sur les boutons ; valider ce compromis sur Safari. Deuxième doigt : annuler le drag, laisser le navigateur gérer le geste. Pas de verrou global du zoom ni de HTML Drag and Drop natif. Pointercancel, lostpointercapture, masquage, rotation et redimensionnement invalident la manipulation sans effet. Labels accessibles et alternative sélectionner l'objet puis sa destination pour ne pas imposer le drag à tous les utilisateurs.

Paysage détecté avec matchMedia(orientation), sans exiger screen.orientation.lock. Portrait : écran « Tournez l'appareil ou élargissez la fenêtre », scène inert et moteur bloqué. Ensemble de raisons de pause (`portrait`, `hidden`, `manual`) pour ne pas reprendre sur la mauvaise condition. Retour paysage : recalcul géométrique avant réactivation, état des objets et durée restante inchangés. Geste interrompu à recommencer. Même politique sur desktop étroit ; souris et stylet passent par Pointer Events. ResizeObserver pour la scène, resize/visualViewport pour la surface visible ; rotation distinguée d'un zoom via le viewport de mise en page.

## Validation prévue et ordre de travail

1. Définir données, invariants et transitions puis tests du moteur ; remplacer le service par choix de recette et réussite sans score.
2. Poser la table et les objets provisoires ; coordonnage et calques, sans illustrations définitives.
3. Implémenter capture/drag/drop/annulations ; alternatives tap et feedback.
4. Terminer salade (six permutations), puis poulet (soja avant miel et cuisson).
5. Ajouter blocage portrait/arrière-plan, gel de cuisson, reprise et nettoyage.
6. Adapter contrôles navigateur, notices/documentation et vérifier trois routes/build, puis suite complète un worker et essais iPhone propriétaire.

Tests à créer : transitions autorisées/refusées, aucune mutation après rejet, occupation planche, absence de doublons dans le saladier/assaisonnements, réussite exacte, cuisson avant/à 5000 ms, absence de score/commande/expiration ; conversion des coordonnées après mise à l'échelle/safe areas/rotation, zones agrandies et chevauchements ; vrai trajet down/move/up tactile, souris/stylet, seuil tap, capture hors sprite, drop hors table, second doigt, pointercancel et perte de capture ; orientation pendant drag/cuisson, pauses cumulées, état identique après retour, aucune progression en portrait ; reset/remount sans listeners multiples ; isolation jeu/labo/audio/stockage et notices inchangées. Les anciens tests des règles abandonnées seront remplacés explicitement, pas rendus artificiellement verts.

Risques réels : gestes système du bord, annulations Safari, chrome navigateur et safe areas, décalage visuel sous le doigt, cibles trop petites après réduction, perte de capture si DOM remplacé, timers suspendus/repris et événements de resize multiples. WebKit Windows utile mais insuffisant pour prouver ces points sur iPhone ou en écran d'accueil. Aucun ajout de bibliothèque prévu ; les illustrations futures détermineront surtout le poids.

Estimation : 7 fichiers prototype existants modifiés, 4 modules ajoutés, tests moteur/navigateur remplacés avec 1–2 fichiers de tests drag/géométrie en plus, documentation/passation mises à jour ; vérifier l'ajustement de `scripts/verify-cooking-prototype.mjs`. Environ **15–18 fichiers** au total, sans changement nécessaire à src/, dépendances, économie ou sauvegardes. Les scripts build/Vite devraient être conservés.

Références : [Pointer Events W3C](https://www.w3.org/TR/pointerevents3/), [support Pointer Events/Visual Viewport WebKit](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/).
