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

## Grande mise à jour de Noël (5 et 6 novembre 2026)

Le propriétaire a laissé « total liberté » pour cette mission de nuit. Ses réponses (questions 10 à 20) sont dans la mémoire de l'assistant ; voici ce qui en est sorti.

**Économie (commit `a4a272a`)** :
- après le niveau 20, l'XP demandée monte plus vite (`docs/progression-simulation.mjs`) ;
- Salon de soins au niveau 22, Forêt de Brocéliande au niveau 25, corde à sauter au niveau 20 ;
- prix des cultures doublés, sauf le foin (10) ;
- cœurs : la cuisine donne au plus +1 d'affection par jour au total, le salon donne des cœurs pour 2 soins par jour, les voyages de 1 à 5 cœurs, la corde à sauter seulement à la première partie du jour ;
- le comptoir de Paille est retiré ;
- la nurserie : une nouvelle partie commence à 1 coussin, une partie existante revient à 2 au plus (un coussin occupé par un bébé est gardé), déblocages à 40 / 120 / 250 cœurs.

**Îlot des Épiques** (`src/simulation/epicIslet.ts`, `src/config/epicIsletArt.ts`) :
- 400 cœurs, dès le niveau 18 ;
- il flotte au sud de l'île de départ, hors de la grille (déplacé le 6 novembre, voir plus bas) ;
- c'est un second nid : deux croisements en même temps ;
- ×1,1 sur les chances d'Épique, de Légendaire et de Benny sur ce nid.

**Débris** (`src/simulation/debris.ts`) :
- chaque parcelle achetée à partir de maintenant reçoit 6 débris (rochers, buissons, herbes), deux de chaque ;
- ils bloquent la construction (refus `DEBRIS_IN_THE_WAY`) ;
- on les enlève en les touchant, pour environ 50 % du prix de la parcelle au total, réparti selon le type (rocher plus cher que les herbes) ;
- les parcelles déjà achetées n'en ont pas.

**Enclos Ultra neige** (section du marché de Noël, onglet « Récompenses spéciales ») :
- un habitat neuf en sucres d'orge, du niveau 1 au niveau 3 (voir « Corrections du 6 novembre ») ;
- il reste après Noël, mais ne s'achète et ne s'améliore que pendant Noël ;
- la peinture est servie sous le nom `habitat-glace.png` : un nom en « -neige » serait pris pour une copie enneigée par `prepare-noel-art.mjs`.

**Perchoir de Benny et « Le vol de Benny »** (`src/simulation/bennyFlightGame.ts`, `src/ui/BennyFlightActivity.ts`) :
- un bâtiment de la boutique (50 000 pièces, un seul), utilisable seulement si Benny est sur l'île ;
- le jeu : toucher l'écran fait battre des ailes à Benny, qui passe entre des colonnes de bottes de foin ;
- récompenses : 3 parties récompensées par jour, 3 pièces par colonne (60 au plus), et 1 cœur à la première partie du jour si Benny franchit 20 colonnes ; le record est gardé.

**Nuit de Noël complète** :
- l'îlot des Épiques, le perchoir, l'îlot de la corde, le nid et l'enclos neige de niveau 3 ont maintenant leurs lumières ;
- `scripts/derive-night-lights.mjs` exclut les débris (baies et fleurs jaunes) ;
- l'enclos Ultra neige utilise un seuil plus large, ses lanternes étant pâles ;
- le rond de sable de l'îlot est masqué, sinon il brillait comme une lampe.

**Sept nouveaux lapins** (`src/config/species.ts`, images préparées par `scripts/prepare-rabbit-masters.mjs`) :

| Lapin | Rareté | Types | Note |
|---|---|---|---|
| Fantôme (v3, le nez dépasse) | Rare | vol + paille | |
| Bouyoyo (v2) | Rare | feu + neige | |
| Nuage | Rare | vol + neige | |
| Champignon des bois | Rare | paille + métal | |
| Lapin de Sulli (B) | Épique | feu + neige | |
| Pain d'épice | Épique | feu + paille | Noël |
| Flocon de cristal | Épique | neige + vol | Noël |

- Les types ont été choisis pour que le premier couple Paille + Neige donne toujours seulement Frisket et Icy, et qu'aucun couple n'ait plus de 3 rares.
- Les lapins de Noël ne naissent que pendant Noël.

**Évolutions à l'affection 30** : 13 nouveaux dessins (`src/config/evolvedArt.ts`) et leurs défis (`src/config/evolutionChallenges.ts`) :
- six lapins déjà en jeu : Vantablack, Gigi Rarafe, Yetiti, Rennes, Susucre, et Arkoko (refaite) ;
- les sept nouveaux lapins.

Les ancrages de la cuisine des nouveaux lapins (`src/config/cuisineAnchors.ts`) sont estimés : ils n'ont pas encore été vérifiés dans la cuisine.

**Corrigé pendant les captures** :
- les identifiants des débris étaient refusés par la sauvegarde : une partie avec des débris ne se rechargeait pas ;
- toucher un débris ne répondait que sur ses cases au sol, pas sur son dessin.

**Vérifié dans Chromium** (captures 844 × 390, partie de test au niveau 25), sans erreur JavaScript :
- l'île de jour et de nuit (22 h 30) ;
- l'îlot des Épiques et sa fiche ;
- le perchoir, sa fiche et une partie complète (17 colonnes, +51 pièces, record enregistré) ;
- les débris et la fiche « Rocher » ;
- le palais Ultra neige de jour et de nuit, et sa section du marché ;
- les nouveaux lapins dans leurs enclos.

Aucun essai iPhone.

## Corrections du 6 novembre 2026 (commits `c9c5e1a`, `2b5a1cd` et suivant)

**Ultra neige** : habitat neuf, acheté au niveau 1 et amélioré jusqu'au niveau 3 en sucres d'orge (100 / 150 / 250, `ULTRA_SNOW` dans `src/config/balance.ts`). Dessins : `habitat-glace-1.png`, `habitat-glace-2.png`, `habitat-glace.png`. Le niveau 2 dépassait de son emprise à l'avant avec les nouvelles tailles : ancrage corrigé, et `tests/enclosure-enlargement.test.ts` couvre maintenant les trois niveaux.

**Enclos encore plus grands** : 6 × 5, 10 × 6, 12 × 7 (`ENCLOSURE_FOOTPRINTS`), dessin × 1,38 / 1,4 / 1,3. Une ancienne partie garde sa taille (`formerFootprint`, l'ère 1 ou 2) tant que l'enclos ne peut pas grandir au chargement (`src/simulation/enclosureGrowth.ts`). Le format reste v27, avec le champ `enclosureSizes`.

**Benny** :
- le perchoir coûte 50 000 pièces ;
- « Le vol de Benny » a un nouveau sprite de 8 images où elle bat des ailes (`scripts/prepare-benny-flappy.mjs`) ;
- pour le lag, le jeu ne déplace plus que des `transform` et la boucle Phaser dort pendant la partie ;
- le clignement existait déjà dans `src/display/bennyTimeline.ts`. Il est vérifié image par image dans Chromium dans l'enclos, avec une horloge pas à pas (`page.clock`). Il se trouve sur le corps de l'enclos, que le vol cache : le « seulement dans l'enclos » vient de la lecture du code, pas d'une capture en vol.

**Îlot des Épiques** : au sud de l'île de départ (`EPIC_ISLET.cell`).

**Dadi évolué** (`src/display/dadiStageView.ts`) : 8 poses peintes plus son dessin évolué, changement toutes les 3,5 à 6,5 s. Le toucher ouvre sa fiche, qui lance sa chanson. Il tient alors son micro sur pied à deux mains jusqu'à la fin, puis revient à la normale. La fin de chanson n'a été vue ni dans Chromium ni sur iPhone, seulement dans le code (`themeFinished`).

**En attente du propriétaire : planche v4** (`output/planches/planche-v4.png`, ignorée par Git, peintures dans `output/imagegen/nouveaux-lapins-v4/`). Propositions A/B pour les dessins de base de Gigi-rarafe, Champignon des bois et Pain d'épice, et pour 11 évolutions. Rien n'est intégré : c'est au propriétaire de choisir. Le jeu montre encore les anciens dessins. Règles : mémoire « rabbit-pose-evolution-rules ».

**Astuce pour les captures** : la partie de test s'injecte dans `prairie-lapins.save.v1` sur le build du jeu (`npm run build`). Le build du laboratoire utilise une partie séparée et l'ignore.

## Ce qui reste

0. Recevoir les choix du propriétaire sur la planche v4, puis les intégrer.
1. Faire tester au propriétaire sur iPhone :
   - la taille des boules de neige (`SNOWBALL_ART` dans `src/config/winterArt.ts`) ;
   - le bonhomme (`SNOWMAN_ART`) ;
   - la hotte (`src/display/sky-gifts.css`).
2. Faire tester au propriétaire sur iPhone les nouveautés du 6 novembre : îlot des Épiques, débris, perchoir et « Le vol de Benny », enclos Ultra neige, nouveaux lapins.
   Vérifier aussi les ancrages de la cuisine des nouveaux lapins.
3. La fusion dans `main` et la publication, seulement quand il le demandera.

## Pièges

- Ne committe jamais : `assets-source/Benny/`, les dossiers « évolution … » sous `assets-source/rabbits/*/`, `.claude/`, `output/`.
- Le dépôt mélange des fins de ligne CRLF et LF (`core.autocrlf=true`). Les avertissements « LF will be replaced » sont normaux.

## Audit du 6 novembre 2026

Forêt de Brocéliande : changer de dessin prend 7 heures dans les deux sens, un seul lapin à la fois (`lookChange`, `src/simulation/forest.ts`).

Corrigé par l'audit :
- une partie publiée garde son niveau au chargement malgré le ralentissement après le niveau 20 (`xpAfterSlowdown`, `migrateV26`) ;
- sauvegarde en ligne : la fin d'un changement de dessin et le défi « parent » du transfert automatique ne créent plus de faux conflit (`fingerprint`, format 3), et l'état envoyé porte l'ère des tailles d'enclos (`encodeGame` dans `gateway.commit`) ;
- les trois jeux plein écran se mettent en pause quand le téléphone se verrouille (`src/ui/activityPause.ts`), et l'île s'endort derrière les cadeaux et la corde ;
- message clair quand un nouveau bâtiment n'a plus aucune place sur l'île (`hasRoomFor`) ;
- le marché suit l'îlot de la corde, le bonhomme de neige suit son enclos, Dadi musique coupée ne bloque plus, textes de l'îlot « au sud », noms d'espèces retirés de la forêt, « Broussailles » au lieu de « Mauvaises herbes ».

Non corrigé, connu : relâcher le lapin qui a reçu l'affection de la cuisine rouvre celle du jour ; une nurserie avec un bébé sur son 3e ou 4e coussin garde ces coussins ; les cadeaux du ciel bougent encore par `left` / `top`, sans `transform`.

## Dessins du 6 novembre 2026

Bases B de Gigi-rarafe, Champignon des bois et Pain d'épice ; 11 évolutions refaites (planches `output/planches/planche-v4.png` à `planche-v6.png`, hors Git). Six ont été repeintes de trois-quarts à la demande du propriétaire : Bouyoyo, Champignon, Pain d'épice, Vantablack, Rennes, Arkoko. La base de Pain d'épice reste de profil, approuvée telle quelle.

Les dessins ont été validés par le propriétaire le 6 novembre. La toque et le bavoir de ces 6 évolutions ont été contrôlés dans la vraie cuisine (Chromium, Avocado toast, chaque lapin en commis et en goûteur) : aucune retouche nécessaire.
