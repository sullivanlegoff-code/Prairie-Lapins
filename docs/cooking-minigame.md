# Atelier cuisine — prototype isolé

## État actuel

Prototype disponible à **`/cooktap-prototype/`**, indépendant du jeu Prairie Lapins. Il propose deux recettes jouables : **Salade mozzarella, tomate, concombre et huile d’olive** et **Poulet soja-miel & patate douce rôtie**. Chaque sélection n’affiche que les objets utiles. La route autonome ne relie ni économie ni sauvegarde ; le même montage est intégré au jeu principal (bâtiment Cuisine, choix du lapin, récompenses), voir « Intégration dans le jeu principal ».

Cuisine est terminée : les deux recettes, y compris les dépôts de bouteilles, et le parcours intégré complet ont été validés par le propriétaire sur iPhone réel.

## Recette Salade

Couper mozzarella, tomate et concombre sur la planche, un à la fois. Le couteau est tiré sur un ingrédient entier posé sur la planche. Un seul geste suffit ; l’aliment change d’apparence, et le couteau revient sur son support. L’aliment coupé peut aller au saladier ou retourner dans sa réserve sans perdre sa préparation. Le saladier verrouille les aliments coupés et illustre son contenu. Glisser l’huile sur le saladier : le dépôt est refusé tant que les trois ingrédients coupés ne sont pas dedans ; ensuite il verse l’huile et termine la recette. Un tap sélectionne seulement la bouteille. Elle revient à sa place après le dépôt.

## Recette Poulet soja-miel & patate douce

Sélectionner la recette Poulet. Les morceaux de poulet cru, la patate douce, la planche, le couteau, l’économe, soja, miel, le plat et le four sont affichés ; les objets Salade sont cachés.

Le poulet va sur la planche, est découpé au couteau, puis assaisonné en glissant la sauce soja et ensuite le miel sur le poulet. Chaque bouteille suit le doigt et revient à sa place après un dépôt accepté ou refusé ; un tap ne verse rien. L’ordre soja → miel est obligatoire. La patate douce va sur la planche, doit d’abord être épluchée à l’économe, puis coupée au couteau. Le poulet et la patate douce peuvent être préparés dans n’importe quel ordre. Après chaque préparation, ils peuvent revenir en réserve sans perdre leurs états ni leur assaisonnement.

Le plat accepte le poulet uniquement s’il est coupé et assaisonné des deux sauces ; il accepte la patate douce épluchée et coupée. Leur ordre de dépôt est libre. Une fois les deux aliments dans le plat, le plat devient draggable vers le four. Il y cuit pendant **5 secondes actives**. L’horloge et la cuisson se figent en portrait, en arrière-plan et lors des pauses moteur. À la fin, les deux préparations deviennent `cooked` et le résultat donne le temps total et les actions invalides. Rejouer remet ingrédients, drapeaux, outils, plat, four, horloges et erreurs à zéro.

Les actions culinaires invalides (ordre de sauce incorrect, mauvais outil/cible, planche occupée, dépôt incomplet dans le plat) augmentent le compte d’erreurs. Annulation de pointeur, rotation, multitouch ou interruption système n’en ajoute pas.

## Architecture

| Module | Responsabilité |
| --- | --- |
| `cooktap-prototype/recipes.ts` | objets, zones et transitions d’outils déclaratives (`TOOL_RULES`) |
| `cooktap-prototype/engine.ts` | source de vérité, validations et intentions communes aux deux recettes, flags d’assaisonnement et cuisson active |
| `cooktap-prototype/geometry.ts` | repère logique 1000×440, mise à l’échelle, hitboxes et drops selon la recette active |
| `cooktap-prototype/scene.ts` / `art.ts` | objets et états dessinés en SVG local, contenu du saladier/plat, changements visuels |
| `cooktap-prototype/drag.ts` | Pointer Events, capture, seuil 7 px, drags d’outils et de bouteilles applicatrices |
| `cooktap-prototype/main.ts` / `ui.ts` | orientation, visibilité, horloge active, progression de cuisson, sélection et résultat |

Le moteur garde préparation (`whole`, `raw`, `peeled`, `cut`, `cooked`), emplacement (`reserve`, `cutting-board`, `bowl`, `baking-dish`, `oven`) et assaisonnements séparés. Les capacités outil-cible et états requis sont déclarés dans `TOOL_RULES`, et les zones/objets sont partagés ; la Salade et le Poulet passent par les mêmes intentions `drop`, `use-tool` et `select`. Pas de nouvelle dépendance ni d’asset externe.

Les zones de drop se sélectionnent par géométrie et sont filtrées par recette : le saladier ne peut pas intercepter un drop du plat lorsqu’on cuisine le Poulet. Le couteau et l’économe ont des positions de repos distinctes, avec emplacement logique `tool-rack`. Le plat est une zone à deux aliments ; il ne devient manipulable que complet.

### Montage réutilisable

`mountKitchen(host, options?)`, exporté par `cooktap-prototype/main.ts`, ne démarre rien à l’import. Le parent fournit un conteneur connecté et dimensionné ; le montage y ajoute sa propre section `.cuisine-root`, le contenu de `shell.html` et une feuille de style limitée à cette section. Les IDs internes sont fournis par le montage, jamais à reproduire dans l’application. Une seule instance active est prévue.

Le résultat expose `root`, `engine`, `scene`, `drag`, `refresh()` et `dispose()`. Les options existantes `portraitQuery` et `measureSurface` permettent notamment les contrôles automatisés. Appeler `dispose()` avant de retirer le conteneur : intervalle, écouteurs, capture/geste, frames, observateur et délais sont nettoyés ; seule la section possédée est retirée, avec sa feuille de style. Un second appel est sans effet. Un nouveau montage crée un moteur neuf.

`index.html` fournit seulement le conteneur autonome. `standalone.ts` appelle explicitement le montage et charge `standalone.css`, seul propriétaire des règles `html/body` et de la hauteur plein écran. Les styles réutilisables n’affectent aucun élément extérieur ; les noms d’animations sont préfixés `cuisine-`.

### Intégration dans le jeu principal

Parcours : Prairie → bâtiment Cuisine → « Entrer dans la Cuisine » → « Choisis ton lapin » → activité. L’ancienne entrée temporaire du Laboratoire a été retirée ; le bâtiment est l’unique accès. `GameUI` possède un dialogue plein écran `CuisineActivity`, placé hors du panneau reconstruit par les rendus passifs. Son hôte est stable ; un seul montage existe tant que le dialogue est ouvert. La Prairie est rendue inerte et le blocage existant `dialog[open]` protège ses entrées.

« Quitter Cuisine » ou Échap dispose le montage avant de fermer le dialogue, restaure les entrées et le panneau précédent. Rejouer et Choisir une recette restent internes à Cuisine. Remplacement de partie (import/recommencer) et destruction de l’interface ferment aussi l’activité ; aucun moteur précédent ne survit à une réouverture.

L’option `mountKitchen(..., {onRecipeCompleted})` reçoit une fois par réussite `{recipeId, activeTimeMs, invalidActions}`. Rejouer réarme cette notification pour la partie suivante. `GameUI` la transmet à son option `onCuisineCompleted` ; `CuisineActivity` expose aussi `onExit`. Aucun callback ne crédite de ressource ni n’écrit dans la sauvegarde : `GameUI` envoie la commande `rewardCuisine` (+50 pièces, +3 herbes à chaque réussite ; +1 affection par lapin et +1 Cœur global à la première réussite du cycle canonique de 24 h), seule la simulation décide.

Les contrôles `docs/cuisine-integration-check.cjs` et `docs/cuisine-reward-flow-check.cjs <URL locale> <dossier hors Git>` partent d’une sauvegarde v12 générée par `docs/cuisine-seed.cjs` (Cuisine achetée, deux lapins) et passent par le bâtiment. Le premier exerce l’ouverture, un rendu passif réel, le blocage de la Prairie, les deux recettes, la sortie et la réouverture dans Chromium/WebKit. Il utilise les attentes de placement visuel du contrôle autonome et écrit captures/rapport uniquement dans le dossier fourni. Le second vérifie récompenses, Cœur, affection par lapin, rejeu, sortie, rechargement et absence d’erreur JS.

## Vérifications

Le contrôle construit `docs/cooking-prototype-check.cjs` exerce `/`, `/dev/` et `/cooktap-prototype/`, puis réalise une Salade complète et un Poulet complet dans Chromium tactile via CDP et WebKit Windows via Pointer Events souris. Il vérifie les refus, l’orientation, le gel de cuisson, les résultats et le rejeu. Ce contrôle n’est pas un test iPhone réel ; WebKit Windows ne simule pas Safari iOS.

Depuis PowerShell, après `npm.cmd run build:netlify` :

```powershell
npm.cmd run preview -- --outDir netlify-site --port 5186 --strictPort
node docs/cooking-prototype-check.cjs http://127.0.0.1:5186/ C:/Users/sulli/AppData/Local/Temp/prairie-chicken-check
```

## Test iPhone réel du prototype autonome (procédure)

Sur le même Wi-Fi que le PC, lancer `ipconfig`, puis depuis le dossier du projet :

```powershell
npm.cmd run preview -- --outDir netlify-site --port 5186 --strictPort
```

Dans Safari iPhone, ouvrir `http://<IPv4 Wi-Fi du PC>:5186/cooktap-prototype/`. Choisir Poulet et vérifier les morceaux faciles à saisir, le geste couteau, la séquence soja puis miel, l’économe et les changements entiers/épluché/coupé, le retour d’aliments en réserve, la visée et le contenu du plat, le drag du plat vers le four, la lisibilité des 5 secondes de cuisson, les pauses portrait/arrière-plan, le résultat et Rejouer. Vérifier paysage stable, cibles tactiles, safe areas, absence de défilement et d’objet coincé. Ne pas utiliser `localhost` sur l’iPhone. L’ouverture PWA en autonome depuis l’URL LAN HTTP dépend de Safari/iOS et n’est pas présumée.

## Provenance Cook Tap

Dépôt : [nascarjake/cooktap](https://github.com/nascarjake/cooktap), révision source `2d853495b03f837ef86bf20a591547bc1161a88f`, conservée uniquement pour audit sous `vendor/cooktap-original/`. README et `package.json` annoncent MIT, mais l’archive amont ne contient ni fichier LICENSE/COPYING ni avis de copyright explicite. Voir `vendor/COOKTAP-PROVENANCE.md`, `cooktap-prototype/public/NOTICE.txt` et `cooktap-prototype/public/MIT.txt` pour distinguer la déclaration amont de la notice MIT standard locale. Aucun asset graphique, police ou son amont n’est utilisé.

## Hors périmètre

Le moteur `KitchenEngine` reste indépendant des lapins, de l’économie et de la sauvegarde : récompenses et règles quotidiennes passent uniquement par la commande `rewardCuisine` côté jeu. Ne pas ajouter de recette, niveau, audio ni nouvelle règle économique sans demande distincte.
