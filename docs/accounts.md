# Comptes et sauvegarde en ligne — format v20

Dans **Paramètres → Sauvegarde en ligne**, tu peux créer un compte avec ton adresse e-mail et un mot de passe de huit caractères minimum, puis associer ta partie. Aucun e-mail, lien magique ou code n'est envoyé. Pour un mot de passe oublié, contacte le propriétaire : il le réinitialise dans le SQL Editor suivant [le guide d'installation](supabase-setup.md).

Ta partie jouée reste enregistrée dans le navigateur, sous la même clé `prairie-lapins.save.v1`. Une seule partie en ligne est conservée par compte. Sur un autre appareil, connecte-toi et choisis **Récupérer ma partie en ligne**. Conserve aussi des exports JSON, surtout avant de changer de compte ou d'appareil.

## Association et conflits

- Premier lien sans partie en ligne : **Associer cette partie à mon compte**, puis confirmation.
- Premier lien avec une partie en ligne : les deux résumés affichent niveau, pièces, nourriture, cœurs, lapins et espèces découvertes. Tu confirmes soit **Récupérer ma partie en ligne**, soit **Garder la partie de cet appareil**. Cette dernière action remplace la partie du compte.
- Appareil déjà associé au même compte : le serveur est relu. Si sa révision est identique, les changements locaux reprennent leur envoi. Si seule la partie distante a changé, elle est récupérée automatiquement. Si les deux parties ont changé, les envois sont bloqués jusqu'à ton choix confirmé. Aucune fusion n'est effectuée.

Avant tout remplacement local, le contenu précédent est écrit intégralement dans `prairie-lapins.cloud.backup.v1`. Si cette écriture échoue, le remplacement est refusé. Il s'agit d'un seul secours, remplacé à la récupération suivante, pas d'un gestionnaire de points de restauration. Dans **Paramètres → Sauvegarde en ligne**, **Télécharger la copie de secours** permet de conserver ce fichier. Pour le récupérer, utilise ensuite **Importer une partie**, dans la section **Remplacer la partie** des Paramètres : son contenu est validé et son résumé affiché avant ta confirmation. L'export courant concerne la partie jouée, pas ce secours.

Si la liaison locale au compte est illisible, **Réparer la liaison** propose une confirmation. Le contenu exact de l'ancienne liaison, y compris un éventuel envoi en attente, est archivé sous une clé distincte `prairie-lapins.cloud.link-backup.v1.<identifiant>`. Si cet archivage échoue, rien n'est vidé. La réparation ne remplace pas la partie ni la copie de secours : elle relit le serveur et te demande de comparer les parties avant de choisir. Les archives de liaison ne sont pas des parties directement importables ; elles restent disponibles pour un diagnostic si nécessaire.

## Envois et statuts

Les changements sont groupés : un envoi intervient quatre secondes après le premier changement à transmettre, puis un autre si tu as joué pendant l'envoi. Le jeu tente aussi un envoi au passage en arrière-plan et à la fermeture de la page ; un navigateur peut interrompre cette tentative. L'indicateur se trouve uniquement dans Paramètres.

Les lectures et envois sans réponse sont interrompus après vingt secondes. La partie reste locale et la reprise réutilise le même identifiant d'opération et le même contenu pour éviter un double enregistrement. Une réponse tardive ne modifie pas le statut d'un nouvel envoi.

- **Sauvegardé en ligne · date heure** : le serveur a confirmé la partie.
- **Envoi en cours…** ou attente : les progrès sont locaux et attendent leur confirmation distante.
- **Hors ligne** : tes progrès restent sur cet appareil ; nouvelles tentatives à 5, 10, 20, 40 puis 60 secondes, ainsi qu'au retour en ligne ou au retour de la page visible.
- **Session expirée** : reconnecte-toi ; la partie locale est conservée.
- **Sauvegarde locale en erreur** : aucun envoi n'a lieu avant sa réparation.
- **Conflit** : choisis la partie à garder après avoir comparé les résumés.
- **Version plus récente** : recharge le jeu ; cette version ne peut pas écraser une partie d'un format futur.

La déconnexion arrête les envois et conserve la partie sur l'appareil. Revenir au même compte reprend la vérification. Changer de compte impose un nouveau choix. Évite de jouer simultanément dans plusieurs onglets ou appareils : le jeu refuse les écritures locales concurrentes détectées et le serveur refuse une révision devenue obsolète.

L'empreinte compare les progrès persistants : ressources, individus, constructions, commandes, voyages, achats et récompenses. Elle exclut le temps simulé, les revenus en attente, les quotidiennes recalculées, les droits dérivés, les missions devenues prêtes et l'expiration des aides. Une naissance conserve son identité dans l'empreinte lors de son transfert automatique du nid à la nurserie. Ces changements passifs sont recalculés au chargement ; le seul passage du temps ne provoque pas d'envoi. L'état complet v20 reste envoyé après un changement du joueur.

## Sécurité et limites

Le client Supabase est chargé à la demande après **Jouer**, seulement avec une configuration valide et dans la partie normale. Le laboratoire, `?dev=1` et l'aperçu décorations n'initialisent jamais le SDK. Sans configuration, le panneau propose de conserver un export.

La clé publishable est publique. Aucun secret serveur n'est nécessaire dans le navigateur ni dans le dépôt. La session persistante dispose de sa propre clé `prairie-lapins.auth.<ref>`. Sur un appareil partagé, déconnecte-toi ; la partie locale reste néanmoins accessible à la personne qui utilise ce navigateur. Les joueurs ne doivent jamais partager leurs mots de passe.

Les politiques RLS autorisent chaque compte authentifié à lire seulement sa sauvegarde et son historique. Aucune écriture directe n'est autorisée, aucun accès anonyme. L'unique RPC vérifie `auth.uid()`, verrouille le propriétaire, contrôle la révision attendue (CAS), borne la taille à 1 000 000 octets et protège les formats supérieurs. La validation détaillée du jeu reste dans `decodeGame`, avec migrations v16 → v20 ; le serveur n'est pas un système anti-triche.

Les 64 derniers reçus d'opérations permettent de rejouer une requête dont la réponse s'est perdue, avec le même identifiant et le même contenu, sans nouvelle révision. Après éviction d'un reçu, le contrôle de révision empêche un ancien envoi d'écraser les progrès plus récents. Les réponses d'une ancienne identité sont ignorées.

L'historique conserve les **30 révisions précédentes les plus récentes**, plus **le premier état de chacun des sept derniers jours actifs UTC** (union, au maximum 37 lignes par compte). Seul le propriétaire du projet l'administre ; aucun sélecteur de restauration n'est proposé aux joueurs. Supprimer un utilisateur dans Authentication supprime sa partie, son historique et ses reçus.

Le dimensionnement vise au plus dix joueurs simultanés sur un projet Supabase Free. Ce n'est pas une garantie de disponibilité ni de sauvegarde illimitée : base, trafic, authentification et stockage restent soumis aux quotas du projet. À la taille maximale autorisée, sauvegardes et historiques représentent jusqu'à environ 38 Mo de JSON par compte, hors index et reçus. Surveille les usages et les avertissements dans le tableau de bord ; vérifie les limites Free affichées au moment de créer le projet. Aucun abonnement payant n'est configuré automatiquement.

## Validation effectuée et restante

Les tests locaux utilisent PGlite, des rôles `anon`/`authenticated` et un `auth.uid()` simulé. Ils couvrent les droits, l'isolation, CAS, l'idempotence, les formats, la rétention, la synchronisation avec faux serveur et les formulaires sous happy-dom. PGlite installé ne fournit pas pgcrypto : la fonction de réinitialisation est vérifiée pour ses droits et la longueur minimale ; le hachage réel reste à vérifier sur Supabase.

## Mise en service réelle — 26 octobre 2026

Projet Supabase Free neuf créé par le propriétaire (région Europe), SQL `001_cloud_saves.sql` exécuté une fois, « Confirm email » désactivé. Configuration publique dans `.env.local` (ignoré par Git) ; build `c79f701` publié sur Netlify et vérifié en ligne (`build-revision.txt` du jeu et du laboratoire).

Contrôles réels :

- Accès anonymes au vrai projet (contrôle Claude) : lecture de `prairie_saves` refusée (42501), RPC `prairie_commit` refusée (42501), schéma `prairie_private` non exposé (PGRST106).
- pgcrypto disponible dans `extensions` (requête de contrôle exécutée par le propriétaire).
- Essais du propriétaire sur iPhone et ordinateur : création de compte, association, « Sauvegardé en ligne » et nouvelle révision après une action ; réinitialisation du mot de passe par `reset_player_password` puis connexion ; récupération de la même partie sur l'ordinateur ; deux appareils ouverts, comportement jugé normal par le propriétaire ; déconnexion puis reconnexion.

Non validé : jetons expirés après une longue absence, coupure réseau réelle pendant un envoi, quotas Free sur la durée. Aucune solution ne garantit de « ne jamais perdre » une partie : conserve des exports indépendants.

## Rappel de création de compte

Après une reproduction réussie avec un Lapin Feu (espèce `feu`), une invitation unique par appareil te propose d’associer ta partie à ton e-mail. « Associer mon e-mail » ouvre les Paramètres sur Sauvegarde en ligne, en mode création de compte ; « Plus tard » ou Échap ferme définitivement ce rappel. Le drapeau `accountReminderShown` appartient aux préférences, pas à la sauvegarde de partie.

Le rappel attend la fermeture des autres dialogues. Si le guidage de Paille occupe l’écran, il attend une prochaine reproduction avec un Lapin Feu. Il reste absent si une liaison cloud existe (quel que soit son propriétaire), si une session est connectée, sans configuration en ligne, au laboratoire, avec `?dev=1` et dans l’aperçu décorations. La détection du compte ne charge pas le SDK. Le bouton « Afficher » / « Masquer » agit sur les deux champs de mot de passe ; une connexion ou déconnexion rétablit le masquage.

## Corriger la partie d'un joueur (pièces, cœurs, nourriture)

Ne jamais modifier `public.prairie_saves` à la main : si l'appareil du joueur a des progrès plus récents que la copie en ligne, la modification crée un conflit et peut faire perdre des jours de jeu.

Installation, une seule fois : exécuter `supabase/migrations/002_adjustments.sql` dans le SQL Editor du projet `vulkepfrnnqtgijitkwg`.

Ensuite, dans le SQL Editor :

```sql
-- Remettre les pièces à 100 (types : set_pattes, add_pattes, add_hearts, add_grass ; un montant négatif retire)
select prairie_private.adjust_player('adresse@du-joueur', 'set_pattes', 100, 'Raison de la correction');
-- Vérifier : la ligne « applied » passe à true quand le jeu l'a appliquée et envoyée
select * from prairie_private.player_status('adresse@du-joueur');
```

Le jeu lit la correction à la connexion ou au retour dans l'application, l'applique une seule fois à la partie en cours (y compris une partie récupérée plus tard ou un fichier importé), puis l'envoie normalement. Les autres progrès du joueur sont conservés. Une correction ne s'efface pas : pour l'annuler, en ajouter une autre.

Le jeu affiche aussi dans la prairie « Sauvegarde en ligne : choix à faire », « bloquée » ou « Reconnecte-toi » quand l'envoi en ligne a besoin du joueur, et désigne la partie la plus avancée lors d'un choix.
