# Première passe visuelle : essai court sur iPhone

Cette version utilise le format **v4**, avec les six habitats et deux extensions existants. Les captures Chromium de développement ne remplacent pas votre validation sur iPhone Safari.

1. Garder un export de votre partie actuelle. Extraire la nouvelle version dans un dossier distinct. Sous Windows, ouvrir le terminal dans **`prairie-lapins-prototype`**, puis lancer :

   ```bash
   npm ci
   npm run dev -- --host 0.0.0.0 --port 5175 --strictPort
   ```

2. Sur l'iPhone du même Wi-Fi, ouvrir l'adresse **Network** affichée avec `?dev=1`. Si l'ordinateur garde `192.168.1.13`, utiliser le port **5175**. Vérifier **Mode test · partie séparée**. Laisser l'ancienne version sur 5173 intacte.
3. Dans Paramètres, importer volontairement **`docs/test-saves/visual-ready-v4.json`**, uniquement dans la partie de test. Il contient six habitats spécialisés, un universel niveau 3 avec sept espèces, des ressources de test et la première extension déjà réclamée. Ce n'est pas un cadeau à une partie normale.
4. En paysage, glisser pour centrer l'universel plein (troisième colonne, rangée du bas). Toucher chacun des sept lapins, refermer sa fiche, puis recommencer après zoom/pincement et Recentrer. Vérifier les visages distincts, les ailes et le nom dégagé ; aucune sélection après une glissade/pincement.
5. Glisser vers les spécialisés. Reconnaître paille, neige, terre, feu, métal et vol sans ouvrir leur panneau. Vérifier les noms, niveaux et bulles ; ouvrir Boutique et Missions et faire défiler les listes.
6. Améliorer un spécialisé deux fois : occupants conservés, niveau/plafond corrects. Acheter la deuxième extension après avoir annulé une première confirmation, puis déplacer un habitat occupé vers la dernière colonne. Le [guide habitats](habitats-iphone-test.md) détaille les règles.
7. Exporter dans Fichiers, recharger exactement cette adresse et revenir d'arrière-plan. Importer l'export avec confirmation ; annuler une autre tentative pour vérifier que la partie reste intacte.

À rapporter : habitat ou espèce difficile à reconnaître, lapin difficile à toucher (et zoom utilisé), nom/bulle masqué, panneau inconfortable ou erreur de sauvegarde. Garder l'export original avant tout transfert d'une vraie partie. Changer de port ne transfère aucune sauvegarde automatiquement.
