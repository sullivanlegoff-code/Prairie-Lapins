# Nid — dôme rose à entrée en cœur

## Référence et adaptation

Référence unique : [Nid.png sur main](https://github.com/sullivanlegoff-code/Project-L/blob/cc41f37767c948a30acd724ef438bc66966d6b9e/Nid.png), blob `4ed1b66c6a436e35686f0744065cc0b7273ec619`. [Original conservé séparément](references/nest/Nid-original.png). Aucun code de main n'a remplacé production.

[Comparaison référence/adaptation](proofs/nest/nest-reference-comparison.png). L'image a été inspectée puis adaptée avec un outil d'édition d'image. Le dôme rose, l'entrée en cœur, les conifères menthe, le ruisseau à gauche, le chemin de pierres et les fleurs restent reconnaissables. Rendu 3D adouci, contours et ombres doux, jardin resserré ; fond crème et tranche de terrain retirés. Aucun lapin permanent dans le bâtiment.

## Intégration et parents

- [PNG RGBA 1254 × 1254](../public/assets/buildings/nest-heart-cave.png), blob `b5b09bdaa4f774f71f1a52ffcb8507430f480ebd`. 50,32 % de pixels totalement transparents, aucun pixel opaque sur les bords. Texture préchargée une fois et partagée entre tous les rendus et l'aperçu d'achat/déplacement. Largeur 168 unités, origine (0,5 ; 0,68).
- Parents dans des objets séparés, avec leurs illustrations, proportions et animations actuelles. Deux emplacements devant l'entrée : (-27 ; 14), (43 ; 14), dans la couche des animaux au-dessus du bâtiment ; visages, longues oreilles et ailes dégagés. Aucune autre illustration de lapin modifiée.
- La présence au nid dépend toujours de la reproduction, y compris après son échéance et après rechargement. Le transfert manuel seul vide le nid et renvoie les parents vers leurs habitats d'origine, où leurs places et revenus restent réservés.
- Action de transfert à +46, devant le jardin et sous les parents ; sa zone tactile reste dans la propre empreinte du nid. Nom à +83, sans le cœur procédural superposé à l'ancienne illustration. Le compte à rebours et les portraits du panneau restent ceux du jeu.
- Empreinte logique 4 × 4, coordonnées, collisions, sélection logique et caméra inchangées. Aucune illustration de nid n'existait dans les cartes textuelles d'interface ; aucun nouvel écran ni vignette ajouté.
- La ferme conserve son asset exact `7d327382bf7714b8f32fc50ee08ebb7eb4b94ff5` et son recalage. Aucun changement des autres bâtiments, reproduction, probabilités, délais, prix, XP, niveaux ou sauvegardes v9. Supabase reste en pause. Prévisualisations historiques figées conservées.

Les builds et les pages publiques comparent les octets du nouveau nid et ceux de la ferme à leurs blobs Git, dans les deux modes.

## Vérification ciblée et preuves

`node docs/nest-art-browser-check.cjs <racine construite> <révision>`, depuis le projet après installation de Playwright/Chromium. Le contrôle utilise les vrais boutons et gestes, le scénario existant Bâtiments décalés, une lecture seule des sauvegardes et le modèle pur de caméra compilé depuis ses sources inchangées. Aucun hook ni écriture directe de partie.

[Revue ciblée réussie 38922597480](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38922597480), candidat `3eb93fe` : 157 tests concernés, TypeScript, builds normal/laboratoire, parcours visuel et parcours public existant de reproduction. Nid vide, reproduction Bélier Gris/Volant, parents séparément sélectionnables et verrouillés au nid, trois zooms (0,4 / 1,05 / 1,65), paysage 852 × 393 et portrait 390 × 844, déplacement annulé puis confirmé sans perte du travail, rechargement, résultat prêt toujours au nid, action de transfert manuelle et double pression, retour aux habitats, nid à nouveau vide, ferme et production préservées, isolation normal/laboratoire et texture partagée.

Captures du rendu réel de ce candidat applicatif :
- [Comparaison](proofs/nest/nest-reference-comparison.png).
- Nid vide : [paysage](proofs/nest/nest-empty-852-normal.png), [portrait](proofs/nest/nest-empty-390-normal.png).
- Nid occupé, Bélier Gris et Volant : [paysage](proofs/nest/nest-occupied-852-normal.png), [portrait](proofs/nest/nest-occupied-390-normal.png).
- [Compte à rebours en cours](proofs/nest/nest-running-panel.png).
- [Terminé, parents encore présents et action de transfert](proofs/nest/nest-ready-landscape.png).
- [Nid vide après transfert](proofs/nest/nest-empty-after-transfer.png).

Les artefacts contiennent également les trois distances dans les deux orientations et l'aperçu de déplacement. L'image reste statique ; les détails fins s'atténuent au zoom éloigné. Vérifications mobiles simulées, aucun Safari physique revendiqué.

## Point de reprise

Intégration applicative enregistrée en `7e344a5`, depuis production `e422f28`. Le premier contrôle `15b066c` a arrêté son toucher sur le bandeau du laboratoire : [38922112005](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38922112005). Correction du cadrage du test en `3eb93fe`, assertions conservées ; revue complète réussie ci-dessus. Le candidat final ajoute les captures, l'attente de la CI obligatoire et le contrôle du cache, et cadre mieux l'aperçu pour la preuve, sans nouvelle modification applicative ni graphique. Le workflow temporaire de revue est retiré.

Le parcours du nid rejoint la CI obligatoire existante sans suppression ni assouplissement d'un contrôle. Il reste à confirmer cette CI finale, puis fusionner et publier normal/laboratoire ; la révision et les preuves publiques finales seront enregistrées dans la description de PR.
