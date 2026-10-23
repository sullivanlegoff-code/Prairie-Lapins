# Neige niveau 2 — Jardin des flocons

Intégration limitée à `type: neige`, `level: 2`, `footprintTier: 2`. Les enclos compacts, les autres niveaux et types gardent leur rendu précédent. La boutique demande toujours l'illustration de niveau 1.

Original approuvé : `output/imagegen/habitats-level2-v1/habitat-neige-level2-jardin-des-flocons-v1.png`. Copie sans retouche dans `assets-source/habitats/level2/`, SHA-1 de blob Git `4bbefb4c98d497d60c9a47cc7dcfac917f3132a2`.

- Original : **1254 × 1254 px** ; limites visibles alpha > 8 : **(10, 87) à (1244, 1120)**, incluses.
- Recadrage : **x 4, y 80, largeur 1246, hauteur 1048**. Réduction existante par moyenne prémultipliée de blocs 2 × 2 ; dérivé **623 × 524 px**.
- Échelle uniforme : **560 / 1254 unité monde par pixel chargé**, soit une largeur visible de **278,214 unités** (canvas source complet : 280 unités ; emprise logique : 264 unités de large).
- Ancrage mesuré dans la cour : **(627, 780)** dans l'original, donc **(311,5 ; 350)** dans le dérivé.

`habitatArtFor` fournit la même définition au bâtiment et au fantôme ; `HABITAT_ART_LIST` assure le préchargement. Le cadrage inclut la hauteur de l'image et l'étiquette. Aucun changement d'emprise, capacité, économie, progression ou sauvegarde.

Les cinq places, relatives à cet ancrage, sont **(-52, -16), (0, -16), (52, -16), (-30, 16), (30, 16)**. Zone de promenade : **x [-72, 72], y [-26, 24]**. `roamScale: 1` conserve le rayon existant du palier 2 ; taille et moteur d'animation inchangés. Les boîtes de marche sont entièrement dans un rectangle prudent de neige, éloigné du refuge, des cristaux et du portail. Les captures montrent des chevauchements entre les deux rangées, conservés pour validation par le propriétaire.

Reproduction et validation :

```powershell
node scripts/derive-habitat-art.mjs
node scripts/derive-habitat-art.mjs --check
npm.cmd test -- tests/neige-level2-art.test.js tests/habitat-art.test.js tests/habitat-shop-art-dom.test.ts tests/habitat-footprint.test.ts tests/habitat-upgrade-levels.test.ts --maxWorkers=1
npm.cmd run typecheck
npm.cmd run build:netlify
git diff --check
```

`--sources=<racine>` attend désormais les sous-dossiers `level1/` et `level2/` ; `--target=<dossier>` reste le dossier plat des dérivés. Le même pipeline vérifie les sept images. Tests : **79 réussis**, dont quatre nouveaux ; l'assertion de sélection existante attend désormais l'image uniquement pour Neige niveau 2 / palier 2, avec les autres replis conservés. Source absente, dérivé absent et source altérée ont chacun donné un code de sortie 1 sur des copies temporaires.

Contrôles Chromium sur le build local : amélioration réelle 1 → 2, cinq adultes Neige, gros plans et déplacement. Artefacts hors dépôt : `%TEMP%/prairie-neige-level2-20261023/`. Aucun essai physique iPhone ni publication.
