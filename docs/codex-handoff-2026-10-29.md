# Passation Codex — 29 octobre 2026

## Première mission : réparer le problème signalé par le propriétaire

Le propriétaire a signalé après la livraison des bisous : « ça m'a rendu le jeu illisible. Coriges le problème. » À la question pour préciser, il a répondu exactement : **« partie illisble, les décors ne chargent pas »**.

**Le défaut n’est pas corrigé et sa cause n’est pas établie.** Ne pas annoncer une résolution et ne pas considérer que le problème concerne uniquement la superposition des lapins. On ignore encore si « partie illisible » est un message affiché par le jeu ou sa description, et si cela arrive sur iPhone/ordinateur, en ligne/local. Ne pas conclure à une sauvegarde corrompue sans preuve.

La dernière demande de ce tour est de préparer cette passation pour un nouveau modèle Codex ; la demande de correction reste à reprendre ensuite. Aucune modification fonctionnelle n’a été faite depuis le signalement.

## Consignes et état Git

Lire `AGENTS.md`, puis cette passation. L’ancienne `docs/codex-handoff-2026-10-26.md` contient l’historique, mais cette passation prime pour le problème ouvert.

- Branche vérifiée : `feature/missions-octobre-2`.
- Dernier commit avant cette passation : `73934ae` (documentation), après `d689325` (animation des bisous).
- Au début de la passation : fichiers suivis propres ; `.claude/` non suivi à préserver. Préserver aussi `.env.local` et `output/`, jamais les committer.
- Rien fusionné dans main, poussé ou publié par l’assistant. Le propriétaire publie lui-même sur Netlify. On ne sait pas quelle version il a effectivement publiée.
- Limiter les tokens et les tests aux contrôles essentiels. Le propriétaire a explicitement refusé les simulations de progression pour ses changements économiques. Ne pas en lancer.
- Un seul agent qui modifie les fichiers à la fois. Les agents d’analyse peuvent lire en parallèle ; machine à mémoire limitée.
- L’agent de diagnostic `audit_kiss_regression` a été interrompu par la limite d’utilisation avant de rendre un diagnostic. Il n’a pas modifié de fichier. Ne pas le relancer aveuglément ; le coordinateur peut reprendre lui-même. Les agents des missions précédentes ont aussi subi des interruptions par quota, documentées dans l’historique.
- Ne pas effacer, réinitialiser ou remplacer la partie du propriétaire pour contourner le défaut. Ne jamais demander de mot de passe ni exposer une sauvegarde réelle dans le dépôt public.

## Dernières livraisons

1. `c60a336` : amitiés et souvenirs persistants, format **v21**, migration automatique depuis v20 (chaîne v16–19 conservée). Le RPC Supabase accepte déjà le format et refuse les rétrogradations ; aucune migration SQL demandée.
2. `60640ec` : album, photos PNG téléchargées séparément, 27 souvenirs textuels sur neuf destinations, six découvertes tournantes, quatre collections des décorations existantes, déplacement groupé atomique et trois fêtes récurrentes. Voir `docs/cozy-content.md` pour règles et limites.
3. `df49d09` : documentation de ces contenus.
4. `d689325` : bisous réduits de quatre à **trois secondes**, trois contacts de truffe, légère inclinaison/compression, cœurs conservés. `RabbitPose.nuzzle` optionnel appliqué au corps après le miroir natif. Les câlins aux objets utilisent aussi `KISS_MS`.
5. `73934ae` : documentation du contrôle des bisous.

Fichiers du changement de bisous : `src/display/rabbitMotion.ts`, `MeadowScene.ts`, `cozyInteraction.ts`, tests `rabbit-life.test.ts` et `rabbit-motion.test.ts`. Aucun changement de décors ou de schéma dans ce commit, mais cela ne suffit pas à exclure une régression antérieure révélée au rechargement.

## Diagnostic commencé, sans conclusion

Lectures effectuées :

- `src/persistence/json.ts` : `decodeGame` vers 317–350 ; migration 19/20 vers21 puis validation Zod stricte ; erreur générique `INVALID_STATE`. Nouveau bloc cosy vers 84 et contrôles d’unicité vers112. Si une partie réelle est refusée, obtenir un diagnostic précis sans modifier ses données ni masquer arbitrairement une erreur de schéma.
- `src/simulation/cozy.ts` : durées d’amitié bornées à six heures, album80, liens512, souvenirs par destination. `advanceFriendships` ne crée pas un bloc vide quand le temps ne progresse pas. Une hypothèse de durée fractionnaire a été envisagée, **non confirmée** : `advance` exige déjà des timestamps entiers.
- `src/simulation/time.ts` : `advance` vers59, appel d’amitié avant mise à jour de `lastSimulatedAt` ; pas d’erreur évidente identifiée.
- `src/display/MeadowScene.ts` : `requiredArt` vers480 charge uniquement les résidents, bâtiments possédés, décorations posées, aperçu actif et dessin de la découverte courante. `ensureArt` vers515 attend le lot et garde l’ancien rendu tant qu’il manque des images ; les échecs sont mémorisés jusqu’au bouton Réessayer. Vérifier en particulier l’impact d’une image facultative de découverte qui échoue, le chargement initial et les changements de partie pendant un lot. **Pistes, pas causes démontrées.**
- `src/display/rabbitLifeViews.ts` : cœurs existants, durée liée à `KISS_MS` ; pas de modification dans le dernier commit.

Prochaine démarche conseillée : reproduire avec le dossier réellement distribué et une partie v20/v21 représentative contenant plusieurs décors ; distinguer refus de sauvegarde, exception JavaScript et images réseau manquantes. Inspecter les erreurs et les requêtes d’assets, comparer les révisions jeu/laboratoire. Si les données du propriétaire sont indispensables, demander une exportation privée après avoir expliqué comment la conserver, sans la committer. Aucun export réel n’est actuellement disponible dans le contexte.

## Validation réellement faite avant le signalement

- Bisous : types et 38 tests ciblés distincts réussis par l’agent ; diff relu par le coordinateur.
- `npm run build:netlify` réussi après le commit `d689325`, avec jeu, laboratoire, cuisine et vérifications de production/musiques.
- `netlify-site/build-revision.txt` vérifié : `d6893258a49c242b7d1629b781423f8dc85c5562`. Le laboratoire portait la même révision lors de la construction ; à revérifier avant livraison.
- Chromium : partie fictive migrée depuis v20, rencontre naturelle dans le nid ; deux lapins en bisou à1,5s, sortis à3,2s ; cœurs visibles et capture relue. Aucune erreur JavaScript dans ce scénario. **Ce contrôle ne prouve pas que la partie du propriétaire ou tous ses décors se chargent.**
- Preuves ignorées : `output/validation/tender-kisses/check.cjs`, `report.json`, `natural-long-kiss.png` ; construction `output/tender-build.log`.
- Contenus cosy : types, tests ciblés et Chromium sur partie fictive, dont album, observation, déclenchement d’interaction et véritable export PNG. Voir `output/validation/cozy/`.
- Deux anciens tests de `tests/economy-v17.test.ts` restent obsolètes et échouent sur les anciens revenus/plafonds ; les tests de migration correspondants passent. Ne pas changer l’économie pour satisfaire ces anciennes assertions.
- Aucun essai iPhone ou connexion à un compte réel par l’assistant. Aucune nouvelle validation fonctionnelle effectuée pendant le diagnostic actuel ; seulement lecture du code et de l’état Git.

## Reprendre les contrôles sans gaspillage

Commandes Windows : `npx.cmd tsc --noEmit` ; vitest ciblé avec `--configLoader runner --maxWorkers 1 --testTimeout 30000` ; `npm.cmd run build:netlify` pour la livraison complète. Ce dernier inclut déjà types et builds. Pas besoin de répétitions sans nouvelle modification ou nouvelle incertitude.

Playwright est disponible dans le dépôt voisin décrit par AGENTS ; utiliser `PLAYWRIGHT_MODULE`, l’aperçu local5199 et bloquer les requêtes externes pour les parties fictives. Scripts utiles dans `output/validation/cozy/`, `tender-kisses/` et `audit-final-2026-10-28/` (échec d’image puis reprise). N’arrêter que le serveur lancé pour ce contrôle, après vérification de son PID. Aucun serveur de contrôle de cette session ne reste volontairement actif.

Quand la correction est démontrée : tests essentiels du défaut, types/build, capture réelle si affichage concerné, commit précis en français et reconstruction du dossier Netlify. Rapport simple au propriétaire avec cause prouvée, correction, limites, branche/commit et état Git. Aucune publication automatique.
