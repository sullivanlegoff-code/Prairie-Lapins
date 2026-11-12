# Passation — « Cours cours Benny ! » (12 novembre 2026)

Pour l'agent qui reprend le mini-jeu de course de Benny. Lis d'abord `AGENTS.md` (règles permanentes du propriétaire), puis ce fichier.

## 1. Où en est le chantier

- **Branche** : `feature/cours-benny` (97 commits au-dessus de `main`), dernier commit `4060957` (lot 92). Arbre de travail dédié : `.claude/worktrees/cours-benny` (à la racine du dépôt). Travaille dans cet arbre, pas dans la copie principale, qui est sur `main`.
- **Rien n'est fusionné ni publié.** Le propriétaire publiera lui-même quand il dira « Publie ». Jusque-là : ni `git merge` dans `main`, ni `git push`.
- **Dernière validation** :
  - lot 91 : suite complète (2 215 tests OK, 1 ignoré) et `npm run build:netlify` OK ;
  - lot 92 : `npx tsc --noEmit` OK, 72 tests ciblés de la course OK, contrôle Chromium avec captures, build du site OK.
  - Aucun essai sur iPhone n'a été fait par l'assistant.
- **Aperçu iPhone** : `netlify-site/` servi sur le port 5174 (`http://<IP locale>:5174/dev/`, dernière IP connue 192.168.1.13). La course n'existe que dans le laboratoire `/dev/`.

## 2. Le jeu en bref

Course sans fin, vue de dos, inspirée du gameplay de Blade of Brim. On n'en copie jamais le nom, les images ni les personnages. Benny a volé le trésor de la Lapine Dragon, qui la poursuit en volant derrière elle.

- **Accès** : bâtiment « Antre du dragon », niveau 25, 100 000 pattes, Benny requise. Le propriétaire n'a pas besoin de posséder le lapin Dragon.
- **Format** : iPhone en portrait uniquement. En paysage, la course se met en pause avec « tourne ton iPhone ».
- **Gestes** :
  - haut = saut ;
  - bas = roulade, ou charge au sol en l'air (onde de choc si on part de haut) ;
  - côté = changer de couloir ou courir sur un mur ;
  - toucher = utiliser un bonus.
- **Frapper avec la baguette** :
  - une créature se frappe en changeant de couloir vers elle (de côté), en roulade (de face) ou par un geste vers le haut (monstre volant) ;
  - foncer droit dessus = choc ;
  - une créature dépassée sans être frappée contre-attaque.
- **Pots** : ils se cassent sur place et ne volent jamais (règle du propriétaire). Un pot doré sort 1 fois sur 20 et vaut 5 pots.
- **Défaite** : 2 chocs en 10 s, et la Dragon attrape Benny. Une courte scène de chamaillerie suit, puis la carte de score.
- **Décors** : grotte d'or, pont de lave, sentier de montagne, dans un ordre aléatoire. Chacun a ses pièges (éboulements, geysers, rafales, wagonnets).
- **Contenu de la course** :
  - bonus aimant, bulle arc-en-ciel, pièces ×2, envol, ruée ;
  - tremplins, plateformes, salles à 5 couloirs, trous, tunnels de rondins ;
  - défis en course, séries, records par décor ;
  - tutoriel intégré à la première partie.
- **Sauvegarde** : v29, champ `bennyRun` (`best`, `metres`, `settings`), optionnel et compatible.

## 3. Fichiers

| Fichier | Rôle |
|---|---|
| `src/simulation/bennyRun.ts` | Règles pures : pas fixes de 120 Hz, hasard à graine, constantes `BENNY_RUN`, entités, motifs, défis, résumé de fin |
| `src/ui/BennyRunActivity.ts` | Couche canvas 2D (pas une scène Phaser) : caméra, rendu, gestes, sons de synthèse, tutoriel, scène de fin, carte de score |
| `src/display/benny-run.css` | Styles de la couche (HUD, défi en bas, carte de fin) |
| `src/config/bennyRunArt.json` | Généré : position de chaque image dans les atlas |
| `public/assets/benny-run/{benny,dragon,creatures,objets}.webp` | Atlas peints (générés) |
| `scripts/prepare-benny-run-art.mjs` | Découpe les planches peintes en atlas WebP et produit la planche de contrôle |
| `tests/benny-run.test.ts`, `tests/benny-run-activity.test.ts` | 72 tests de la course |

Le rendu dessine d'abord les **images peintes**. Tant qu'elles ne sont pas chargées (et dans les tests, où aucune image ne se charge), les **formes dessinées** au canvas prennent le relais (`figure()`, `paint()`, `fitted()`).

## 4. Images

- **Validées par le propriétaire** : Benny planche A (vue de dos), Dragon planche A. Pour la Dragon, il a demandé : « pars vraiment du design du dragon évolué dans le jeu » (Écarlate Majestueux, `dragon-v2.png`). Dans la course, la Dragon a **toujours** le design évolué. C'est une exception voulue à la règle « pas de dessin évolué avant la première évolution ».
- **Peintes et intégrées (lot 92)** : créatures (dragonnet endormi et réveillé, coffre glouton, braise, monstre volant) et objets (pot, pot doré, barrière, poutre, pilier, rocher, wagonnet, pièce). Elles viennent de la planche d'objets déjà approuvée. Le propriétaire a répondu « Oui, continue » après avoir vu la Dragon.
- **Encore dessinées en formes** :
  - décors (fonds de grotte, de pont et de montagne, murs) ;
  - bulles de bonus, tremplin ;
  - boules de feu et de neige (elles tournent sur elles-mêmes) ;
  - geysers.
- **Sources** (dans `output/`, ignoré par Git, jamais à committer) : `output/imagegen/course-benny-final-v1/`. On y trouve :
  - les planches `sheet-*.png` et les prompts `p-*.txt` ;
  - `run.sh <noms>` qui relance Codex ;
  - `planche-atlas-course.png` (contrôle) et `captures/`.
- **Concepts** : `output/imagegen/course-benny-v1/` et `course-benny-v2/`.
- **Régénérer les atlas** :
  `PLAYWRIGHT_MODULE=<chemin absolu de playwright> node scripts/prepare-benny-run-art.mjs --sources ../../../output/imagegen/course-benny-final-v1 --reference ../../../output/imagegen/benny-enclos-final-v1/A1-reference.png`
  Playwright se trouve dans le dépôt voisin `Project-L/prairie-lapins-prototype/node_modules/playwright`. Benny est recolorée sur la référence A1, ce qui la garde fidèle aux couleurs du jeu.
- **Codex sert uniquement à peindre**, pas à coder (règle du propriétaire du 12 novembre). Les planches doivent avoir un fond blanc pur, des dessins séparés, sans ombre ni texte. Économise le quota.
- **Captures de Blade of Brim** : `assets-source/Cours cours benny/` (IMG_92xx) contient les captures du propriétaire. Elles servent de modèle décrit seulement. Ne les committe **jamais** et ne les donne **jamais** à Codex ou à un outil d'image.

## 5. Règles du propriétaire à respecter (en plus d'`AGENTS.md`)

- Ne touche ni à l'économie de la partie normale, ni à la courbe de niveau, ni aux récompenses de la course (« à décider plus tard »).
- Paille : ne modifie aucun de ses dialogues. De nouvelles répliques pour le tutoriel sont seulement **proposées** dans le journal ; c'est lui qui choisit.
- Tutoiement partout. Sauvegarde compatible. Dépôt public : ni secret, ni chemin personnel, ni image de Blade of Brim.
- Git :
  - jamais `git add -A`, `git add .`, `reset --hard`, `clean` ni réécriture d'historique ;
  - n'ajoute que les fichiers du lot ;
  - commits en français, préfixés « Cours cours Benny ! lot N : … ».
- Si un lot casse quelque chose et que deux essais ne suffisent pas : `git restore` sur les fichiers du lot, une note dans le journal, puis la piste suivante.
- Machine avec peu de mémoire : au plus deux processus lourds à la fois. Ne lance pas la suite complète en même temps que Codex ou Chromium, sinon des tests sans rapport échouent par manque de temps. N'arrête que tes propres serveurs, par leur numéro de processus.
- Le propriétaire veut que le jeu soit « vraiment smooth ». Garde le dessin extrapolé à l'instant exact de l'image (`drawAhead`) et pas d'à-coups.

## 6. Commandes utiles

- Types : `npx tsc --noEmit`
- Tests ciblés : `npx vitest run --configLoader runner --maxWorkers 1 --dir tests benny-run` (72 tests, environ 4 s)
- Suite complète, avant une publication seulement : `npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000` (environ 8 minutes, à lancer seule)
- Site complet + aperçu iPhone : `npm run build:netlify`, puis `node node_modules/vite/bin/vite.js preview --outDir netlify-site --port 5174 --strictPort --host 0.0.0.0`
- Contrôle Chromium : serveur de dev sur 127.0.0.1:5199. Dans la page, `import('/src/ui/BennyRunActivity.ts')`, puis `mountBennyRunActivity(document.body, {best: () => 50}).open()`, clic sur `[data-benny-run-start]`. L'objet `.game` permet de placer des entités pour une capture.
- Après un build : si `git diff --ignore-cr-at-eol` est vide pour `tests/__snapshots__/procedural-art.test.ts.snap`, restaure-le.

## 7. Journal et mémoire

- Journal lot par lot : `output/cours-benny-nuit/journal.md` (ignoré par Git), une ligne par lot. Il contient aussi les répliques de Paille proposées et les audits de partie automatique : un robot parfait tient 34 parties sur 40 pendant 5 minutes, un robot à vitesse humaine tient environ 112 s en médiane.
- Mesures de fluidité : variation de vitesse d'une image à l'autre environ 2 % ; avec le processeur ×1, aucune image au-dessus de 20 ms.

## 8. Ce qui reste à faire (dans l'ordre conseillé)

1. **Décision en attente du propriétaire** : peindre maintenant les décors, ou d'abord retoucher les images déjà faites. Il a toujours dit de ne pas s'arrêter aux questions : si rien ne vient, avance sur le gameplay et sur ce qui manque, et note tes choix.
2. **Gameplay** (priorité du propriétaire), sur le modèle de Blade of Brim : vitesse, fluidité, murs, enchaînements, obstacles variés, difficulté qui monte doucement, jamais de situation impossible. Rejoue dans Chromium (format iPhone portrait), fais l'audit, puis un lot court à la fois.
3. **Peinture des décors** : fonds par décor, murs, bulles de bonus, tremplin, puis boules de feu et de neige si possible. Montre d'abord 2 ou 3 concepts au propriétaire s'il s'agit d'un nouveau style.
4. **Décisions du propriétaire, à ne pas prendre à sa place** : récompenses de la course, répliques de Paille, musique.
5. **Avant le « Publie »** : suite complète, les deux builds, `git diff --check`, aperçu iPhone relancé, puis rapport court en français (voir `AGENTS.md`, section 8).
