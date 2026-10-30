# Rapport catalogue v20 - 26 octobre 2026

Livré : retrait des trois espèces sans sprite du registre et des projections dérivées ; Dinono épique aux paramètres demandés ; Bouée rare feu/métal à l'ancien emplacement de Dinono, avec pelage procédural orange/gris. Le catalogue compte 32 espèces, dont 20 rares ordinaires et 5 épiques.

Dinono conserve son niveau 1, son illustration et sa description : le registre définit le niveau par espèce et n'impose aucun invariant de niveau commun aux épiques. Sa recette exige les types feu/métal, affection 6, probabilité 5 %, connaissance 450 et aucune garantie. Les règles existantes de croissance/revenus/probabilités par rareté s'appliquent.

La migration accepte v16-v19 et exporte v20. Les adultes convertis conservent identité, nom, affection, habitat et voyage. Les naissances du nid et de la nurserie sont converties sans découverte anticipée. Les listes de découvertes, connaissances et droits historiques de niveau sont nettoyées. Les réservations de garantie de Dinono sont retirées ; sa croissance historique de 30 minutes conserve ses dates. Bouée reste dans son ancien habitat paille selon le précédent `LEGACY_TYPES` de Magicien ; les nouveaux placements suivent ses types actuels.

`first-rare` conserve son identifiant historique et sa condition existante, déjà générique (une espèce rare) ; sa description est corrigée. `all-ordinary-rares` continue de dériver ses 20 cibles du registre. Les neuf espèces survivantes de la liste de revenus bonifiés gardent leur bonus, sans nouveau tirage.

Validation finale séquentielle :

| Commande exécutée | Code | Résultat |
|---|---:|---|
| `npx.cmd tsc --noEmit` | 0 | aucune erreur |
| `npx.cmd vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000` | 0 | 2341 tests, 154 fichiers, tous réussis ; 164,03 s |
| `npm.cmd run build -- --configLoader runner` | 0 | 195 modules ; Vite 7,65 s |
| `npm.cmd run build:lab -- --configLoader runner` | 0 | 195 modules ; Vite 6,74 s |
| `git diff --check` | 0 | aucune erreur d'espacement |

Les variantes `.cmd` sont utilisées car la première tentative via `npx.ps1` a été bloquée par la stratégie PowerShell ; aucune configuration n'a été modifiée. Les deux builds avertissent que `src/cloud/config.ts` est importé statiquement et dynamiquement : aucun déplacement dans un autre chunk, sans échec de compilation.

Les attentes historiques modifiées concernent les versions 19/20/21, les comptes de catalogue, les seuils d'affection, les prix, les indices et les distributions exactes après retrait/déplacement. Les tests d'achats utilisent désormais une recette effectivement vendue (Dinono ou Magicien). Les vérifications exhaustives des paires, tirages et pourcentages sont conservées. Les tests de migration couvrent chaque format v16-v19, adultes, voyage, nid, nurserie, croissance Dinono en cours/prête, habitat historique Bouée, rechargement stable et rejet d'identifiants invalides.

Exception ciblée aux snapshots : `tests/__snapshots__/procedural-art.test.ts.snap` est modifié après l'échec explicite du test de portrait de Bouée. Ses nouvelles couleurs sont attendues, les trois portraits supprimés sont retirés et le titre du test est actualisé. Le portrait inconnu est identique. Aucun autre snapshot n'est modifié. Le script de contrôle des clignements compare désormais les entrées indépendamment de l'ordre des clés du manifeste, puisque Dinono change de position ; le contenu de chaque entrée et les octets des illustrations restent contrôlés.

Limite constatée : les 12 JSON de `docs/test-saves/` sont en v2/v4, déjà incompatibles avec le lecteur initial (rupture v16). Ils restent intacts et gardent le refus explicite `INCOMPATIBLE_CATALOG`, maintenant vérifié par test. Cette mission ne restaure pas les formats antérieurs à v16. Les documents de publication historiques sont conservés et précédés d'un état courant v20.

Aucun navigateur, serveur ni réseau utilisé ; aucun `git add`, commit, push, changement de remotes ou configuration. `public/`, `assets-source/`, dialogues de Paille, `supabase/`, fichiers d'environnement, manifests npm et sauvegardes de documentation sont intacts. Le dossier `.claude/` non suivi, préexistant, est préservé. Les sorties temporaires de diagnostic sont supprimées.

Fichiers livrés :

- `docs/catalog-v20-report.md`
- `docs/game-design.md`
- `docs/species.md`
- `scripts/derive-rabbit-blinks.mjs`
- `src/config/balance.ts`
- `src/config/missions.ts`
- `src/config/species.ts`
- `src/dev/scenarios.ts`
- `src/persistence/json.ts`
- `src/state/initial.ts`
- `src/state/types.ts`
- `tests/__snapshots__/procedural-art.test.ts.snap`
- `tests/ardent.test.ts`
- `tests/breeding-acquisition.test.ts`
- `tests/breeding-candidates.test.ts`
- `tests/catalog-removal.test.ts`
- `tests/catalog-reset.test.ts`
- `tests/catalog-v20.test.ts`
- `tests/cloud-gateway.test.ts`
- `tests/cloud-sync.test.ts`
- `tests/collection.test.ts`
- `tests/controller.test.ts`
- `tests/cuisine-integration.test.ts`
- `tests/decorations-v2.test.ts`
- `tests/decorations.test.ts`
- `tests/economy-b-dom.test.ts`
- `tests/economy-b.test.ts`
- `tests/economy-v17.test.ts`
- `tests/food-system.test.ts`
- `tests/frisket-icy.test.ts`
- `tests/habitat-footprint.test.ts`
- `tests/habitats.test.ts`
- `tests/heart-spending.test.ts`
- `tests/hearts.test.ts`
- `tests/lab-actions.test.ts`
- `tests/lab-panel.test.ts`
- `tests/laboratory.test.ts`
- `tests/level-gates.test.ts`
- `tests/local-http-crypto.test.ts`
- `tests/missions.test.ts`
- `tests/new-species.test.ts`
- `tests/nursery-scenarios.test.ts`
- `tests/nursery-unlock.test.ts`
- `tests/nursery-v13.test.ts`
- `tests/paille-terre-art.test.ts`
- `tests/parcels-v6.test.ts`
- `tests/procedural-art.test.ts`
- `tests/progression-save.test.ts`
- `tests/progression.test.ts`
- `tests/purchasable-recipes.test.ts`
- `tests/purchase-birth-xp.test.ts`
- `tests/rabbit-art-fixtures.ts`
- `tests/rabbit-names.test.ts`
- `tests/rarities.test.ts`
- `tests/recipe-announcement.test.ts`
- `tests/recipe-policies.test.ts`
- `tests/recipe-privacy-dom.test.ts`
- `tests/recipe-privacy.test.ts`
- `tests/recipe-requirements.test.ts`
- `tests/recipe-shop.test.ts`
- `tests/representative-games.ts`
- `tests/simulation.test.ts`
- `tests/snk.test.ts`
- `tests/species-registry.test.ts`
- `tests/starter-pool.test.ts`
- `tests/travel-agency.test.ts`
- `tests/ui-dom.test.ts`
- `tests/ui-models.test.ts`
