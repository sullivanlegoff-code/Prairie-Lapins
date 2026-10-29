# Passation Codex — 29 octobre 2026

## Confirmation du propriétaire : jeu publié fonctionnel

Le 29 octobre 2026, le propriétaire confirme : **« j’ai vérifié sur Netlify et le jeu fonctionne bien »**. Il précise que son signalement « partie illisible, les décors ne chargent pas » était une erreur de sa part.

**Aucun problème de chargement n’est ouvert sur cette base.** Ne pas reprendre le diagnostic, corriger le jeu ni revenir sur les derniers changements à partir de ce signalement annulé. L’essai de la version publiée a été effectué par le propriétaire, pas par l’assistant. La révision exacte qu’il a publiée n’a pas été identifiée.

Cette reprise est uniquement documentaire ; attendre les prochaines missions du propriétaire. Aucune modification fonctionnelle n’a été faite depuis le signalement.

## Consignes et état Git

Lire `AGENTS.md`, puis cette passation. L’ancienne `docs/codex-handoff-2026-10-26.md` contient l’historique, mais cette passation prime pour l’état actuel confirmé par le propriétaire.

- Branche vérifiée : `feature/missions-octobre-2`.
- Dernier commit vérifié avant cette mise à jour : `a92897f` (passation), après `73934ae` (documentation) et `d689325` (animation des bisous).
- Au début de la passation : fichiers suivis propres ; `.claude/` non suivi à préserver. Préserver aussi `.env.local` et `output/`, jamais les committer.
- Aucune fusion dans main, aucun push ni aucune publication sans instruction explicite du propriétaire. Rien fusionné dans main, poussé ou publié par l’assistant. Le propriétaire publie lui-même sur Netlify. On ne sait pas quelle révision il a effectivement publiée.
- Limiter les tokens et les tests aux contrôles essentiels. Ne pas modifier l’économie ni lancer de simulation de progression sans demande explicite du propriétaire.
- Un seul agent qui modifie les fichiers à la fois. Les agents d’analyse peuvent lire en parallèle ; machine à mémoire limitée.
- L’agent de diagnostic `audit_kiss_regression` a été interrompu par la limite d’utilisation avant de rendre un diagnostic. Il n’a pas modifié de fichier. Le signalement étant annulé, ne pas reprendre ce diagnostic. Les agents des missions précédentes ont aussi subi des interruptions par quota, documentées dans l’historique.
- Préserver la partie du propriétaire ; ne pas l’effacer, la réinitialiser ou la remplacer. Ne jamais demander de mot de passe ni exposer une sauvegarde réelle dans le dépôt public.

## Dernières livraisons

1. `c60a336` : amitiés et souvenirs persistants, format **v21**, migration automatique depuis v20 (chaîne v16–19 conservée). Le RPC Supabase accepte déjà le format et refuse les rétrogradations ; aucune migration SQL demandée.
2. `60640ec` : album, photos PNG téléchargées séparément, 27 souvenirs textuels sur neuf destinations, six découvertes tournantes, quatre collections des décorations existantes, déplacement groupé atomique et trois fêtes récurrentes. Voir `docs/cozy-content.md` pour règles et limites.
3. `df49d09` : documentation de ces contenus.
4. `d689325` : bisous réduits de quatre à **trois secondes**, trois contacts de truffe, légère inclinaison/compression, cœurs conservés. `RabbitPose.nuzzle` optionnel appliqué au corps après le miroir natif. Les câlins aux objets utilisent aussi `KISS_MS`.
5. `73934ae` : documentation du contrôle des bisous.

Fichiers du changement de bisous : `src/display/rabbitMotion.ts`, `MeadowScene.ts`, `cozyInteraction.ts`, tests `rabbit-life.test.ts` et `rabbit-motion.test.ts`. Aucun changement de décors ou de schéma dans ce commit.

## Diagnostic historique clos

Des lectures du code de sauvegarde, d’amitié et d’affichage avaient été commencées sans établir de cause ni modifier le jeu. Les hypothèses envisagées n’ont pas été confirmées. Le propriétaire ayant annulé son signalement, ces pistes ne constituent pas des défauts établis et aucune investigation supplémentaire n’est demandée.

## Validation réellement faite avant le signalement

- Bisous : types et 38 tests ciblés distincts réussis par l’agent ; diff relu par le coordinateur.
- `npm run build:netlify` réussi après le commit `d689325`, avec jeu, laboratoire, cuisine et vérifications de production/musiques.
- `netlify-site/build-revision.txt` vérifié : `d6893258a49c242b7d1629b781423f8dc85c5562`. Le laboratoire portait la même révision lors de la construction ; à revérifier avant livraison.
- Chromium : partie fictive migrée depuis v20, rencontre naturelle dans le nid ; deux lapins en bisou à1,5s, sortis à3,2s ; cœurs visibles et capture relue. Aucune erreur JavaScript dans ce scénario. **Ce contrôle ne prouve pas que la partie du propriétaire ou tous ses décors se chargent.**
- Preuves ignorées : `output/validation/tender-kisses/check.cjs`, `report.json`, `natural-long-kiss.png` ; construction `output/tender-build.log`.
- Contenus cosy : types, tests ciblés et Chromium sur partie fictive, dont album, observation, déclenchement d’interaction et véritable export PNG. Voir `output/validation/cozy/`.
- Deux anciens tests de `tests/economy-v17.test.ts` restent obsolètes et échouent sur les anciens revenus/plafonds ; les tests de migration correspondants passent. Ne pas changer l’économie pour satisfaire ces anciennes assertions.
- Aucun essai iPhone ou connexion à un compte réel par l’assistant. Aucune nouvelle validation fonctionnelle effectuée pendant le diagnostic historique ; seulement lecture du code et de l’état Git.

## Contrôles pour les prochaines missions

Commandes Windows : `npx.cmd tsc --noEmit` ; vitest ciblé avec `--configLoader runner --maxWorkers 1 --testTimeout 30000` ; `npm.cmd run build:netlify` pour la livraison complète. Ce dernier inclut déjà types et builds. Pas besoin de répétitions sans nouvelle modification ou nouvelle incertitude.

Playwright est disponible dans le dépôt voisin décrit par AGENTS ; utiliser `PLAYWRIGHT_MODULE`, l’aperçu local5199 et bloquer les requêtes externes pour les parties fictives. Scripts utiles dans `output/validation/cozy/`, `tender-kisses/` et `audit-final-2026-10-28/` (échec d’image puis reprise). N’arrêter que le serveur lancé pour ce contrôle, après vérification de son PID. Aucun serveur de contrôle de cette session ne reste volontairement actif.

Pour cette mise à jour documentaire : relecture et `git diff --check` uniquement ; aucun test fonctionnel, build, contrôle navigateur ou essai iPhone à relancer. Pour les prochaines missions, adapter les contrôles à la modification réellement demandée. Le jeu reste inchangé ; aucune reconstruction ni publication Netlify n’est nécessaire pour cette documentation.
