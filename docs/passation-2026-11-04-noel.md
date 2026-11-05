# Passation du 4 novembre 2026 : l'événement de Noël

À lire après `AGENTS.md`. Branche **`feature/noel`** (créée depuis `feature/affection-50`), dernier commit `a40db7d` puis cette passation. Rien n'est fusionné dans `main` ni publié : tout sortira dans la grande mise à jour de Noël, quand le propriétaire le dira.

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

## État au 5 novembre 2026 (commits `519ab64`, `e8bf6c8`, `cae85b5`)

Toutes les peintures sont faites et intégrées :
- les 9 étapes de l'île enneigée, avec leurs ampoules ;
- les 10 bâtiments et les 18 habitats enneigés ;
- le marché de jour et de nuit, et ses 8 décorations ;
- le bonhomme de neige ;
- les icônes (sucre d'orge, boules de neige, flocons, cadeaux) ;
- la hotte, le traîneau et le décor du mini-jeu.

Les files de peinture Codex sont terminées. Pour refaire une image : `output/imagegen/noel-production/` (hors Git), puis `node scripts/prepare-noel-art.mjs output/imagegen/noel-production/items` (voir son en-tête).

**Le marché** (`src/config/christmasMarketArt.ts`) :
- il flotte à gauche de l'île de départ, à sa hauteur (`cell`) ;
- si l'îlot de la corde à sauter est acheté, le marché passe juste au-dessus de lui (`cellWithJumpIsland`) ;
- `tests/christmas-ui.test.ts` vérifie qu'il ne chevauche ni l'îlot ni une parcelle.

**Vérifié dans Chromium (laboratoire)** :
- l'île enneigée de jour, de nuit et avec les guirlandes ;
- le marché visible dès l'étape 1 ;
- la vue « Marché de Noël » (solde, défis, décorations) ;
- le mini-jeu (intro, partie, fin).

**Pas encore vu en capture** :
- la bataille de boules de neige : dans la prairie de démonstration, le seul enclos ouvert à deux lapins en avait un qui dormait ;
- le bonhomme de neige posé dans un enclos.

Leur logique est couverte par les tests.

Aucun essai iPhone.

## Corrections du propriétaire du 5 novembre 2026

- **Marché de Noël en plein écran**, comme la boutique, avec trois onglets :
  - « Missions de Noël » : les défis et leur bonus ;
  - « Récompenses spéciales » : les 8 décorations ;
  - « Récupérer les cadeaux » : le mini-jeu.
  - Le code est dans `GameUI.renderChristmasMarket` (vue `{kind: 'christmasMarket', tab}`) et l'habillage de Noël dans `src/display/christmas-market.css`.
- **Mini-jeu plus dur** (`src/simulation/skyGiftsGame.ts`) :
  - le traîneau lâche aussi des cadeaux empoisonnés et des bombes, qu'il ne faut pas attraper (de 16 % à 32 % des chutes, jamais dans les 4 premières, environ un tiers de bombes) ;
  - une bombe attrapée explose et arrête la partie : le joueur garde les cadeaux déjà attrapés ;
  - un cadeau empoisonné enlève 3 cadeaux attrapés (jamais moins de zéro) ;
  - laisser tomber un piège ne coûte rien, et trois vrais cadeaux tombés dans la neige arrêtent toujours la partie ;
  - les chutes sont plus rapides et la hotte un peu plus étroite.
  - Le test « joueur rapide » vérifie qu'un très bon joueur tient les 45 secondes au moins 12 fois sur 20.
  - Les peintures `minijeu/piege-*.png` et `effet-*.png` viennent de `pieges-neige.png`, passé dans `prepare-noel-art.mjs`.

## Plus de lumière la nuit (5 novembre 2026, commit `a40db7d`)

Le propriétaire trouvait la nuit trop sombre. Il a choisi les pistes 1, 2 et 3 : Codex est permis si le rendu est meilleur, mais il n'a pas été nécessaire.

1. **Nuit plus claire** : `NIGHT_TINT` dans `src/display/winterClock.ts` (0x9aa6d8 au lieu de 0x7480bd).
2. **Fenêtres allumées** dès la tombée de la nuit (17 h 30 à 19 h, puis toute la nuit), pas seulement à 20 h :
   - `scripts/derive-night-lights.mjs` tire des peintures enneigées leurs pixels chauds et lumineux, à la même taille ;
   - les images sont écrites dans `public/assets/noel/nuit/<buildings|habitats|decorations>/` et la liste dans `src/config/winterNightLights.json` ;
   - `node scripts/derive-night-lights.mjs --check` vérifie que la liste est à jour ;
   - `src/display/nightGlows.ts` les ajoute en mode ADD au-dessus du voile de nuit, au même endroit que chaque image ;
   - `MeadowScene.glowSources` retrouve l'URL de chaque texture grâce à `artUrls`.
3. **Décorations qui éclairent** : la lanterne, le sapin, l'arche et la boule à neige posent aussi un halo sur la neige (`LIGHT_POOLS` dans `src/config/nightLights.ts`).

Les guirlandes de l'île et les lumières du marché restent à 20 h, comme le propriétaire l'a décidé.

**Validation :**
- 3 153 tests, les deux builds, la simulation du rythme et `git diff --check` passent ;
- captures Chromium à 19 h 30 et à 23 h, avec un sapin posé (fenêtres et sapin allumés) ;
- aucun essai iPhone.

**Pas encore fait :** le rapport au propriétaire sur ce point de la nuit, et le rebuild `npm run build:netlify` pour son aperçu iPhone (`http://192.168.1.13:5174/`).

## Ce qui reste

1. Faire tester au propriétaire sur iPhone :
   - la taille des boules de neige (`SNOWBALL_ART` dans `src/config/winterArt.ts`) ;
   - le bonhomme (`SNOWMAN_ART`) ;
   - la hotte (`src/display/sky-gifts.css`).
2. Les lapins de Noël, quand le propriétaire les aura choisis.
3. La fusion dans `main` et la publication, seulement quand il le demandera.

## Pièges

- Ne committe jamais : `assets-source/Benny/`, les dossiers « évolution … » sous `assets-source/rabbits/*/`, `.claude/`, `output/`.
- Le dépôt mélange des fins de ligne CRLF et LF (`core.autocrlf=true`). Les avertissements « LF will be replaced » sont normaux.
