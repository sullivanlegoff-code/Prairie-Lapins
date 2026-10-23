# Comparaison sur iPhone — perspective/caméra toujours à vérifier

> Mise à jour étape 7 : le test humain valide désormais perspective, lapins, zoom, déplacements, pincement, Recentrer, collection de onze espèces, boutique et conditions du carnet. Les nouvelles reproductions, dépenses de cœurs et export/import restent ouverts. Les mentions de caméra non validée plus bas décrivent la situation au moment de rédaction de ce parcours. L'export produit maintenant la **v3** ; v1/v2 restent importables par migration. Le nouveau parcours Missions est dans [missions-iphone-test.md](missions-iphone-test.md).

Le test humain précédent valide la boucle jouable sur Safari iPhone paysage via Windows 11. **Cette correction visuelle reste à tester sur l'appareil. L'export/import iPhone reste non vérifié.**

## Préparer la comparaison

Sur Windows, extraire le projet, puis `npm ci` et `npm run dev -- --host 0.0.0.0`. Conserver le même protocole, l'adresse IP de l'ordinateur et le port qu'au test précédent. Ouvrir cette adresse sur l'iPhone du même réseau. Ne pas effacer les données Safari. Un changement d'origine nécessite un export/import. `--host 127.0.0.1` est réservé aux essais locaux sur ordinateur et ne permet pas l'accès depuis le téléphone.

Pour un essai sans toucher la partie normale, utiliser `?dev=1` : sauvegarde séparée et avances de temps dans Paramètres. Ne pas importer un export de test dans la vraie partie par inadvertance.

## Comparaison courte (5 à 10 minutes)

1. Recharger en paysage, fermer les panneaux et masquer le tutoriel au besoin. Photographier le **cadrage initial**, sans pincer ni déplacer. La rangée de cases doit être horizontale ; les bâtiments restent droits. Plusieurs emplacements sont visibles et les lapins doivent être reconnaissables.
2. Toucher chaque lapin à ce zoom, nourrir l'un d'eux, sélectionner un bâtiment. Vérifier le bon individu malgré son animation. Photographier au **zoom minimal**, puis au **zoom maximal**. Indiquer lequel permet le meilleur compromis. Toucher ⌖ : retour au cadrage intermédiaire sur les trois premières colonnes.
3. Placer une ferme : tester une case libre, une occupée, une verrouillée, puis annuler. Déplacer un bâtiment existant et confirmer : aperçu, case touchée et position finale doivent correspondre exactement. Les coordonnées de la sauvegarde sont inchangées par cette mise à jour.
4. Glisser et pincer ensemble, lever les doigts l'un après l'autre : aucune sélection involontaire. Tester les bords de la prairie ; les marges doivent permettre de toucher tous les bâtiments sans se perdre dans le vide. Faire aussi le geste près d'une limite de caméra.
5. Avant/après extension, vérifier qu'il n'y a aucun recentrage automatique. Explorer les dernières colonnes, sélectionner/déplacer un bâtiment là-bas, puis utiliser ⌖. La vue initiale ne cherche volontairement pas à montrer toute l'extension.
6. Tourner paysage → portrait → paysage. Zoom conservé, déplacement limité seulement par les nouvelles dimensions. Faire un essai de rotation avec un doigt posé : attendre de le lever avant de reprendre ; aucune sélection ni recentrage commandé pendant le geste. Les panneaux ne doivent pas faire sauter la caméra. Vérifier les zones sûres et le bouton ⌖ près des autres boutons.
7. Passer en arrière-plan, revenir, recharger : progression et cases conservées. Le cadrage est une préférence de session, pas un champ sauvegardé ; un rechargement repart au cadrage initial.

Si la prairie semble encore penchée, demander **une capture Safari complète en paysage**, panneaux fermés, juste après ⌖, avec les deux bords du terrain visibles si possible ; puis une capture en placement montrant la grille. Joindre modèle d'iPhone, version iOS, zoom minimal/intermédiaire/maximal, barres Safari ouvertes ou réduites, et entourer le bord ou bâtiment qui paraît incliné. Une troisième capture après pincement aide à distinguer projection et cadrage. Ces captures ne sont pas encore fournies dans cette livraison.

## Export/import iPhone — parcours encore à vérifier

1. Paramètres → noter pattes, herbes, nombre de lapins et date de sauvegarde. Toucher **Exporter ma partie**.
2. Si le partage iOS apparaît, choisir **Enregistrer dans Fichiers** et un dossier repérable. Sinon, vérifier les téléchargements Safari. Si proposé après un échec de partage, toucher **Télécharger le JSON**. Vérifier réellement l'existence du fichier `.json` daté dans Fichiers. Une fermeture du partage n'est pas une réussite.
3. Revenir au jeu, fermer/rouvrir exactement la même adresse. Vérifier la restauration. Les revenus en attente/délais peuvent avancer ; ce n'est pas une perte de cohérence.
4. Paramètres → **Importer une partie** → sélectionner le JSON via Fichiers. Vérifier ressources (cœurs compris), lapins et découvertes dans le résumé. Le jeu exporte désormais en version 2 et accepte aussi les imports version 1 via migration. **Annuler** : progression actuelle inchangée.
5. Faire une action repérable et en exporter aussi l'état si nécessaire. Sélectionner à nouveau le premier fichier, utiliser **Exporter la partie actuelle d'abord**, puis **Confirmer le remplacement**. Vérifier le retour aux ressources du fichier, avec les délais avancés normalement. Recharger pour vérifier que l'import a été sauvegardé.
6. Tester un faux JSON et une copie dont `version` vaut 999 (préparés sur ordinateur), puis un fichier de plus de 1 000 000 octets. Le refus doit être lisible et préserver la partie. Ne pas modifier l'unique export de secours.
7. Noter appareil/iOS, HTTP local ou HTTPS, chemin partage/téléchargement et résultat de chaque étape. Sur HTTP local, le partage de fichiers peut être absent : le téléchargement doit être vérifié séparément. Le futur site HTTPS demandera un nouvel essai ; il n'est pas déployé ici.

La sauvegarde locale n'est pas permanente, ni synchronisée entre appareils. Un passage du serveur de développement au domaine HTTPS nécessite un export/import. Garder un seul onglet actif.

Le parcours dédié aux cœurs se trouve dans [hearts-iphone-test.md](hearts-iphone-test.md). Les réglages de caméra de l’étape 4 sont conservés aux étapes 5 et 6. Le palier des onze espèces dispose de son parcours dans [collection-iphone-test.md](collection-iphone-test.md).
