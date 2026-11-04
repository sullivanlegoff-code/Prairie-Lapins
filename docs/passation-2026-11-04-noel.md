# Passation du 4 novembre 2026 : l'événement de Noël

À lire après `AGENTS.md`. Branche **`feature/noel`** (créée depuis `feature/affection-50`). Rien n'est fusionné dans `main` ni publié : tout sortira dans la grande mise à jour de Noël, quand le propriétaire le dira.

## Ce que le propriétaire a décidé (4 novembre 2026)

- **Île :** l'île entière est sous la neige, avec une peinture complète, car l'événement dure plusieurs mois. Il commence à la sortie de la version et dure jusqu'à nouvel ordre (`CHRISTMAS_EVENT.active` dans `src/config/christmas.ts`).
- **Neige et nuit :**
  - des mini flocons très légers et pas tout le temps, parfois une neige un peu plus forte ;
  - le soir, il fait nuit ;
  - à 20 h, les guirlandes s'allument.
- **Animations des lapins :**
  - mini batailles de boules de neige entre lapins ;
  - un bonhomme de neige qui reprend les mécaniques du pique-nique ;
  - pas d'écharpe ni de bonnet sur les lapins.
- **Pas de calendrier de l'Avent.**
- **Marché de Noël :**
  - une petite île qui apparaît à l'ouest de l'île de départ ;
  - on y achète des décorations exclusives avec une monnaie de l'événement, les sucres d'orge ;
  - les sucres d'orge se gagnent uniquement par des défis spéciaux ;
  - toutes les décorations de saison sont au marché.
- **Mini-jeu :** « Les cadeaux du ciel ».
- **Lapins de Noël :** plus tard, et c'est le propriétaire qui les choisit. N'en invente pas.
- **Concepts retenus** (planche `output/imagegen/noel-v1/`, hors Git) :
  - île C « Village de Noël » ;
  - nuit C1 « Nuit douce » ;
  - marché A « Chalets » ;
  - mini-jeu B.
- **Codex :** à utiliser **uniquement pour les peintures**, en épargnant son forfait. Pas d'essais à vide, et pas de variantes que tu peux dériver toi-même.

## Ce qui est fait (commits `6c2c131`, `514cf68`, puis la suite sur la branche)

- **Règles :** `src/simulation/christmas.ts` et `src/config/christmasEvent.ts`.
  - Sucres d'orge.
  - 3 défis de Noël par cycle, plus un bonus de 10.
  - Bonhomme de neige : un par cycle, à partir du niveau 2.
  - Mini-jeu : 3 parties récompensées par cycle, au plus 60 pattes, sans XP.
  - 8 décorations du marché (`CHRISTMAS_DECORATION_IDS`), qui ne se revendent pas.
  - Sauvegarde **v26**.
  - Aucune XP n'est donnée : `node docs/progression-simulation.mjs` passe.
- **Affichage :**
  - île enneigée des étapes peintes (`src/config/islandStages.ts`, `islandStageArtWinter.json`) ;
  - nuit et neige (`src/display/winterLayer.ts`, `winterClock.ts`, `skyLayer.ts`) ;
  - ampoules allumées à 20 h (`WinterLights`, `src/config/islandStageLightsWinter.json`, `scripts/derive-winter-lights.mjs`) ;
  - île du marché (`src/config/christmasMarketArt.ts`) ;
  - bonhomme de neige (`MeadowScene.playSnowman`) ;
  - boules de neige (`src/display/snowballFight.ts`).
  - Une image manquante n'est jamais bloquante.
- **Interface :** dans `src/ui/GameUI.ts` :
  - vue « Marché de Noël » (solde, défis, bonus, décorations, bouton du mini-jeu) ;
  - carte « Défis de Noël » dans Missions ;
  - bouton du bonhomme dans la fiche d'enclos ;
  - mini-jeu `src/ui/SkyGiftsActivity.ts` (règles dans `src/simulation/skyGiftsGame.ts`).
- **Laboratoire :** section « Noël » de `src/dev/tools.ts` :
  - activer ou désactiver l'événement (la page se recharge) ;
  - heures 10 h, 18 h 15, 19 h 30, 20 h 03 et 23 h ;
  - force de la neige ;
  - bataille de boules de neige ;
  - +50 sucres d'orge ;
  - ouverture du marché.
- **Validation (au commit `514cf68`) :**
  - 3 148 tests verts, les deux builds et `git diff --check` passent ;
  - captures Chromium de l'île enneigée de jour, de nuit et avec les guirlandes allumées ;
  - aucun essai iPhone.

## Ce qui reste

1. **Peintures (Codex, en cours la nuit du 4 novembre).**
   - Les dossiers sont hors Git : `output/imagegen/noel-production/parts/` (morceaux d'île des étapes 5 à 9, `run.sh`) et `.../items/` (`run2.sh` : bâtiments et habitats enneigés, marché, 8 décorations, bonhomme, planche d'icônes, hotte, traîneau, décor du mini-jeu).
   - Les deux scripts sautent ce qui est déjà peint, donc on peut les relancer : `bash parts/run.sh` puis `bash items/run2.sh`.
   - Si Codex range une image dans un **dossier** nommé `*-neige.png`, sors-en le fichier.
   - Si la limite d'usage tombe, les journaux `log-*.txt` contiennent « usage limit ».
2. **Intégration, une fois peint :**
   - `node scripts/prepare-winter-island.mjs compose output/imagegen/noel-production/parts`
   - `PLAYWRIGHT_MODULE=<playwright du dépôt voisin> node scripts/derive-island-stages.mjs --winter`
   - `node scripts/derive-winter-lights.mjs`
   - `PLAYWRIGHT_MODULE=… node scripts/prepare-noel-art.mjs output/imagegen/noel-production/items`
     - Ce script recale chaque bâtiment ou habitat sur l'original et garde sa silhouette ; il ignore une peinture qui correspond à moins de 90 %.
     - Il fabrique lui-même les lumières de nuit du marché et les étapes 1 et 2 du bonhomme.
     - Il écrit `src/config/winterBuildingFiles.json`.
     - Il **n'a pas encore tourné sur de vraies images** : vérifie le résultat.
3. **Réglages à faire avec des captures :**
   - `CHRISTMAS_MARKET_ART` : taille, ancrage et case, à mettre d'après `marche.png` ;
   - la place du bonhomme et sa largeur (`SNOWMAN_ART` dans `winterArt.ts`) ;
   - la hauteur des boules de neige ;
   - la hotte dans `sky-gifts.css` ;
   - l'allure des flocons.
4. **Contrôle Chromium :** sers `dist/` du laboratoire sur `127.0.0.1:5199`. Scénarios utiles : « Prairie de départ » (étape 1) et « Prairie de démonstration décorée ».
5. **Validation complète, commit, puis rapport au propriétaire** en français, en le tutoyant.

## Pièges

- Ne committe jamais : `assets-source/Benny/`, les dossiers « évolution … » sous `assets-source/rabbits/*/`, `.claude/`, `output/`.
- Le dépôt mélange des fins de ligne CRLF et LF (`core.autocrlf=true`). Les avertissements « LF will be replaced » sont normaux.
