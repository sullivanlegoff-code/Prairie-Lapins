# Passation Codex — 29 octobre 2026

## Confirmation du propriétaire : jeu publié fonctionnel

Le 29 octobre 2026, le propriétaire confirme : **« j’ai vérifié sur Netlify et le jeu fonctionne bien »**. Il précise que son signalement « partie illisible, les décors ne chargent pas » était une erreur de sa part.

**Aucun problème de chargement n’est ouvert sur cette base.** Ne pas reprendre le diagnostic, corriger le jeu ni revenir sur les derniers changements à partir de ce signalement annulé. L’essai de la version publiée a été effectué par le propriétaire, pas par l’assistant. La révision exacte qu’il a publiée n’a pas été identifiée.

La confirmation a été enregistrée dans le commit `c13ac97`. Le propriétaire a ensuite approuvé les corrections du nid, puis la planche v2 des décorations et leur intégration décrites ci-dessous.

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

## Décorations approuvées — intégration du 29 octobre

- Code livré dans `9afe739` : neuf nouveaux modèles et remplacement de l’image de l’arbre existant par sa version à guirlande de lampes-lapins. Le catalogue compte désormais 22 modèles. L’arbre conserve son identifiant, son prix de 30 pattes, son niveau 1 et ses dimensions ; les exemplaires déjà possédés sont conservés.
- Prix choisis par le coordinateur, autorisé par le propriétaire : chaussons requins 50 (niveau 3), bouquet blanc 100 (4), gâteau chocolat « je t’aime » 150 (5), table à repasser 300 (6), rocher d’escalade 900 (8), vasque lapin 1 500 (10), microscope et cinq fioles 3 500 (15), armoire Penguin 5 000 (14), Nintendo Switch 5 000 (16). Prix en pattes, sans nouveau tarif en cœurs. Catalogue détaillé dans `docs/decorations.md`.
- Dix masters peints avec l’outil imagegen intégré, fidèles à la planche v2 approuvée, dans `assets-source/decorations/` ; versions transparentes de 320 px maximum dans `public/assets/decorations/`. Empreintes et dérivation reproductible contrôlées pour les 22 modèles. La planche et les prompts restent ignorés dans `output/imagegen/decorations-souhaits-v2/` et `output/imagegen/decorations-production-v1/`.
- Achat, pose, rangement et revente utilisent les règles existantes. Neuf missions « Installer » apparaissent automatiquement ; les 10 XP de première pose par modèle restent inchangés. Les quatre collections cosy conservent leurs listes. Aucune modification des coefficients économiques ou d’XP, aucune simulation de progression lancée.
- Validation : types réussis ; 235 tests ciblés réussis dans sept fichiers, plus deux tests UI ciblés réussis par l’agent ; `build:netlify` réussi (jeu, laboratoire, cuisine et vérifications de production/musiques) ; `git diff --check` réussi. La suite complète n’a pas été relancée.
- Trois échecs hors intégration ont été observés dans un premier lot plus large : deux traces temporelles de `tests/foundations.test.ts` (graines 104729 et 20261009), et le faux navigateur/scène incomplet de `tests/decoration-scene.test.ts:50` (`matchMedia`, puis autres dépendances de scène). Ces assertions n’ont pas été modifiées.
- Chromium sur partie fictive, écran tactile 844 × 390 : boutique de 22 modèles, neuf achats au prix exact, neuf poses confirmées, arbre existant conservé et actualisé, dix textures rendues, rechargement identique, rangement/repose, annulation puis confirmation de revente d’un doublon, sélection par les coordonnées réelles des neuf nouvelles silhouettes. Aucune erreur JavaScript ni ressource locale manquante. Captures réellement relues ; preuves et script ignorés dans `output/validation/new-decorations-2026-10-29/`.
- Un aperçu d’images a fait suspecter à tort un halo sur la console et les chaussons. La composition réelle des PNG dans Chromium sur fond vert a confirmé leur transparence ; les originaux propres ont été conservés sans détourage procédural.
- `netlify-site/` construit à la révision `9afe739c49dadad7704a6d183213cd2597d945b6`, identique pour jeu et laboratoire. Aucun essai iPhone par l’assistant, aucune fusion dans main, aucun push ni publication. Les anciennes sauvegardes v21 restent acceptées ; les anciennes builds ne connaissent pas les nouveaux identifiants de décoration.

## Maniabilité du nid — mission du 29 octobre

- Code livré dans `272984e`, sur `feature/missions-octobre-2` : deux grandes listes sans colonne centrale, outils compacts, confirmation fixe, probabilités refermables et affection visible pour les lapins renommés. La réouverture montre les parents sélectionnés ; les filtres peuvent être réinitialisés.
- « Refaire le dernier croisement » est proposé en haut du nid libre, avec les noms des individus. Il prépare le dernier couple réellement lancé ; une confirmation « Croiser » reste nécessaire. Une sélection annulée ne remplace pas ce souvenir. Les parents absents ou indisponibles sont expliqués.
- Le champ optionnel `lastBreedingParents` est enregistré atomiquement avec le croisement dans la sauvegarde v21, séparément du brouillon de sélection. Les sauvegardes existantes restent lisibles. Aucun changement SQL/RPC. Limite de retour arrière : une ancienne build v21 à schéma strict ne lit pas ce nouveau champ.
- Validation finale : types, 29 tests ciblés réussis, builds jeu/laboratoire et `build:netlify` avec vérifications de production/cuisine/musiques réussis ; `git diff --check` réussi. La suite complète n’a pas été relancée.
- Un essai plus large a révélé un échec hors nid, reproduit isolément : `tests/ui-dom.test.ts:108` compare l’état complet sans compter une milliseconde de progression d’amitié (14399999 → 14400000). Cette assertion n’a pas été modifiée.
- Chromium sur partie fictive de sept lapins : formats 844 × 390, 568 × 320 et 390 × 844 ; captures relues, bouton Croiser visible, aucun défilement global du dialogue, parents sélectionnés visibles à la réouverture, reprise après rechargement et brouillon annulé vérifiés, aucune erreur JavaScript. Hauteurs des listes en paysage : 224 et 154 px. Preuves ignorées : `output/validation/nest-ux-2026-10-29/`.
- `netlify-site/` reconstruit à la révision `272984eef7295bf240c8f033fbb0e83f6be032a7`, identique pour jeu et laboratoire. Aucun essai iPhone effectué par l’assistant ; aucun changement d’économie, simulation de progression, fusion, push ou publication.

## Livraisons précédentes

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

Pour une modification uniquement documentaire : relecture et `git diff --check`. Pour les prochaines missions, adapter les contrôles à la modification réellement demandée. Le nid et les nouvelles décorations sont validés dans Chromium et le dossier local est construit ; le prochain contrôle conseillé est l’essai iPhone du propriétaire avant sa décision de publication.
