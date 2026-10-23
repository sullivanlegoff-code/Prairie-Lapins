# Fondations techniques v6

Le format de sauvegarde reste v6. Aucun changement de contenu, d’équilibrage, de dessin, de migration ou de clé de stockage. Les quinze espèces, neuf parcelles et douze objets extérieurs restent disponibles. Les comptes et Supabase restent en pause.

## Responsabilités et invariants

`config/` décrit les catalogues et paramètres ; les visuels restent associés aux identifiants stables. `simulation/` applique les règles sans Phaser, DOM, stockage ni horloge implicite dans les tests. `act` travaille sur une copie : un refus renvoie l’entrée intacte. `advance` gère séparément le temps monotone, les plafonds de revenus et le transfert du résultat déjà tiré vers la nurserie. Le contrôleur avance le temps avant une commande ; cette évolution indépendante peut donc survivre à son refus.

`GameController` possède l’état mutable et fournit des copies aux abonnés. L’interface et Phaser présentent cet état et émettent des commandes. Les devis réutilisent les conditions de la simulation ; celle-ci revalide coûts, disponibilités, cibles et clés de travaux. Une génération de session invalide les confirmations après tout import ou redémarrage réussi, même effectué directement par le contrôleur. Un remplacement refusé conserve la génération et la partie.

`persistence/json.ts` valide les entrées et les sauvegardes : ressources et horodatages sûrs, identifiants uniques, références valides, affection 1–20, habitats compatibles et non surchargés, centre acquis, bâtiments et empreintes décoratives sur terrain acquis sans collision, travaux et réservations de découverte cohérents, missions et récompenses cohérentes. Il n’y a pas de validation complète à chaque image. Les traces de tests utilisent cette frontière pour vérifier chaque état produit.

## Corrections ciblées

- Crédit commun avec contrôle des limites numériques pour revenus, récoltes, cadeaux, récompenses et reventes. Un dépassement conserve le travail ou le revenu disponible, sans crédit partiel.
- Allocation d’identifiant et échéances de nouveaux travaux contrôlées avant paiement et tirage. Le tirage reste unique au lancement ; les réservations, résultats et délais existants sont conservés.
- Détection d’un onglet obsolète avant une commande et par événement `storage`. Les commandes sont bloquées, l’état en mémoire reste exportable, aucun résultat aléatoire n’est tiré. Le listener est libéré à la fermeture du contrôleur.
- Notifications filtrées par clé et espace de stockage ; le laboratoire transmet uniquement ses clés préfixées.
- Confirmations fermées après remplacement et destruction de l’interface. Le cache anti-double pression conserve seulement sa fenêtre utile de 350 ms.
- Un nouveau départ réussi efface l’ancien compteur du message de conversion des objets intérieurs.

## Stockage et limites réelles

Les erreurs de lecture/écriture restent visibles. Un échec d’écriture ordinaire conserve les actions en mémoire et permet un export ; il ne garantit pas leur persistance après fermeture. Une vente persiste le retrait et le crédit ensemble avant de remplacer la partie en mémoire ; un échec conserve objet et pattes. Import et nouveau départ écrivent avant de remplacer l’état.

**La comparaison lecture puis écriture de `localStorage` n’est pas une transaction entre onglets.** Deux onglets peuvent lire le même ancien contenu avant leurs écritures concurrentes ; les événements sont asynchrones et ne constituent pas un verrou. Les contrôles ajoutés arrêtent une session après un changement observé, mais ne promettent pas une exclusion mutuelle. Utiliser un seul onglet par partie ; en cas de conflit, exporter la copie en mémoire puis recharger. Aucun effacement global du stockage, aucune synchronisation automatique et aucun transfert normal/laboratoire.

## Vérifications reproductibles

`npm test` inclut les régressions et trois traces de 180 commandes avec graines 17, 104729 et 20261009 : achats, nourriture, reproduction, accélération, agrandissement, pose/rangement/vente, récompenses et refus. Après chaque étape : intégrité de l’entrée, validation v6, aller-retour de sauvegarde, nombre de tirages et équivalence d’une avance longue avec deux avances sans action. Une erreur imprime la graine et la trace. Ces tests utilisent une horloge injectée, sans attente réelle.

`docs/foundations-browser-check.cjs <url> [révision]` contrôle les événements réels entre deux onglets, le refus d’achat depuis l’onglet obsolète, son export, les ouvertures répétées de panneaux, la rotation du viewport, les événements de cycle de vie et l’isolation du laboratoire. La CI exécute également les parcours existants de migration, gestes, production et laboratoire. Le cache graphique du terrain est conservé ; aucun changement de rendu ne justifie une nouvelle campagne de mesures.

Ces essais Chromium ne remplacent pas un essai Safari sur iPhone. Parcours manuel :

1. Acheter/poser une décoration, la déplacer, annuler puis ranger/vendre avec confirmation ; recharger et vérifier l’inventaire et les pattes.
2. Lancer une reproduction, quitter Safari, revenir et tourner l’iPhone ; vérifier les délais, les panneaux et l’accueil sans double récompense.
3. Ouvrir deux onglets du même jeu, agir dans le second ; vérifier l’avertissement dans le premier, exporter sa copie puis le recharger. Une action au laboratoire doit laisser la partie normale intacte.
