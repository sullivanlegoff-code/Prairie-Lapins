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
