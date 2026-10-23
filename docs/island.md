> Bilan historique v5. La livraison actuelle v6 utilise neuf parcelles et douze objets extérieurs : voir [règles et migration v6](land-v6.md). Les commandes intérieures et les deux extensions en bandes décrites ici ont été remplacées.

# Île chaleureuse — prévisualisation Décorations

**Publication vérifiée :** sources Décorations `db01f39215d2023b893fe266a68a2bbe1630b556`, [workflow 37922205251 réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37922205251). Contrôle HTTP des quatre fichiers de révision et scripts réellement servis réussi le 9 octobre 2026 à 11:13 UTC. Jeu/laboratoire `ae31131` v4, comptes `3e70d9e` v4, Décorations `db01f39` v5. Terrain/scénarios d’île, sélection/vente et absence du client de comptes contrôlés. [Preuve publique](validation/publication-island-2026-10-09.json). Ce contrôle HTTP depuis Actions ne remplace pas un essai Safari physique.

Chantier repris le 9 octobre 2026 depuis la branche `feature/meadow-decoration`, PR nº 2 ouverte en brouillon, tête vérifiée `a64bb0e5949efc2e8522a822b10b0c9c8b6a955c`. Application auparavant publiée : `f87f265176e9deae2215bae780ea6d22cbb0484a`. La sélection directe et la vente restent présentes. [Prévisualisation](https://sullivanlegoff-code.github.io/Project-L/preview/decorations/).

## Référence observée et adaptation

L’image jointe montre un plateau en losange vu du dessus, avec une profondeur comprimée. L’herbe jaune-verte a des variations larges, des petites touffes et quelques fleurs blanches. Le bord herbeux irrégulier surplombe des facettes de terre ocre, plus sombres à droite ; le sable et l’eau turquoise suivent les bords inférieurs. La lumière arrive du haut gauche, sur un fond blanc chaud. Des plaques de terre dessinent des passages doux.

Le dessin du jeu est original, réalisé en vecteurs Phaser dans `src/display/islandArt.ts`. Il adapte ces éléments à la projection aérienne rectangulaire existante : aucune rotation ou déformation du fond sous les bâtiments. Le contour arrondi dépasse légèrement toutes les cases, avec une faible épaisseur ocre et une ombre douce. L’herbe tendre et dorée présente des variations peu contrastées, des touffes surtout sur le bord et de très rares fleurs minuscules ; le centre reste libre. Le chemin beige est continu, courbe, périphérique, avec plusieurs bandes fondues et des extrémités effilées.

La description demandée limite l’eau à une petite côte en bas à gauche : elle remplace donc l’eau qui entoure plusieurs côtés dans l’image. Sable et eau sont dessinés derrière le plateau, sans retirer une case. Le blanc chaud remplace le fond vert extérieur. Les habitats, objets et lapins gardent leur dessin et leurs placements.

## Tailles, couches et conservation

Le contour, le chemin et les détails sont recalculés géométriquement pour les terrains 3 × 2, 6 × 2 et 9 × 2 ; aucune petite image étirée. L’espacement des points de contour évite que les extensions longues déforment les coins. Le rivage reste ancré au coin gauche. La prochaine extension apparaît comme une esquisse pâle séparée, marquée « Terrain réservé » avec le coût habituel.

Les commandes graphiques sont conservées entre les images et les sauvegardes ordinaires, puis reconstruites seulement lorsque la disposition des bâtiments/occupants ou l’extension change, selon le cache de scène existant. Aucun générateur aléatoire, texture recréée par image ou animation de terrain. Les couches purement décoratives n’ont aucune zone interactive. Ombre, côte, terre, herbe et chemin précèdent les bâtiments ; objets, lapins, sélection, bulles et interface gardent leurs priorités.

Projection, caméra, recentrage, gestes, zoom initial 1,05 et bornes 0,8–1,65, lapins ×1,3 et rayon tactile 27 pixels écran : inchangés. Ce cadrage ne montre pas obligatoirement toute la côte sur un petit écran ; faire glisser la vue pour l’observer. Les coordonnées et règles de placement n’ont pas changé. Format v5, migrations, ressources, identifiants et clés de stockage conservés. Aucun service de comptes/email/Supabase activé.

## Scénarios volontaires

Dans **Outils test**, trois nouveaux boutons : « Île presque vide — 3 × 2 », « Île presque vide — 6 × 2 » et « Île presque vide — 9 × 2 ». Chaque chargement demande une confirmation et remplace uniquement la partie Décorations de test. Ils gardent l’enclos initial et deux lapins, avec des ressources explicitement préparées pour tester. Les extensions utilisent les commandes de simulation et leurs coûts habituels. Aucune partie n’est remplacée automatiquement.

Les quatre scénarios précédents restent accessibles : départ ordinaire, démonstration aménagée, habitat décoré à sept occupants et prairie dense. Aucun scénario d’île exposé au laboratoire normal.

## Validation reproductible

**Validation distante réussie sur le SHA publié :** [Actions 37921805427](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37921805427), 474 tests, TypeScript/build et les quatre parcours Chromium. [Captures et rapports du runner](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37921805427/artifacts/11612484276), conservés jusqu’au 8 novembre 2026 ; [bilan durable](validation/island-2026-10-09.json). Stress CI : 3,60 images/s, p95 300 ms, images et 14 textures réutilisées ; aucune extrapolation à l’iPhone.

`npm test` : **474 tests / 12 fichiers réussis**. Les trois scénarios sont couverts par les tests existants de validation v5, sérialisation et isolation ; leur visibilité et leur confirmation sont vérifiées dans le DOM. TypeScript, build Décorations et contrôle de son préfixe/outillage/absence du client de comptes réussis. Lockfile inchangé.

`docs/island-browser-check.cjs` vérifie le véritable rendu Chromium tactile : trois tailles × trois zooms, douze poses/sélections aux coins, déplacement avec ancien placement conservé, annulation exacte puis validation, vente annulée puis double confirmation ne créditant qu’une fois, rangement gratuit, conservation au rechargement et bâtiment sur la case d’extrémité libérée. Récolte, photo/retour au jeu, vues 852 × 393 et 667 × 375, clés des autres routes préservées et absence de requête Supabase. Les hooks sont interceptés dans le profil de test ; ils ne sont pas ajoutés aux sources du jeu.

Les trois parcours existants vérifient les douze références en jeu normal/Aménagement, les priorités d’interaction, le drag/pinch, la rotation, l’inventaire, l’export v5, les sept lapins aux trois zooms et le stress 512 exemplaires. La CI Décorations exécute désormais aussi le parcours d’île et conserve ses rapports/captures 30 jours.

Pour comparer localement avec une copie du point de départ au même cadrage :

```bash
PRAIRIE_TEST_URL=http://127.0.0.1:5178/Project-L/preview/decorations/ \
PRAIRIE_BEFORE_URL=http://127.0.0.1:5179/Project-L/preview/decorations/ \
PRAIRIE_CAPTURE_DIR=/tmp/prairie-island-captures \
node docs/island-browser-check.cjs
```

Captures durables dans [images/island-2026-10-09](images/island-2026-10-09/) : [avant](images/island-2026-10-09/before-furnished-wide.png), [après au même cadrage](images/island-2026-10-09/after-furnished-wide.png), [île initiale presque vide](images/island-2026-10-09/island-3-zoom-0.8.png), [île entièrement agrandie](images/island-2026-10-09/island-9-zoom-0.8.png), [mobile aménagé](images/island-2026-10-09/after-furnished-mobile.png), [sept lapins](images/island-2026-10-09/seven-mobile.png), [photo](images/island-2026-10-09/photo-mobile.png). Rapports JSON du rendu et des parcours conservés au même endroit. Les captures avant proviennent des sources vérifiées `a64bb0e`, sans écraser le chantier ; les valeurs de caméra sont identiques entre avant/après.

## Limites et essai iPhone

Ces captures et interactions sont des essais Chromium réels sur Linux, pas Safari physique. Stress local extrême : 512 exemplaires, 254 images posées, 180 images mesurées, moyenne 4,64 images/s et p95 267 ms dans ce cloud ; images réutilisées et 14 textures de décorations conservées. Ce scénario reste lent ici. Cette mesure ne permet pas de revendiquer une cadence iPhone ni une comparaison avec une exécution historique sur un autre runner. L’illustration conserve la projection du jeu et ne reproduit pas une isométrie mathématique stricte. La petite côte reste décorative, sans ressource ni outil de chemin.

Sur iPhone en paysage : ouvrir la preview, vérifier la révision dans Paramètres ; charger volontairement une île presque vide dans Outils test, glisser vers la côte ; regarder l’extension complète ; charger la démonstration, toucher un objet, déplacer/annuler puis vendre/annuler ; vérifier les sept lapins et entrer/sortir du mode photo. Garder un export avant de remplacer sa partie de test.

La publication réunit les quatre routes dans le même artefact : jeu et laboratoire restent sur `ae31131` v4 ; comptes sur `3e70d9e` v4 ; seule l’application Décorations v5 est remplacée. La PR reste en brouillon, sans intégration de cette refonte au jeu normal. Le suivi exact des révisions servies et workflows est consigné en tête de [progress.md](progress.md).
