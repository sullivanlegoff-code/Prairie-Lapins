> Bilan historique v5. La livraison actuelle v6 utilise neuf parcelles et douze objets extérieurs : voir [règles et migration v6](land-v6.md). Les commandes intérieures et les deux extensions en bandes décrites ici ont été remplacées.

# Fluidité et préparation v5 — 9 octobre 2026

Reprise vérifiée de la branche PR nº 2 à `d7fe786fa4859ee5c8db24ac856e4baaf4045c11`, application publiée auparavant `db01f39`. Aucun changement plus récent trouvé. Le jeu normal/laboratoire restent figés à `ae31131` v4 ; comptes `3e70d9e` v4 et leur branche inchangés. [Prévisualisation Décorations](https://sullivanlegoff-code.github.io/Project-L/preview/decorations/).


**Publication vérifiée :** application `a7635ec44400dba55d2e57cdd7b94cc14e3bac46`, [publisher 37939108829 réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37939108829), quatre routes HTTP/révisions/scripts contrôlées le 9 octobre à 15 h 47 (Paris). [Preuve publique](validation/publication-performance-2026-10-09.json). **Préflight futur réussi** dans [Actions 37938964487](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964487) : [artefact unique de revue](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964487/artifacts/11620940193), conservé 30 jours, root/dev/Décorations v5 et comptes v4 ; [preuve](validation/integration-v5-preflight-2026-10-09.json). Cet artefact n’a pas été déployé.

**CI finale réussie :** application `a7635ec44400dba55d2e57cdd7b94cc14e3bac46`, [Actions 37938964352](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964352), **487 tests / 13 fichiers**, TypeScript/build et cinq parcours Chromium. [Preuve durable](validation/performance-ci-2026-10-09.json), [captures/rapports](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964352/artifacts/11621205985), conservés 30 jours. Session répétée : 75 secondes dans Actions (61 localement), 36 panneaux, 12 cycles Aménagement/photo, 20 scénarios, neuf déplacements de trois objets ; comptes d’objets/textures/listeners/timers stables et export de source v4 exact après rechargement.
## Mesures et causes

Même machine cloud, Chromium système/Linux avec rendu logiciel, profil tactile jetable 852 × 393, zoom 1,05, panneaux fermés, animations normales et sauvegarde de cinq secondes conservées. Deux fenêtres de 12 secondes par scénario ; cadence calculée par total d’images/temps total, p95 ci-dessous = le plus haut des deux p95. Pas de capture ou d’instrumentation des méthodes pendant ces mesures passives. Captures après la mesure. Le profilage et la suppression temporaire du fond sont des diagnostics **séparés**, exclus du tableau. Profils avant et après exécutés séquentiellement, depuis deux copies de sources et deux serveurs locaux indépendants.

| Scénario | Possédés / posés / lapins | Avant images/s | Après images/s | p95 avant → après |
|---|---:|---:|---:|---:|
| Départ ordinaire | 0 / 0 / 2 | 7,25 | 31,21 | 183 → 50 ms |
| Prairie aménagée | 14 / 14 / 2 | 4,93 | 28,38 | 250 → 67 ms |
| Stress préparé existant | 512 / 140 / 7 | 3,82 | 19,50 | 417 → 67 ms |

Le stress annoncé précédemment à 3,6 images/s utilisait **254 objets posés**, pas les 140 du scénario accessible. Il n’est pas présenté comme le point avant du nouveau tableau. Le parcours historique reconstruit à 254 images est également rejoué comme régression, avec son rapport séparé.

Le fond possède 21 430, 40 689 puis 53 711 entrées de commandes graphiques selon la taille et les bâtiments. Les objets Graphics ne sont pas recréés à chaque image, mais leurs commandes de polygones, ellipses et transparences sont réexécutées par le renderer. Masquer uniquement fond statique/labels donne environ 49/42/26 images/s : la cause dominante est le rendu de ces vecteurs, pas un parcours de 512 objets en réserve.

Profilage séparé de 6,5 secondes : soumission CPU au renderer, environ 4,36/9,12/9,37 ms par appel avant, contre 0,31/0,45/0,72 ms après. Cela ne mesure pas le temps GPU ; le temps d’image passif inclut l’attente de composition. Mise à jour des lapins ≤0,2 ms observés. À 512 exemplaires, écriture/validation/sérialisation du contrôleur coûte environ 12 ms, seulement lors de la sauvegarde/action ; aucune suppression ni ralentissement de la simulation. Les panneaux et bulles coûtent moins que le fond ; aucune réécriture générale de leur logique.

Interaction distincte : toucher réel d’un lapin ouvre le panneau ; coût du gestionnaire avant/après environ 5,2/5,0 ms au départ, 4,7/3,6 ms aménagé et 17,8/19,5 ms dans le stress. Un seul toucher par cas ne constitue pas une distribution de latence. La prochaine image est observée séparément ; ces chiffres excluent le transport Playwright et ne représentent pas une latence tactile iPhone.

## Optimisation ciblée

`MeadowScene.ts` compose les vecteurs originaux du terrain et des bâtiments dans **une texture transparente**, à deux pixels par unité du monde pour rester lisible au zoom 1,65. La résolution est plafonnée par la limite GPU. Le plus grand fond est 3 588 × 1 032 pixels, environ 14,8 Mo RGBA par copie ; canvas/GPU ajoutent leur propre stockage. Une seule texture courante reste conservée, l’ancienne est détruite lors d’un changement de disposition et la dernière à l’arrêt de scène. Son image est réutilisée entre sauvegardes, gestes et ouvertures de panneau. Les Graphics temporaires sont détruits après composition.

La scène ne rejoue plus les dizaines de milliers de commandes du fond par image. Les fichiers vectoriels restent les sources originales ; géométrie, île, côte, chemin, habitats, coordonnées, camera, zoom et taille/identité des lapins sont conservés. Le rendu Canvas composé peut légèrement changer l’anticrénelage et les nuances de transparence ; inspection visuelle des trois tailles et trois zooms effectuée. Fond sans zone tactile, sélection sur les silhouettes de décorations toujours séparée.

Inventaire non placé : aucun objet Phaser créé. Stress : 512 possédés mais 140 images placées et sept lapins ; 231 objets Phaser descendants avant/après. Les 14 textures de décorations sont réutilisées. Une texture de fond supplémentaire ; aucun nouveau timer, listener, dépendance ou calcul de reproduction. Le tri et les masques de sélection existants restent inchangés : ils ne dominent pas ces mesures.

## Stabilité, migrations et revue

Un parcours répété d’environ 60 secondes ouvre/ferme 36 panneaux, entre/sort 12 fois de l’aménagement et de la photo, change caméra/zoom, charge 20 scénarios, valide neuf mouvements puis recharge. 49 objets, 18 textures dont 14 de décorations/une de fond, trois abonnés au contrôleur, zéro timer Phaser et une seule scène active : nombres stables pour la scène de démonstration. Les UUID des textures de texte peuvent changer après reconstruction ; leur **nombre** est contrôlé, pas un nom aléatoire. Pas d’accumulation observée ; cet essai court n’est pas une preuve d’absence de fuite sur plusieurs heures.

L’export de secours avant migration conserve exactement le JSON v4 importé, y compris son formatage, puis retrouve ce secours après rechargement. Les neuf copies de parties et treize contrôles de migration/récupération vérifient tous les champs, résultats/réservations, revenus fractionnaires, délais, absence de redotation et non-répétition, échec de copie/écriture et conflit. **487 tests / 13 fichiers**, TypeScript et builds Décorations/normal v5/laboratoire v5 réussis. Les builds v5 normal/laboratoire sont des préparations, jamais les versions normales publiées. [Procédure de récupération et ancien onglet v4](migration-v5.md).

Les quatre régressions Chromium de l’île, de la sélection, de l’aménagement et des gestes/densité vérifient les priorités, placement, rotation, mouvement, vente, sept occupants, bulles, photo et sauvegardes. La CI ajoute le parcours répété/export de secours et prépare séparément un artefact unique de quatre routes futures, sans droits Pages ni déploiement. Comptes v4 préservés ; aucune activation email, requête backend dans le préflight ou modification SQL/Supabase.

Rapports et captures durables : [comparaison](validation/performance-2026-10-09/comparison.json), [mesures avant](validation/performance-2026-10-09/before-report.json), [après](validation/performance-2026-10-09/after-report.json), [session répétée](validation/performance-2026-10-09/stability-report.json), [capture avant](validation/performance-2026-10-09/before-decorationDemo.png), [après](validation/performance-2026-10-09/after-decorationDemo.png).

## Ce qui reste avant la publication normale

Prêt pour validation humaine de la prévisualisation, sous réserve des vérifications publiées consignées dans le suivi. Pas de mesure Safari physique ou d’objectif artificiel de 60 images/s dans le cloud. Le stress reste plus lourd que les parties courantes ; coût de composition/transfert de la texture lors d’une extension ou d’un changement de disposition à vérifier sur iPhone, ainsi que la mémoire du cache. Tests sur des copies personnelles v4 et protocole de fermeture de tous les anciens onglets nécessaires avant intégration. Les comptes v4 ne comprennent pas les sauvegardes v5.

Parcours iPhone (cinq étapes maximum) : exporter/garder la partie de test actuelle ; charger départ puis démonstration et comparer la glissade/pincement ; sélectionner/déplacer/annuler/vendre-annuler un objet ; vérifier sept lapins/récolte/photo/retour ; importer volontairement une copie v4 dans Décorations, recharger, comparer progression/délais et exporter la source avant migration. Ne pas importer ces essais dans les routes v4.
