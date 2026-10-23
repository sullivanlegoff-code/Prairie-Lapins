# Feu niveau 2 — Orangerie des braises

Illustration sélectionnée exclusivement pour `type: feu`, `level: 2`, `footprintTier: 2`. Les replis des autres combinaisons restent inchangés ; la boutique conserve l'image Feu de niveau 1. `MeadowScene` reste inchangée : préchargement, bâtiment réel, fantôme et cadrage utilisent les mécanismes existants.

Original intact : `output/imagegen/habitats-level2-v1/habitat-feu-level2-orangerie-des-braises-v1.png`, copié dans `assets-source/habitats/level2/`. SHA-1 de blob Git : `ac7d771016484b832048a73ebb44e9e72bee22c1`.

- Source : **1254 × 1254 px** ; limites visibles alpha > 8 : **(12, 68) à (1244, 1049)**, incluses.
- Recadrage : **x 6, y 62, largeur 1244, hauteur 994**. Marges transparentes seulement, puis réduction 2 × 2 prémultipliée existante : **622 × 497 px**.
- Échelle uniforme : **560 / 1254 unité monde par pixel chargé**, comme Neige niveau 2 ; largeur affichée **277,767 unités**.
- Ancrage dans la cour : **(627, 720)** dans la source, donc **(310,5 ; 329)** dans le dérivé.
- Cinq places relatives à l'ancrage : **(-52, -18), (0, -18), (52, -18), (-30, 16), (30, 16)**.
- Zone : **x [-72, 72], y [-30, 26]**, `roamScale: 1`. Les boîtes de marche sont entièrement dans le rectangle prudent de cour nue **x [300, 950], y [600, 835]**, en pixels source. Étiquette à **+96 unités**.

Taille des lapins, rythmes, moteur d'animation, emprise 6 × 5, capacité 5, prix, progression et sauvegardes inchangés. Les chevauchements éventuels des silhouettes restent à juger visuellement ; la contrainte de placement porte sur les pieds dans la cour.

Validation ciblée : **83 tests réussis sur 6 fichiers**, dont quatre nouveaux pour Feu (sélection/replis, source/dérivé, cinq places sur le sol et cinq minutes de marche simulée). Les assertions existantes de sélection sont étendues au nouveau cas Feu niveau 2 / palier 2 ; les contrôles Neige et niveau 1 restent actifs.

```powershell
node scripts/derive-habitat-art.mjs --check
npm.cmd test -- tests/feu-level2-art.test.js tests/neige-level2-art.test.js tests/habitat-art.test.js tests/habitat-shop-art-dom.test.ts tests/habitat-footprint.test.ts tests/habitat-upgrade-levels.test.ts --maxWorkers=1
npm.cmd run typecheck
git diff --check
```

Le pipeline commun vérifie désormais huit dérivés. Après commit, construire avec `npm.cmd run build:netlify` et contrôler sur le preview existant : amélioration réelle 1 → 2, cinq résidents, fantôme et Recentrer. Captures locales prévues hors dépôt dans `%TEMP%/prairie-feu-level2-20261023/`. Aucun essai physique iPhone ni publication.
