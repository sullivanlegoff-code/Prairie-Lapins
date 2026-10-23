# Tester les onze espèces sur iPhone — validation humaine encore ouverte

> Mise à jour étape 7 : le test humain valide désormais perspective, lapins, zoom, déplacements, pincement, Recentrer, collection de onze espèces, boutique et conditions du carnet. Les nouvelles reproductions, dépenses de cœurs et export/import restent ouverts. Les mentions de caméra non validée plus bas décrivent la situation au moment de rédaction de ce parcours. L'export produit maintenant la **v3** ; v1/v2 restent importables par migration. Le nouveau parcours Missions est dans [missions-iphone-test.md](missions-iphone-test.md).

Cette procédure n'a pas été exécutée sur iPhone par l'assistant. Les cœurs, la caméra de l'étape 4 et l'export/import restent eux aussi à valider sur l'appareil. L'étape actuelle conserve ces réglages.

## Lancer depuis Windows

Extraire l'archive, ouvrir un terminal dans `prairie-lapins-prototype`, puis :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Garder le terminal ouvert. Sur l'iPhone du même réseau, ouvrir dans Safari l'adresse **Network** affichée par Vite, avec **`?dev=1`**. Vérifier le badge **Mode test · partie séparée**. `localhost` sur l'iPhone ne désigne pas l'ordinateur. Conserver l'adresse et le port pour retrouver la même sauvegarde.

## Scénario préparé, facultatif

Pour éviter de reconstruire toute la prairie, le dossier `docs/test-saves/` contient **`collection-ready-v2.json`**. Transférer ce fichier depuis l'ordinateur vers l'app Fichiers de l'iPhone, par exemple avec votre méthode habituelle de partage. Dans le jeu **en mode test**, Paramètres → Importer une partie → sélectionner ce fichier, vérifier le résumé, puis confirmer le remplacement. Exporter au préalable la partie de test si elle doit être conservée.

Ce fichier est un **scénario technique**, pas une modification des règles de départ : ressources préparées, six communs d'affection 2, quatre enclos, ferme, nid, nurserie, extension et neuf échecs admissibles simulés. Il conserve 12 cœurs. Rien n'est attribué automatiquement par `?dev=1` ni à une partie normale. L'horloge et les délais sont ceux du jeu ; après une longue absence, une seule récompense de cœurs peut être disponible. Ne pas réclamer ce cadeau pendant les exemples de coûts ci-dessous.

Le fichier contient 3 580 pattes et 188 herbes avant toute récolte, six découvertes sur onze et aucun résultat en cours. Les revenus d'enclos et l'heure simulée avancent normalement à l'import. Si l'import iPhone pose problème, conserver le message exact : ce parcours reste à vérifier. On peut aussi construire et acheter les six communs en mode test, en avançant puis récoltant les revenus ; le scénario n'est pas obligatoire.

## Parcours court (10 à 15 minutes)

1. **Catalogue et boutique.** Collection : 6/11 après import du scénario ; les cinq recettes sont encore des silhouettes. Boutique → Lapins : Paille, Neige, Terre, Feu, Bélier Gris et Volant, chacun à 80 pattes ; aucune espèce rare achetable. Acheter un doublon dans un enclos libre puis vérifier sa sélection, sa fiche et son affection 1. Le compteur de découvertes reste à 6/11.
2. **Affection insuffisante.** Nid → Feu et Neige d'affection 2. Les probabilités affichent 50 % / 50 %, sans Feu Glacé ; la paire ne fait pas avancer la garantie, malgré le compteur à 9. Ne pas lancer pour cette vérification. Collection → Carnet : trouver la recette feu + neige, silhouette, affection 4 et croissance 30 min. Les deux parents à nourrir sont indiqués ; « Préparer cette paire » est désactivé.
3. **Préparer une découverte.** Depuis les liens du carnet, nourrir les deux parents deux fois chacun, jusqu'à 4. Chaque parent consomme 4 puis 6 herbes (20 au total). Espacer les pressions pour ne pas déclencher la protection contre la double pression. Revenir au carnet : la recette est admissible. Avec les neuf échecs du scénario, **100 % pour la recette feu + neige**, et non 20 % : la garantie est active. « Préparer cette paire au nid » choisit les parents sans rien dépenser. Lancer coûte 20 pattes et remet le compteur à zéro en réservant la découverte.
4. **Secret et croissance.** Recharger immédiatement : même reproduction en cours, aucune nouvelle dotation de cœurs ni révélation de l'espèce. Paramètres → +20 min : transfert en nurserie. La croissance d'un rare dure 30 min. Elle n'est pas terminée après seulement +20 min supplémentaires. Terminer par deux avances de +5 min, ou payer explicitement **jusqu'à 6 cœurs** juste après le transfert (prix décroissant selon le temps restant). Le résultat est révélé seulement à la fin ; l'accueil reste manuel. Choisir un enclos libre : fenêtre Lapin Feu Glacé, compteur 7/11.
5. **Probabilités ordinaires.** Ouvrir à nouveau le nid avec Feu et Neige d'affection 4 : Feu 40 %, Neige 40 %, Feu Glacé 20 %. Il n'y a plus de garantie pour cette recette déjà découverte. Inverser A et B : mêmes chances. Le carnet distingue maintenant ce résultat possible d'un résultat garanti.
6. **Les deux autres recettes.** Pour un essai déterministe indépendant, réimporter volontairement le scénario de test après export éventuel. Nourrir Paille + Bélier Gris à 4 pour Lunettes, ou Volant + Feu à 4 pour Perroquet. Le même parcours mène à une garantie de la recette choisie, croissance 30 min puis accueil manuel. Vérifier lunettes, oreilles tombantes/détail métallique, ailes, plumage et contraste orange/bleu. Les premiers essais de rendu et de toucher sur ces variantes sont encore à faire.
7. **Persistance et défilement.** Avec un nouveau rare accueilli, exporter, recharger puis importer l'export : mêmes espèces, même solde de cœurs, résultat en attente conservé s'il y en a un. Annuler d'abord un import pour vérifier l'absence de remplacement. Faire défiler la collection et les paires du carnet : aucune glissade de caméra derrière le panneau. Vérifier les onze entrées et les noms après découverte.

Pour vérifier aussi les refus : remplir un enclos puis y tenter un achat, préparer un complément sans assez de cœurs, ou laisser la nurserie occupée pendant une autre reproduction. Aucune capacité n'est contournée ; un résultat attend au nid sans être retiré au hasard. Les délais ordinaires restent 20 min de reproduction, 5 min pour un commun et 15 min pour Brumelin/Mottelin.

## Points restant à rapporter

- Lisibilité et défilement des onze entrées, cinq recettes et listes de parents en paysage.
- Reconnaissance et sélection des nouvelles variantes au cadrage actuel, sans devoir zoomer au maximum.
- Probabilités, besoin d'affection, garantie et découverte compréhensibles ; aucune révélation avant fin de croissance.
- Cœurs : compteur, cadeau, confirmations, annulations et coûts réels ; voir [hearts-iphone-test.md](hearts-iphone-test.md).
- Perspective, cadrage, pincement, recentrage, extension et changement d'orientation : [manual-test.md](manual-test.md).
- Export/import iPhone : vérifier réellement le JSON dans Fichiers ou Téléchargements, puis son import annulé et confirmé ; le parcours détaillé reste dans ce même guide. Les tests automatisés ne valident pas le partage ou le sélecteur de fichiers iOS.

Indiquer modèle d'iPhone, version iOS, adresse locale utilisée et résultats. Joindre une capture du panneau ou de la prairie en cas de problème. Aucun déploiement HTTPS ni PWA n'est réalisé ici.

**Les sauvegardes sont liées au protocole, domaine et port.** Changer d'adresse ou passer du serveur Windows au futur site HTTPS nécessite un export/import. La sauvegarde locale n'est pas permanente. Ne pas importer involontairement le scénario technique dans la partie normale.
