# Reproduction manuelle v8

Révision applicative : `fc882e3ee4654d5b23a4f3e14318d9ff1147e9b8` · [PR nº 10](https://github.com/sullivanlegoff-code/Project-L/pull/10).

Cette livraison repart de `production` (`64173ef`, documentation de la livraison applicative `c37966c`). Les six illustrations, leur registre et leurs zones alpha, la caméra validée, les empreintes fines, les prix et les règles de production sont conservés. Supabase et Comptes restent en pause. Les prévisualisations Comptes v4 et Décorations v5 restent construites depuis leurs révisions figées.

- Lancement gratuit : aucune patte ni aucun cœur requis. Le tirage, les probabilités et les réservations de découverte conservent leur calcul commun.
- Les parents apparaissent au nid. Leur `enclosureId` ne change pas : places réservées et revenus restent dans leurs habitats. Déplacer un habitat ou le nid reste possible ; déplacer ou confier un parent est refusé jusqu’au transfert.
- Après 20 minutes, le bouton « Envoyer dans la nurserie » réalise une transaction sauvegardée : naissance existante vers la nurserie libre, croissance à l’instant du clic, retour des parents et libération du nid. Une écriture impossible conserve l’attente au nid. L’accélération payante termine uniquement le délai.
- Nouvelle partie : enclos (16,16), nid (12,12), nurserie (20,12), deux lapins, 300 pattes, 10 herbes et 12 cœurs. Nid et nurserie ne s’achètent plus ; leurs missions sont immédiatement réclamables une fois.
- Migration v7 → v8 : aucune conversion des coordonnées. Équipements possédés, identités, occupants, ressources, travaux et résultats restent conservés. Un équipement manquant est offert à la première place libre ; sinon Aménagement permet un placement gratuit après libération de terrain. Aucun rangement ni déplacement automatique.
- Résultats anciens terminés : un parent déplacé conserve son habitat enregistré ; un parent confié reste absent. L’interface explique ce cas et ne recrée aucun individu. Un lapereau déjà en nurserie conserve exactement son résultat et ses dates. Copie v7 brute conservée avant migration sous `prairie-lapins.backup.before-v8`, séparée au laboratoire.

Le scénario **Nid — parents et transfert manuel** démarre réellement une reproduction à portefeuille nul, avec deux habitats d’origine et une nurserie occupée. Les outils de temps permettent de vérifier l’attente, l’accueil de l’occupant puis le transfert manuel.

## Captures

Même scène et mêmes illustrations : [avant reproduction](validation/manual-breeding/parents-before.png), [parents au nid](validation/manual-breeding/parents-at-nest.png), [parents revenus](validation/manual-breeding/parents-returned.png). [Nurserie occupée](validation/manual-breeding/manual-nursery-blocked.png).

## Vérifications

TypeScript, tests de simulation/contrôleur/migrations/UI, builds normal et laboratoire. Les parcours Chromium vérifient le lancement gratuit, le verrouillage après délai, la nurserie occupée, l’accélération, le rechargement, la double pression, les sept occupants après retour, les textures et l’absence de doublons. Les suites existantes vérifient aussi les illustrations aux trois zooms, le placement fin, les collisions, les gestes, la sélection des décorations, le cadrage, les exports/imports et l’isolation des routes. 645 tests dans 21 fichiers, TypeScript et les deux builds passent. Neuf suites sur sources et neuf suites sur builds (33 contrôles) sont réussies dans [la CI](validation/manual-breeding/ci.json). La [publication](validation/manual-breeding/publication.json) est vérifiée : quatre routes HTTP 200 aux révisions prévues, neuf suites et 33 contrôles publics réussis, sans erreur. [Parcours de reproduction publié](validation/manual-breeding/published-browser.json). [Identité des illustrations et de la caméra](validation/manual-breeding/preserved-art-camera.json).

Limite : Chromium avec gestes tactiles simulés ; aucun iPhone physique accessible pendant cette livraison.

## Essai iPhone

1. Dans le jeu normal, nourrir les deux parents jusqu’à affection 2 puis lancer gratuitement au nid. Vérifier leurs illustrations au nid et « Au nid » dans leur fiche.
2. Terminer le délai en attendant ou avec des cœurs : les parents attendent toujours au nid. Toucher « Envoyer dans la nurserie » ; ils reviennent et la croissance commence.
3. Au laboratoire, charger « Nid — parents et transfert manuel », avancer le temps et constater le blocage. Accueillir l’occupant de la nurserie : le transfert attend encore votre bouton. Recharger pour vérifier la conservation.
