# Contenus de vie et souvenirs — 28 octobre 2026

Livraison fonctionnelle : `60640ec`, fondation `c60a336`, branche `feature/missions-octobre-2`.

- Amitiés après six heures partagées dans un habitat, hors nid/voyage. Complice consultable dans la fiche, préféré pour les bisous et approche de sa sieste. Deux dormeurs maximum conservés.
- Cinq objets interactifs existants : foin (salto), peluche et chaussons (câlin), petites et grandes bibliothèques (pause). Bouton Appeler un lapin, occasions spontanées après 45 secondes puis toutes les 90 secondes ; approche limitée à l’habitat, interruption pour Dadi et les actions du joueur.
- Album accessible depuis Collection : 80 derniers moments datés, naissances, amitiés, voyages, découvertes et fêtes. Les noms au moment du souvenir sont conservés. Photo : mode photo, Prendre la photo, Enregistrer ou ouvrir la photo ; fichier PNG sur l’appareil, pas dans la sauvegarde cloud.
- Neuf destinations existantes, trois souvenirs textuels à découvrir par destination au fil des retours ; consultation depuis l’agence ou l’album.
- Six surprises utilisant les dessins approuvés, rotation toutes les quatre heures, observation dans la prairie ou dans Rendez-vous. Chaque découverte reste acquise, sans récompense monétaire.
- Quatre collections des décorations existantes : lecture, goûter, vacances, fête. Filtres, compteur possédé, aperçus. Déplacement gratuit de 64 objets maximum ensemble, validation atomique avant confirmation ; aperçu relatif des objets et coordonnées, pas une prévisualisation complète du terrain.
- Trois fêtes reviennent tous les trois mois : récoltes, retrouvailles, jardin. Progression conservée, carte textuelle d’album obtenue une seule fois. Aucun achat automatique, revenu ou gain d’XP ajouté.

Les nouveaux contenus réutilisent les dessins approuvés. Aucun nouveau dessin de tunnel, balle, papillon ou paysage n’a été intégré. Les identifiants d’anciens objets retirés restent retirés.

## Sauvegardes et vérifications

Format v21, migration automatique v20 et chaîne v16–19 conservée. Supabase accepte déjà ce format ; aucune migration SQL à appliquer. Les anciens clients reçoivent le statut de version plus récente. Les photos sont locales, les souvenirs font partie de la sauvegarde.

Types et construction Netlify complète réussis (jeu, laboratoire, cuisine et vérifications de production). Tests ciblés : 14 activités/album/missions ; 20 scène/vie/photo ; dernier passage de 52 sauvegarde/synchronisation/migration/amitiés réussi. Les comptes peuvent se recouper entre passages. Aucune suite complète ni simulation de progression.

Deux tests historiques de `economy-v17.test.ts` restent obsolètes : anciens plafonds d’habitat et anciens revenus. Ils ont échoué lors du contrôle de migration étendu ; les tests de migration de cette suite ont réussi. Aucune modification économique effectuée pour les satisfaire. Les assertions de version courante des autres tests ont été actualisées en v21 ; leurs autres assertions restent intactes.

Chromium sur parties fictives : album et souvenirs Paris, observation et sauvegarde d’une découverte, déclenchement d’interaction sur une botte de foin, véritable export PNG, capture des missions en 568 × 320. Aucune erreur JavaScript. Captures relues, preuves locales dans `output/validation/cozy/`. Les tests d’animation couvrent les limites de mouvement ; la capture seule n’atteste pas un salto complet. Aucun essai iPhone ni compte Supabase réel.

Le dossier `netlify-site/` contient la révision fonctionnelle `60640ec`. Le commit de documentation suivant ne modifie pas l’application. Rien fusionné, poussé ou publié. Les agents interrompus par quota ont laissé leurs fichiers, inspectés avant reprise ; le coordinateur a terminé l’intégration et les vérifications.
