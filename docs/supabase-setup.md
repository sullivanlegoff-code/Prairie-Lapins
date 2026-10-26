# Installer les comptes et la sauvegarde automatique

Cette procédure concerne un **projet Supabase neuf**, pour Prairie Lapins v19 et au plus dix joueurs simultanés. Aucun projet n'est déjà configuré par ce dépôt. Les noms de menus peuvent évoluer ; aucun accès réseau n'a été utilisé pour vérifier l'interface actuelle.

1. Dans Supabase, crée une organisation **Free**, puis un nouveau projet **Free**, dans une région d'Europe. Choisis un mot de passe de base de données robuste et conserve-le dans un gestionnaire de mots de passe. Ne le mets jamais dans le dépôt, un fichier de configuration du jeu ou une capture publique.
2. Dans **SQL Editor**, ouvre une nouvelle requête, colle tout le fichier [`supabase/migrations/001_cloud_saves.sql`](../supabase/migrations/001_cloud_saves.sql), puis clique **Run une seule fois**. Le fichier est transactionnel et destiné à une base neuve. Il crée les tables, RLS, historique, reçus et fonctions privées. Le schéma `prairie_private` doit rester hors des schémas exposés par la Data API ; seul `public` contient la RPC exposée. Supabase doit fournir pgcrypto dans le schéma `extensions` pour la réinitialisation administrative des mots de passe (configuration habituelle d'un projet neuf).
3. Dans **Authentication → Sign In / Providers → Email**, active Email, autorise les inscriptions, règle la longueur minimale du mot de passe sur **8**, et **DÉSACTIVE « Confirm email »**. Aucun SMTP, lien magique, code ou e-mail de récupération n'est à configurer. Le jeu utilise uniquement e-mail + mot de passe. Les adresses ne sont pas vérifiées : demande aux joueurs de vérifier leur saisie.
4. Dans les réglages du projet, relève **Project URL** et la clé **publishable**, qui commence par `sb_publishable_`. Cette clé est publique et repose sur les droits RLS. N'utilise **JAMAIS** une clé `sb_secret_`, `service_role`, le mot de passe de base ou un secret JWT dans le jeu.
5. Crée `.env.local` à la racine en prenant [`.env.example`](../.env.example) comme modèle. Remplace les deux valeurs factices uniquement dans ce fichier ignoré par Git :

   ```dotenv
   VITE_SUPABASE_URL=https://exemple-projet.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EXEMPLE_FACTICE
   ```

   L'URL doit avoir exactement la forme `https://<ref>.supabase.co`, sans barre finale. Aucune véritable URL ni clé de projet ne doit être ajoutée au dépôt public. Ces variables sont incorporées au build du jeu ; un changement nécessite un nouveau build.
6. Lance `npm run build:netlify`, puis publie le dossier `netlify-site/` comme d'habitude. Dans PowerShell si les scripts `.ps1` sont bloqués, utilise `npm.cmd run build:netlify`. Le laboratoire est construit sans code Supabase, même si les variables du jeu sont présentes.
7. Dans le jeu normal publié, clique **Jouer**, puis ouvre **Paramètres → Sauvegarde en ligne**. Crée un compte, associe la partie et confirme. Effectue une action, attends quelques secondes et vérifie **Sauvegardé en ligne · date heure**. Si la création renvoie une session nulle, désactive la confirmation d'e-mail dans Supabase. Sans configuration reconnue, le panneau indique que la sauvegarde en ligne est indisponible.
8. Sur un autre appareil, connecte-toi avec le même compte, compare les résumés et confirme **Récupérer ma partie en ligne**. Vérifie ressources et lapins, puis joue et retrouve la nouvelle révision sur le premier appareil. Teste aussi une coupure réseau, une reconnexion et un conflit avant de généraliser l'accès. Les tests du dépôt utilisent un moteur PostgreSQL local ; ils ne remplacent pas ces essais sur le vrai service.

## Mot de passe oublié

Le propriétaire vérifie lui-même la demande du joueur et choisit avec lui un nouveau mot de passe d'au moins huit caractères. Dans **SQL Editor** uniquement, exécute :

```sql
select prairie_private.reset_player_password('adresse', 'nouveau mot de passe');
```

Remplace ces valeurs par celles du joueur **uniquement dans le SQL Editor**, jamais dans les fichiers du dépôt. Pour une apostrophe dans une valeur SQL, double-la. Cette requête est sensible : le mot de passe peut rester dans l'historique du SQL Editor ; gère cet historique et communique le nouveau mot de passe par un moyen privé. La fonction modifie seulement `auth.users.encrypted_password`, via `extensions.crypt` et `extensions.gen_salt('bf')`, sans toucher aux parties. Elle est révoquée pour `public`, `anon` et `authenticated`. Le jeu ne propose aucune réinitialisation par e-mail. La procédure ne révoque pas les sessions déjà ouvertes.

## Exploitation

**Supprimer un utilisateur dans Authentication supprime aussi sa partie en ligne, son historique et ses reçus.** Conserve des exports avant toute suppression. Une réinitialisation du mot de passe conserve la partie.

Surveille la consommation et les quotas Free dans le tableau de bord, ainsi que les éventuelles interruptions de service. Aucun abonnement payant, serveur supplémentaire ou Realtime n'est requis. La sauvegarde est déclenchée par les actions du joueur, sans interrogation périodique du serveur. Une connexion et chaque récupération relisent le serveur ; pour vérifier une autre session déjà ouverte, reconnecte le compte ou utilise les mécanismes de reprise lorsqu'une erreur est affichée.

Mise en service réelle effectuée le 26 octobre 2026 en suivant ce guide : voir [accounts.md](accounts.md#mise-en-service-réelle--26-octobre-2026). Garde des exports JSON indépendants.
