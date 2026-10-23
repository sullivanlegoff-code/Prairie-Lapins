> Bilan historique v5. La livraison actuelle v6 utilise neuf parcelles et douze objets extérieurs : voir [règles et migration v6](land-v6.md). Les commandes intérieures et les deux extensions en bandes décrites ici ont été remplacées.

# Préparer la migration v4 → v5 et récupérer une partie

La route normale et le laboratoire publiés sont encore en v4. Les essais ci-dessous utilisent **des copies** dans la prévisualisation Décorations, jamais les clés de la partie réelle. Les comptes restent sur le client v4 figé `3e70d9e`, sans modification du backend ou de Supabase : ils refusent les exports v5 et ne doivent pas les recevoir.

## Vérifications sur copies

Neuf [sources v4 de test](test-saves/migration-v4/) sont produites par les commandes de simulation et validées dans `tests/migration-readiness.test.ts` : nouvelle partie, deux extensions, habitats niveau 3/sept occupants, production en cours, reproduction avec résultat garanti réservé, nurserie occupée et résultat au nid, missions réclamées/restantes, cœurs dépensés et cadeau en attente, revenus fractionnaires. Elles contiennent volontairement des ressources préparées ; ne pas les importer dans une vraie partie normale.

À horloge identique, le décodeur conserve **tous** les champs v4, remplace uniquement `version` par 5 et ajoute `decorations: []`. Aucun cœur, récompense, tirage ou découverte attribué. Identifiants, réservation des naissances, probabilités déjà résolues, délais et numérateurs de revenus restent identiques. L’ouverture par le contrôleur est comparée séparément à `advance(source, now)` : un changement après absence appartient à la simulation normale, pas à la migration. Au rechargement, aucune seconde copie/migration v4 n’est écrite. Les anciens tests v1/v2/v3 restent exécutés.

La sauvegarde candidate est validée avant écriture. Le contrôleur conserve la chaîne brute source dans le secours `prairie-lapins.backup.before-v5` (préfixée `prairie-lapins.preview.decorations.` dans cette preview), avant de remplacer la clé active. Si cette copie ou l’écriture finale échoue, la clé active reste exactement v4 et une erreur visible signale l’échec. La source reste également en mémoire : **Paramètres → Exporter la source avant migration** l’exporte sans avancer le temps, convertir le JSON ou écrire. Le nom contient « source-avant-migration », pas une fausse indication v5. Si le navigateur refuse aussi le téléchargement, le bouton de repli permet de réessayer. Conserver l’onglet ouvert jusqu’à vérification du fichier dans Fichiers.

L’export normal reste le meilleur moyen de préserver les changements récents en mémoire. Après une migration réussie et un rechargement, le bouton de source peut retrouver la copie locale protégée. Il ne restaure rien automatiquement. Une copie de migration suivante/import volontaire peut remplacer ce secours : conserver les fichiers exportés hors du navigateur, avec date et version.

## Procédure de récupération

1. Arrêter les actions ; garder l’onglet affichant une erreur ouvert. Exporter la partie actuelle et, si disponible, la source avant migration. Vérifier le contenu/version des fichiers et garder les originaux.
2. Une erreur d’écriture/copie : ne pas effacer le stockage. Libérer de l’espace ou rétablir les permissions, puis Réessayer. Les tests vérifient les deux points d’échec et la conservation de la source. Un conflit d’onglet nécessite d’abord l’export de la progression en mémoire puis la fermeture des autres sessions.
3. **Conserver la v5** : privilégier un client v5 corrigé. Importer un export v5 complet dans un client compatible, après export de l’état actif et confirmation. Identifiants et décorations doivent rester validés ; aucun changement de numéro en 4.
4. **Restaurer une ancienne v4** : utiliser la copie v4 d’avant migration dans un client v4, seulement après sauvegarde indépendante de la v5 et décision explicite. Cette restauration **perd les changements postérieurs à la date de la copie**, dont les nouvelles ressources et décorations. Le retour arrière du code seul ne permet pas au lecteur v4 de lire v5.
5. Une source incohérente est protégée et exportable en brut. Ne pas créer une nouvelle partie par-dessus sans décision explicite. Les sauvegardes restent locales à l’appareil/origine ; garder une copie hors Safari.

## Ancien onglet v4 : risque restant et procédure avant livraison normale

Le contrôleur compare la chaîne active attendue à celle du stockage avant chaque écriture. Les tests v5 vérifient le refus si un autre auteur remplace la clé. Cela **n’est pas un verrou transactionnel entre onglets** : un ancien client v4 déjà chargé ne coopère pas avec les futurs protocoles ; des écritures concurrentes peuvent gagner dans l’autre ordre. Cette tâche ne prétend pas résoudre le comportement d’un onglet v4 physique encore ouvert.

Avant une future mise à jour normale : exporter la partie v4 et la conserver ; fermer tous les onglets et fenêtres de ce jeu, y compris sur les autres profils partageant ce stockage ; publier seulement après validation humaine ; rouvrir une unique page, vérifier son SHA dans Paramètres, laisser la migration se sauvegarder et exporter la v5. Ne pas revenir dans un ancien onglet conservé. En cas de SHA ancien ou de conflit, exporter avant fermeture puis utiliser une seule session à jour. Un essai Safari de ce protocole reste requis avant la publication normale.

## Intégration préparée, sans livraison normale

`prepare-v5-integration.yml` construit un artefact **de revue**, sans permission Pages ni étape de déploiement : jeu normal v5 sans outils, laboratoire v5 sous son préfixe séparé, Décorations v5 maintenu, comptes v4 depuis leur SHA figé. `verify-v5-integration.mjs` contrôle chemins, versions, préfixes, absence d’outils dans le normal et révisions source. Aucun appel au backend pendant ce préflight. Le publisher actuel reste sur les sources stables v4 pour le normal/laboratoire et ne remplace que Décorations.

Conditions avant livraison normale : retour Safari physique sur fluidité/interactions et export de secours, validation du protocole de fermeture des anciennes sessions sur copies, accord explicite pour cette intégration et décision de récupération documentée. Les comptes v4 restent incompatibles avec v5 ; leur migration coordonnée appartient à un chantier distinct, toujours en pause. Ne pas fusionner la PR nº 2 pour cette livraison de prévisualisation.


Préflight exécuté et réussi le 9 octobre 2026 : [Actions 37938964487](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964487), [artefact de revue](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964487/artifacts/11620940193), [révisions et formats des quatre routes](validation/integration-v5-preflight-2026-10-09.json). Il n’a rien publié ; normal/laboratoire restent v4. Le contrôle public de la seule nouvelle preview est [consigné séparément](validation/publication-performance-2026-10-09.json).

**CI finale réussie :** application `a7635ec44400dba55d2e57cdd7b94cc14e3bac46`, [Actions 37938964352](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964352), **487 tests / 13 fichiers**, TypeScript/build et cinq parcours Chromium. [Preuve durable](validation/performance-ci-2026-10-09.json), [captures/rapports](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37938964352/artifacts/11621205985), conservés 30 jours. Session répétée : 75 secondes dans Actions (61 localement), 36 panneaux, 12 cycles Aménagement/photo, 20 scénarios, neuf déplacements de trois objets ; comptes d’objets/textures/listeners/timers stables et export de source v4 exact après rechargement.


## Catalogue quinze espèces

Bouée, Géant, Magicien et Dragon étendent uniquement le catalogue reconnu, sans changement de format v5. Les résultats et délais déjà enregistrés sont conservés, sans nouveau tirage. Une ancienne application v5 limitée à onze identifiants ne peut toutefois pas importer une sauvegarde contenant les nouveaux lapins : conserver cette application quinze espèces ou une version plus récente, exporter avant essais et suivre la récupération compatible v5. Les clients normal/laboratoire/comptes v4 publiés restent inchangés ; aucun export v5 de test ne leur est destiné.
