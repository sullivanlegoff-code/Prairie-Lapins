> Bilan historique v5. La livraison actuelle v6 utilise neuf parcelles et douze objets extérieurs : voir [règles et migration v6](land-v6.md). Les commandes intérieures et les deux extensions en bandes décrites ici ont été remplacées.

# Décorations — prévisualisation v5

**Catalogue de lapins étendu :** quinze espèces, carnet à neuf recettes, filtres de collection ; quatre nouveaux lapins en couleur simple, sans accessoire ou animation nouvelle. Les douze objets, l’île, les habitats et leurs interactions sont conservés. [Règles et essai](species.md).

**Préparation stable :** fond composé en cache pour améliorer le rendu sans modifier placements, sélection ou simulation ; source brute avant migration exportable dans Paramètres ; neuf copies v4 et treize contrôles de migration/récupération, session répétée et cinq parcours tactiles. [Mesures avant/après](performance.md), [procédure de récupération](migration-v5.md). Aucune intégration de v5 au jeu normal pendant cette tâche.

**Refonte de l’île — 9 octobre 2026 :** herbe tendre et dorée dégagée, contour arrondi avec relief doux, petite côte turquoise/sable en bas à gauche, chemin courbe derrière les bâtiments et fond blanc chaud. Trois nouveaux scénarios presque vides (3 × 2, 6 × 2, 9 × 2) dans Outils test, uniquement après confirmation. Les quatre scénarios précédents restent disponibles ; projection, caméra, lapins, placements, sélection/vente et v5 conservés. [Analyse de l’image, fonctionnement, captures et essai iPhone](island.md).

Prévisualisation : **https://sullivanlegoff-code.github.io/Project-L/preview/decorations/**.
Branche `feature/meadow-decoration`, [PR nº 2 en brouillon](https://github.com/sullivanlegoff-code/Project-L/pull/2), sans fusion du jeu v5 sur la route normale. Les sources applicatives de Décorations sont épinglées par le publisher ; la révision actuelle est indiquée ci-dessous, dans Paramètres et dans `build-revision.txt`. Des commits documentaires plus récents dans la branche ne changent pas la révision applicative servie.

**Publication vérifiée — quinze espèces :** sources Décorations `85fe255ec8e7e65213cd570f91f5bb1fe66a30d7`, [workflow 37949526936 réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37949526936). Quatre révisions, HTML et scripts servis contrôlés ; noms des quatre nouvelles espèces et filtres présents. Jeu/laboratoire `ae31131` v4 et comptes `3e70d9e` v4 conservés. [Preuve publique](validation/publication-species-2026-10-09.json). Aucun essai Safari physique revendiqué.

Le jeu normal reste en v4 à [l’adresse habituelle](https://sullivanlegoff-code.github.io/Project-L/), le [laboratoire](https://sullivanlegoff-code.github.io/Project-L/dev/) aussi. Les [comptes expérimentaux](https://sullivanlegoff-code.github.io/Project-L/preview/accounts/) restent sur leurs sources v4 figées `3e70d9e8cbe9228c63c73db007fff199199d6470` ; connexion email et synchronisation en pause. Cette livraison ajoute seulement une quatrième route, dans le même artefact Pages. Aucune intégration de la v5 en production avant retour visuel du joueur.

## Sélection directe et vente — 9 octobre 2026

Retour iPhone du joueur : prévisualisation globalement fonctionnelle, mais décoration posée difficile à sélectionner. Sélection directe corrigée et vente ajoutée conformément à sa demande, depuis le dernier état `b45d83d` de la PR nº 2. Les parties v5 et les autres espaces de sauvegarde sont conservés.

**Validation finale : 471 tests / 12 fichiers, TypeScript, build isolé et trois parcours Chromium réussis** dans [Actions 37916978330](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37916978330), sources `f87f265176e9deae2215bae780ea6d22cbb0484a`. Douze références sélectionnées directement en jeu normal et Aménagement, cadre visible, couronne d’arbre aux trois zooms, vide/photo/drag/pinch, priorités lapin/décoration/récolte, vente annulée/double confirmation, exemplaire restant, rechargement et vente d’inventaire. Rangement/déplacements/rotation/export, quatre scénarios, 512 exemplaires et panneau 667 × 375 conservés. Sept lapins × trois zooms : 21/21. Zéro erreur console/page et zéro demande Supabase dans les parcours contrôlés. [Rapport durable](validation/selection-vente-2026-10-09.json), [captures et rapports du runner](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37916978330/artifacts/11611150435) (artefact conservé 30 jours).

Ces tests utilisent des profils Chromium jetables contre Vite ; les hooks sont interceptés uniquement dans le test et ne sont pas publiés. Aucun essai Safari physique n’est revendiqué. Le stress extrême est une mesure de runner, sans extrapolation à l’iPhone. Les prix d’achat, identifiants, v5 et clés sont conservés ; comptes/email/Supabase restent en pause. Lors de cette livraison de sélection/vente, l’image n’avait pas encore été reçue ; la refonte réalisée depuis est décrite dans [island.md](island.md).

## Finition reprise le 9 octobre 2026

Base relue et récupérée : `c9919b2b5d98ba1fc26c60758cc138037dbae7dd` (PR #2). Les sources actives, assets, tests et configurations ont été contrôlés par empreintes Git avant modification, dans une copie séparée de l’ancien `main` local.

- **Départ** : partie ordinaire, 300 pattes, deux lapins, inventaire vide ; pour achat et pose.
- **Démonstration** : les douze références sont toutes posées, y compris le tunnel intérieur qui manquait à la démonstration précédente. Disposition extérieure aérée.
- **Sept occupants** : sept lapins et trois objets dans l’habitat initial ; toutes les références sont également visibles sur la prairie.
- **Prairie dense** : 512 objets possédés, 140 posés, deux extensions, sept occupants ; inventaire et rechargement vérifiés. Il s’agit d’un scénario de stress.

Tous sont dans **Outils test → Scénarios préparés**, uniquement dans Décorations, après confirmation. Leur chargement ne touche aucune clé des autres routes.

Pose : message neutre avant sélection, confirmation et annulation visibles pendant le défilement, emplacement précédent atténué pendant le déplacement. La liste « Objets posés » reste ouverte pendant les sauvegardes automatiques. Arbres et arches plus modestes ; textures partagées boutique/prairie et échelle identique entre objet et fantôme.

Validation de cette reprise : **441 tests**, TypeScript, trois builds (preview et deux builds de contrôle), contrôles de bundles ; Chromium tactile 852 × 393 et 667 × 375, achat → pose/rotation → déplacement → rangement → rechargement/export, refus et annulations, quatre scénarios et isolation des clés. [Rapport tactile](images/decorations/finition-2026-10-09/flow-report.json), [rapport gestes/sélections](images/decorations/finition-2026-10-09/browser-report.json), [captures](images/decorations/finition-2026-10-09/).

Reproduire le parcours tactile : `NODE_PATH=CHEMIN_PLAYWRIGHT PRAIRIE_CAPTURE_DIR=DOSSIER node docs/decorations-flow-check.cjs`, contre Vite en mode `decorations-preview`. Profil Chromium jetable, hooks interceptés uniquement dans le test ; aucun hook dans les builds publiés.

## Catalogue original

Paramètres : `src/config/decorations.ts`. Illustrations SVG originales : `src/display/decorationArt.ts`, utilisées à la fois dans la boutique et comme textures Phaser mises en cache. L’image DragonVale fournie sert de référence d’intention ; aucun de ses éléments n’a été copié.

| Identifiant stable | Objet | Pattes | Empreinte / destination |
|---|---|---:|---|
| `wildflowers` | Massif de fleurs sauvages | 20 | 1 × 1 extérieur |
| `flowering-bush` | Buisson fleuri | 30 | 1 × 1 extérieur |
| `moss-rock` | Petit rocher moussu | 40 | 1 × 1 extérieur |
| `garden-lantern` | Lanterne de jardin | 60 | 1 × 1 extérieur |
| `wood-bench` | Banc en bois | 80 | 2 × 1, ou 1 × 2 après rotation |
| `flower-arch` | Arche fleurie | 100 | 2 × 1, ou 1 × 2 après rotation |
| `fruit-tree` | Petit arbre fruitier | 120 | 2 × 2 extérieur |
| `small-pond` | Petit bassin | 150 | 2 × 2 extérieur |
| `soft-cushion` | Coussin douillet | 30 | Emplacement d’habitat |
| `ball-toys` | Balle et jouets | 40 | Emplacement d’habitat |
| `play-tunnel` | Tunnel de jeu | 60 | Emplacement d’habitat |
| `small-parasol` | Petit parasol | 80 | Emplacement d’habitat |

Objets esthétiques : aucun bonus, mission, revenu, affection ou changement des probabilités. Achats uniquement en pattes, jamais par complément en cœurs. Plusieurs exemplaires sont permis ; chaque achat possède son identifiant `decoration-N`. Vente d’un exemplaire placé ou en réserve : 50 % du prix d’achat en pattes, arrondi à l’entier inférieur, aucun remboursement en cœurs. Le taux est centralisé dans `DECORATION_RESALE_RATE`. Les bâtiments, habitats et lapins sont exclus. Déplacements et rangements gratuits. Hypothèse de protection des imports/appareils modestes : 512 exemplaires possédés maximum, objets rangés compris. Un refus ne détruit aucun objet.

## Utilisation et gestes

Boutique → Décorations → choisir un objet → confirmer l’achat. L’objet est enregistré dans l’inventaire avant de proposer sa pose. **Annuler la pose conserve l’achat.**

Toucher directement la silhouette d’un objet extérieur ou intérieur ouvre son nom et ses actions, en jeu normal comme en Aménagement. Un cadre doré l’identifie dans la prairie. Une zone vide désélectionne ; la liste « Objets posés » reste une solution complémentaire et met également l’exemplaire en évidence. « Aménager » ouvre l’inventaire et affiche le mode actif. Actions : Déplacer, Tourner pour banc/arche, Ranger, Vendre. Une destination est un aperçu : vert et ✓ si valide, rouge et × sinon. Confirmer la pose est toujours explicite. Annuler un déplacement conserve l’ancien placement. Fermer le panneau, quitter le mode ou ouvrir une autre section annule l’aperçu. Aucun retour arrière global.

Glisser déplace la caméra, pincer zoome ; ces gestes n’effectuent aucune pose ni sélection. Les panneaux HTML ne commandent pas la caméra. Les silhouettes sont sélectionnables au-delà de leur empreinte au sol ; les marges transparentes et ombres légères ne capturent pas les touches. En cas de chevauchement intérieur, les lapins gardent la priorité en jeu normal, les décorations en Aménagement. Les boutons/panneaux HTML et bulles de récolte gardent leur priorité dans les deux modes. Le mode photo observe la scène sans sélectionner ni ouvrir de panneau. Projection, proportions des lapins, zoom 0,8–1,65 et rayon de sélection écran de 27 px conservés.

Chaque case de bâtiment contient 4 × 4 cellules fines : 12 × 8, 24 × 8 et 36 × 8 selon l’extension. Empreinte entière sur terrain débloqué, sans bâtiment ni autre décoration. Traverser deux cases libres est permis. Rotation à 90° réservée au banc et à l’arche : empreinte et texture changent ensemble. Aucun arrangement automatique.

Un bâtiment bloqué propose de **ranger les objets de cette case avec confirmation**, puis il faut confirmer séparément l’achat ou le déplacement du bâtiment. Aucune dépense pendant le rangement. Le rangement inclut tout exemplaire dont l’empreinte traverse la case.

Chaque habitat a exactement trois emplacements stables sur ses bords, quel que soit son type ou niveau. Ils ne consomment aucune place de lapin. Les références `habitatId` + `slot` suivent le déplacement/amélioration de l’habitat. Un emplacement occupé refuse la nouvelle pose et propose un rangement confirmé de l’ancien objet ; aucune substitution silencieuse. Les objets sont dessinés derrière les lapins, les noms devant les objets et les bulles au-dessus.

Le bouton appareil photo, près de Recentrer, masque temporairement HUD, panneaux, bulles et grille. La caméra reste utilisable ; un bouton discret permet de revenir au jeu. Aucun état de partie modifié et le cycle de sauvegarde de cinq secondes continue. Utiliser la capture système de l’iPhone.

## Vente confirmée et atomique

Depuis le panneau d’un objet placé ou « Actions de cet exemplaire » dans l’inventaire : **« Vendre [nom] pour [montant] pattes ? »**. Exemple : un banc acheté 80 pattes rapporte 40 pattes. Annuler conserve exactement l’objet et les ressources. La confirmation est consommée une fois ; une double pression ne vend aucun autre exemplaire.

`sellDecoration` vérifie l’identifiant encore présent et le solde sûr, retire uniquement cet exemplaire, libère sa destination éventuelle et crédite le montant calculé dans la simulation. Le contrôleur écrit le résultat complet avant de l’activer. Refus d’écriture, de lecture ou conflit de sauvegarde : aucune vente activée, objet et paiement conservés, avertissement visible. Réessayer une sauvegarde ne rejoue jamais une vente. Après vente/rangement, le panneau ferme en jeu normal ou revient à l’inventaire en Aménagement ; aucune commande ne vise un exemplaire absent.

## Stockage et transfert volontaire

La séparation dépend des clés, pas des chemins : les quatre versions partagent une origine GitHub Pages.

| Espace | Préfixe / clés |
|---|---|
| Partie normale v4 | `prairie-lapins.save.v1`, préférences `prairie-lapins.ui.v1` |
| Laboratoire v4 | `prairie-lapins.development.` + clés ; horloge `…clock`, préférences `…ui` |
| Prévisualisation comptes v4 | `prairie-lapins.preview.accounts.` ; compte propriétaire et session sous ce même espace |
| Décorations v5 | `prairie-lapins.preview.decorations.` + **toutes** les clés du contrôleur |

Dans Décorations : partie `prairie-lapins.preview.decorations.prairie-lapins.save.v1`, préférences `prairie-lapins.preview.decorations.ui`, horloge `prairie-lapins.preview.decorations.clock`, secours v4 `prairie-lapins.preview.decorations.prairie-lapins.backup.before-v5`. Les autres secours historiques sont également préfixés. Aucun repli vers une autre route.

Pour tester une copie : exporter dans le jeu normal, garder le fichier source, puis l’importer volontairement dans Décorations. Migration v4 → v5 = mêmes champs de progression, `version: 5` et `decorations: []`, sans redotation de cœurs ni récompenses. Versions v1/v2/v3 toujours importables par les migrations existantes suivies de cette étape. Avant toute écriture de migration, le JSON original est conservé dans son secours local ; un échec d’écriture laisse la sauvegarde active originale intacte.

Les imports v5 sont stricts : catalogue, limite d’exemplaires, identifiants uniques/counter, localisation exclusive, empreintes, rotation, terrain, références et slots. Export complet **v5** avec nom `prairie-lapins-PREVIEW-DECORATIONS-v5-MODE-TEST-…json`. Ne pas l’importer dans les trois versions encore en v4 : elles ne le prennent pas en charge. Aucun déguisement en v4 ni suppression de décoration pour forcer une compatibilité.

« Outils test » ouvre des commandes visibles et séparées : ajouts de ressources prédéfinis, cinq avances de temps, départ ordinaire, démonstration complète, habitat décoré à sept occupants, prairie dense, anciens scénarios, export/import et nouveau départ confirmé. Reset conserve l’horloge, les préférences et les secours de cette prévisualisation ; aucune autre sauvegarde touchée.

Aucun SDK, compte, client cloud ou requête Supabase dans le build Décorations. La politique de session `onlineServicesAllowed: false` doit être respectée par tout futur adaptateur. [Adaptations futures des comptes pour v5](accounts-v5-compatibility.md).

## Construction et publication

Node 24, lockfile npm inchangé : `npm ci`, `npm test`, `npm run typecheck`, `npm run build:decorations`. Contrôle du build : `node scripts/verify-decorations.mjs CHEMIN_BUILD`. L’outil `build:pages` de cette branche vérifie également que le build normal exclut les commandes de test ; **ses builds v5 root/dev servent uniquement aux contrôles, ils ne sont pas publiés**.

Le workflow `production` construit root + laboratoire depuis leurs sources stables v4, récupère les comptes au SHA v4 figé et Décorations au SHA v5 figé de la branche dédiée. Quatre chemins sont réunis avant un unique upload/déploiement Pages ; chaque chemin indique sa propre révision. Actions externes épinglées. Une mise à jour de la preview nécessite de tester le nouveau SHA, changer uniquement sa référence figée, puis publier l’artefact complet.

Point de retour avant cette quatrième route : `45323cb`, sans format ni données normales modifiés. Un retour au workflow précédent retire seulement la route Décorations du site ; ses clés locales v5 restent conservées. Un retour de la preview vers un ancien SHA v5 compatible conserve sa partie. Ne pas publier un ancien lecteur v4 sur le préfixe Décorations v5.

## Vérifications et essai iPhone

Tests automatisés : achats/refus/double pression, collisions, rotations, limites, propriété, annulations, rangement, construction bloquée, slots, références lors de déplacements/améliorations, migrations et erreurs d’écriture, import invalide, export/rechargement, préfixage de chaque accès et économie/reproduction préservées. Rapport réel et captures : [progress.md](progress.md). [Avant](images/decorations/before.png), [après](images/decorations/after.png), [sept occupants](images/decorations/seven.png), [photo](images/decorations/photo.png). Le script `decorations-browser-check.cjs` vérifie le rendu Phaser/gestes dans Chromium ; `decorations-hosted-check.cjs` vérifie les quatre builds sur la même origine, avec profils jetables.

Essai iPhone, ordinateur éteint :

1. Ouvrir la prévisualisation dans Safari paysage et vérifier « PRÉVISUALISATION DÉCORATIONS v5 — PARTIE SÉPARÉE ».
2. Outils test → démonstration décorée, puis sept occupants : toucher les sept lapins, glisser et pincer.
3. Boutique → Décorations : acheter un banc, annuler sa pose, retrouver l’exemplaire dans Aménager ; le poser. Toucher directement son dessin en jeu normal : cadre doré, nom et actions. Déplacer/annuler, tourner, puis ranger ; ressources inchangées.
4. Toucher un coussin intérieur puis un lapin voisin ; essayer aussi en Aménagement. Tester vide, glissement, pincement et photo : pas de sélection accidentelle. Vendre un banc : annuler puis confirmer, vérifier +40 pattes une seule fois et sa disparition ; recharger. Refaire depuis l’inventaire.
5. Exporter le JSON v5 de test ; revenir au jeu normal et vérifier sa progression habituelle. Garder cet export séparé des exports normaux.

Limites : esthétique seulement, 512 exemplaires, trois slots intérieurs fixes, pas de téléchargement photo intégré. Pas de mesure sur iPhone physique ; validation Safari et retour visuel du joueur nécessaires avant intégration. Pas de comptes ni migration serveur dans cette étape.
