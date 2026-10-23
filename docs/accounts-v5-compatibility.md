# Comptes en pause — future prise en charge des sauvegardes v5

La préparation de stabilité vérifie la migration locale v4 → v5 et produit un artefact futur à quatre routes. Les comptes sont toujours construits depuis `3e70d9e` en v4 et doivent refuser v5. Le préflight construit seulement les sources figées, sans appel au backend, email ou modification Supabase. [Procédure locale et limites](migration-v5.md). La migration du serveur/client comptes reste un chantier distinct.

La refonte de l’île du 9 octobre 2026 est une présentation locale, sans nouveau champ de sauvegarde ni migration. Les sources et le build v4 des comptes restent figés ; aucun SQL, email ou réglage Supabase modifié. [Détails de l’île](island.md).

La prévisualisation Décorations est locale et séparée. La branche `feature/private-cloud-saves`, sa PR en brouillon et son build publié v4 sont préservés. Aucun SQL Supabase, email, template, compte ou migration hébergée modifié dans le chantier Décorations.

La confirmation d’exécution SQL avait été reçue auparavant ; la connexion email et la synchronisation authentifiée restent non validées et en pause. Le quota SMTP intégré de 2 emails/heure n’est pas un préalable au chantier d’aménagement.

Le lecteur v4 des comptes **ne peut pas accepter un fichier v5**. Conserver le JSON v5 entier et refuser proprement un serveur/client incompatible ; ne jamais changer seulement son numéro en 4, supprimer les objets, ni migrer automatiquement une sauvegarde normale depuis une prévisualisation.

Avant une future intégration :

- Porter types, commandes, validateur strict et migrations v1–v4 → v5 dans le client des comptes. Vérifier identifiants, emplacements et collisions avec les mêmes règles que le jeu local.
- Adapter explicitement les enveloppes versionnées, empreintes de comparaison, import/export, cache par propriétaire, file d’attente et checkpoints à v5. Une référence déplacée et une décoration posée/rangée doivent compter comme changements ; aucune exclusion des objets lors d’un calcul d’empreinte.
- Préparer, relire et appliquer **dans un chantier distinct** une migration serveur pour les versions de payload admises, le schéma/validateur et les RPC. Conserver ownership/RLS, CAS, idempotence, historique/rétention et refus des écritures obsolètes. Ne pas présumer qu’un stockage JSONB suffit si les gardes RPC imposent v4.
- Migrer une sauvegarde v4 en v5 seulement avec secours/checkpoint récupérable et transition coordonnée des clients et du backend. Protéger les clients v4 encore ouverts contre l’écrasement d’une progression v5 ; prévoir leur message de mise à jour et le retour arrière.
- Réexécuter les tests PostgreSQL de droits, isolation, CAS, reprise, checkpoints, historique et migration ; vérifier avec deux comptes de test une synchronisation v5 réellement authentifiée et la conservation de tous les objets après conflits et reconnexions.
- Maintenir le laboratoire et toutes les prévisualisations avec services en ligne désactivés par défaut. Aucun partage de session, cache, horloge ou sauvegarde avec la partie normale.

L’intégration en production nécessite également le retour visuel Safari du joueur, les vérifications de migration sur copies représentatives et un plan de récupération. Le mode Décorations reste une prévisualisation en attendant cette décision.

## Reprise de finition — 9 octobre 2026

Aucun fichier de la branche comptes, SQL ou réglage Supabase modifié. Le gateway v4 refuse explicitement `format !== 4` ; il ne reçoit pas d’états v5 pendant ce chantier. Les scénarios ajoutés et les nouvelles commandes visuelles n’altèrent pas le format v5 ni les prix. Avant intégration, la migration coordonnée décrite ci-dessus et les essais de synchronisation authentifiée restent nécessaires. La finition ne valide ni la connexion email ni le backend hébergé.

## Sélection et vente — 9 octobre 2026

La commande locale `sellDecoration` conserve le format v5 et doit rejoindre le futur portage des commandes. Une suppression d’exemplaire et le crédit de pattes correspondant doivent rester un seul changement de payload/checkpoint ; aucun remboursement en cœurs. Ne pas rejouer une intention de vente lors d’une reprise réseau ou d’un conflit : vérifier ownership, identifiant et version/CAS, et conserver l’idempotence de la transaction. Aucun portage distant, SQL ou réglage Supabase réalisé ici ; comptes/email toujours en pause.


Le catalogue de la preview v5 contient désormais les identifiants `bouee`, `geant`, `magicien`, `dragon` et les raretés épique/légendaire. Une future adaptation des comptes devra reconnaître ces identifiants et valider les réservations ordinaires seules. Aucun changement du lecteur de comptes v4 figé, du backend ou de Supabase n’est réalisé ici ; il refuse v5 et ne doit pas recevoir ces exports.
