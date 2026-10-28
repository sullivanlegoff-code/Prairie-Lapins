# Corrections de l’audit général

Branche : `feature/missions-octobre-2`. Les six priorités acceptées sont traitées, sans changement de l’économie, de l’XP ni du format de sauvegarde v20.

- Synchronisation : délai maximal de 20 secondes, interruption de la requête et nouvelle tentative conservant son identifiant. Une réponse tardive ne remplace pas une partie plus récente.
- Récupération : export de la copie de secours depuis le panneau de compte ; réparation confirmée d’un lien de synchronisation illisible, archivé avant réparation. Aucun remplacement automatique de partie locale ou distante.
- Images : message discret et bouton Réessayer après un échec ; seul le chargement des images est relancé, jamais l’achat ou l’accueil du lapin.
- Chargement : dessins Phaser nécessaires à la prairie et au placement courant chargés à la demande. Pièce existante dérivée en 128 × 128, 26 224 octets au lieu de 1 477 804 ; original conservé dans les sources, aucun nouveau dessin. Course interrompue quand son lapin sort du champ pour libérer le verrou global.
- Missions : les 93 objectifs restent accessibles dès le niveau 7 ; récompenses prêtes, objectifs commencés, autres objectifs puis récompenses réclamées. Commandes et en-tête plus compacts sur petit écran.
- Actions courantes : recherche de parents par nom ou espèce, insensible aux accents, filtres d’élément et de disponibilité, sélection et focus conservés. Après récolte, bouton explicite pour replanter la même culture au prix habituel. Ce raccourci reste en mémoire pendant la session ; il n’entraîne aucune dépense automatique.

## Vérifications

- Types TypeScript réussis après reprise finale.
- Synchronisation et récupération : 30 tests ciblés réussis pendant cette mission.
- Images, interface de prairie et vie des lapins : 79 tests distincts réussis pendant cette mission ; dérivation de pièce reproductible contrôlée.
- Interface : contrôles ciblés de l’agent, puis 9 tests réussis lors de la reprise finale (trois nouvelles fonctions et six anciennes attentes obsolètes). Les anciens tests ont été actualisés pour les stocks déjà décidés, Dadi Feu/Métal et l’exception de reproduction de deux communs du même type ; les assertions de paiement sont conservées.
- Construction complète Netlify réussie : jeu, laboratoire isolé, prototype cuisine et vérifications de production/musiques.
- Chromium sur le dossier final : catalogue de 93 missions, première carte visible et aucune largeur débordante en 568 × 320, 844 × 390 et 390 × 844 ; recherche de parent sans accent avec sélection conservée ; récolte sans dépense puis replantation débitée exactement une fois ; image de Boudinet volontairement bloquée après accueil puis reprise réussie, mêmes identifiants de lapins, solde et compteur d’identifiants. Aucune erreur JavaScript. Parties fictives et requêtes externes bloquées. Sélection des bâtiments déclenchée par leur rappel de scène, puis actions par les vrais boutons.
- Le contrôle navigateur a révélé un bouton de reprise derrière les panneaux, corrigé puis revérifié. Les listes de parents gardent une ligne entière sur la capture mobile ; leur test ciblé a été rejoué après cet ajustement.
- Aucune suite exhaustive ni simulation de progression, conformément à la demande de limiter les tests. Aucun essai iPhone ni connexion à un vrai compte pendant cette mission.

L’agent d’interface a atteint sa limite d’utilisation. Le coordinateur a inspecté et terminé ses modifications, relu le diff et effectué les vérifications finales. Aucun push, fusion dans main ou déploiement.

Le dossier `netlify-site/` et son laboratoire portent la révision fonctionnelle `2bc2d4441588343d60eff99d77f77fd738f243f9`. Le commit de documentation suivant ne change pas le jeu. Preuves locales ignorées : `output/validation/audit-final-2026-10-28/`. Prochaine étape : essai iPhone du propriétaire avant sa publication manuelle du dossier complet.
