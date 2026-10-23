# Test court sur iPhone — habitats et aménagement

Cette étape n'a pas encore été testée sur un iPhone. La caméra et l'ergonomie avaient été validées par l'humain dans une livraison antérieure ; leurs paramètres sont conservés. Les missions, nouvelles reproductions, dépenses de cœurs et export/import restent à valider.

## Démarrer sous Windows

Extraire le ZIP, ouvrir un terminal dans `prairie-lapins-prototype`, puis :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Garder le terminal ouvert. Sur l'iPhone du même Wi-Fi, ouvrir l'adresse **Network** avec `?dev=1`. Vérifier le badge **Mode test · partie séparée**. Utiliser Safari en paysage. L'adresse `localhost` de l'ordinateur ne fonctionne pas sur l'iPhone.

## Préparation facultative

Dans Paramètres, exporter d'abord la partie de test. Transférer `docs/test-saves/habitats-ready-v4.json` sur l'iPhone dans Fichiers, puis l'importer et confirmer uniquement dans le mode test. Ce scénario fournit explicitement des ressources de test, les six habitats, neuf espèces dont les trois nouveaux rares, des parents d'affection 4, la première extension et sa mission déjà réclamée. La deuxième extension reste à acheter. Rien de cela n'est attribué automatiquement à une partie normale. L'ancienne date du scénario provoquera l'avancement normal lors de l'import.

Sans importer : récolter dans les enclos et utiliser les avances de l'horloge disponibles dans Paramètres pour financer progressivement les essais. Le fichier de scénario est une aide, pas un prérequis du jeu.

## Parcours de comparaison

1. **Boutique** : repérer Enclos universel, Habitats spécialisés, Production et reproduction. Vérifier les six noms/types, achat 200 pattes, trois places et stockage 900. Commencer un placement sur une case libre, puis annuler : aucune monnaie retirée. Une case occupée reste refusée.
2. **Compatibilités** : sélectionner Perroquet → Changer d'habitat. Feu, vol et universel sont compatibles ; neige, terre, métal et paille refusent. Tester aussi Feu Glacé (feu/neige) et Lunettes (métal/paille). Une destination pleine indique « Habitat plein ». Les listes affichent type et effectif/capacité. Le transfert n'achète aucun bâtiment.
3. **Niveaux** : ouvrir un habitat. Vérifier nom/type/niveau, occupants, stockage/plafond et revenu horaire. Ouvrir Améliorer, annuler, puis recommencer et confirmer. Vérifier 3 → 5 → 7 places, prix et plafonds du tableau de règles ; double pression sur Confirmer ne paie qu'une fois. Au niveau 3, aucune amélioration supplémentaire.
4. **Stockage** : avancer suffisamment l'horloge de test pour atteindre le plafond. Améliorer sans récolter : le stock reste égal à l'ancien plafond. Seul le temps suivant peut remplir le supplément. Ajouter des lapins jusqu'à sept pour vérifier la lisibilité des nouvelles rangées et la sélection ; le panneau donne aussi accès à chaque occupant.
5. **Deuxième extension** : glisser vers la droite jusqu'aux herbes hautes. Prix 1 000 pattes. Annuler une confirmation, puis acheter. Vérifier le terrain 9 × 2 et déplacer un habitat occupé jusqu'à la dernière colonne : occupants, niveau et stock doivent rester présents. La mission de la première extension reste réclamée.
6. **Caméra** : comparer glissade, pincement, sélection, Recentrer, paysage/portrait et retour paysage. Le zoom normal ne cherche pas à montrer les dix-huit cases. Aucun recentrage automatique à l'achat ou à l'amélioration. Vérifier particulièrement les nouveaux habitats pleins de sept lapins.
7. **Complément de cœurs** : pour provoquer le manque sans modifier la partie normale, exporter la partie de test, copier le JSON sur Windows et changer seulement `pattes` en `30`, puis réimporter cette copie. Achat spécialisé : 30 pattes + 7 cœurs ; amélioration spécialisée vers niveau 2 : 30 pattes + 11 cœurs. Vérifier détail, annulation, confirmation unique et refus pour emplacement/type/capacité avant paiement. Répéter sur la deuxième extension avant de l'acheter (30 pattes + 39 cœurs).
8. **Reprise** : passer Safari en arrière-plan, revenir, recharger. Vérifier habitats, niveaux, extension, ressources et récompenses réclamées. Faire également une reproduction avec des parents logés dans deux habitats compatibles : ils continuent à produire ; résultat caché jusqu'à fin de croissance et accueil uniquement dans un habitat compatible disposant d'une place.

## Export/import — toujours à vérifier sur iPhone

Paramètres → Exporter ma partie. Enregistrer le JSON daté dans Fichiers via le partage proposé, ou le téléchargement si le partage n'est pas disponible. Vérifier qu'un fichier est réellement présent. Faire une petite modification dans la partie, puis Importer une partie → choisir le fichier → examiner le résumé → Annuler : progression inchangée. Recommencer puis confirmer : retour à l'état exporté, avancé normalement jusqu'à l'heure actuelle, sans fusion des ressources. Recharger et vérifier les niveaux/types conservés. Un fichier volontairement invalide doit être refusé sans remplacer la partie.

Le fichier exporté est v4. Les fichiers v1, v2 et v3 restent importables via migration. Un ancien client ne reconnaît pas v4 : conserver un export antérieur si l'on veut revenir à une ancienne livraison.

Les sauvegardes sont liées à **l'origine du site (protocole, adresse et port)**. Changer d'adresse Network, de domaine ou passer au futur HTTPS nécessite un export/import. Le stockage local peut être effacé par le navigateur ; il n'est pas permanent.

## Retour attendu

Préciser modèle d'iPhone, version iOS, orientation et étape concernée. En cas de problème visuel : capture de la prairie avec un habitat à sept occupants, au zoom normal puis rapproché, et capture de son panneau. Ne pas confondre tests automatiques et validation humaine de ce parcours.
