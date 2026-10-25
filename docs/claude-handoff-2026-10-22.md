# Passation Codex → Claude — 22 octobre 2026

Le propriétaire reprend maintenant avec Claude. Un seul agent travaille sur le dépôt à la fois. Aucun chantier restant autorisé : attendre sa prochaine mission, sans audit global.

## Point de reprise

- Projet actif : `<racine-du-depot>` ; racine Git : dossier parent.
- Branche : `feature/purchasable-recipes`.
- Dernier commit de code et build jeu/laboratoire : **e99dab8d42f5cc34a0629ce4e9fcf7f46e8ac993**.
- Le commit contenant ce document est documentaire seulement ; il ne nécessite pas une reconstruction du jeu.
- Dernier retour du propriétaire : **« Pic Pic fonctionne. »** Aucun détail supplémentaire sur l'appareil ou les contrôles effectués : ne pas extrapoler une campagne Safari/iPhone complète.
- Commencer par `git status --short`, les consignes locales et les derniers commits. Le code et les commits récents font foi sur les anciennes passations de `progress.md`.

## Architecture et contenu actuels

- `src/config/species.ts` est l'autorité des 20 espèces, de leur ordre, progression, acquisitions, recettes et art. Les IDs, listes de compatibilité, métadonnées de sprites et politiques du carnet/garantie sont dérivés.
- Les recettes utilisent `requiredTypes`, indépendamment des types affichés. Éléments et parents exacts se combinent par ET ; pas de fallback implicite. Une recette sans condition est invalide.
- Les candidats viennent du catalogue ; la pondération historique reste en configuration. Ne pas réintroduire de liste fermée de résultats. L'exception d'affection historique est localisée aux recettes concernées.
- Les modes artistiques sont discriminés : `static-sprite` sans coat ; `procedural` exige son coat. Monde et portraits utilisent le registre ; `COATS` reste une vue de compatibilité.
- `validateSpeciesEntries` examine les entrées avant lookup (doublons détectables), références, recettes, acquisition, politiques, art et description facultative.
- Les descriptions ne sont révélées dans la collection qu'après découverte. La connaissance d'une recette seule ne révèle pas la description.
- Prix de carnet, cadeau et garantie sont des politiques explicites des sources recipe. Absence = aucune politique. Le cadeau de migration v10 est historiquement figé à Brumelin. Sauvegardes actuelles v13.

## Contenus approuvés intégrés

Tous les nouveaux lapins ci-dessous sont Rare, niveau requis 1, reproduction uniquement, affection minimale 2 chez chacun des parents, croissance 30 minutes et XP de naissance 70. Aucun prix, cadeau, garantie, parent exact ou pourcentage fixe. Les éléments peuvent être réunis sur un seul parent. PNG copiés sans retouche depuis les références approuvées.

| ID | Types affichés ordonnés | Dimensions PNG | worldWidth / groundY / preloadOrder |
| --- | --- | --- | --- |
| frisket | neige, paille | 1227 × 1282 | 52 / 12 / 6 |
| icy | paille, neige | 1215 × 1295 | 48 / 12 / 7 |
| ardent | feu, paille | 1312 × 1199 | 52 / 13 / 8 |
| snk | paille, feu | 1402 × 1122 | 56 / 15,5 / 9 |
| pic-pic | vol, neige | 1254 × 1254 | 54 / 12,5 / 10 |

Les sources approuvées et le classeur sont sous `docs/art-references/Design des lapins/`, protégés. Ligne du classeur = type 1, colonne = type 2. Pour Pic Pic, le pelage du PNG prévaut sur l'ancienne mention violet. Aucun autre design n'est autorisé à l'intégration par sa seule présence ou sa couleur verte dans le classeur.

## Comportement actuel, distinct de la cible produit

Lire `docs/rabbit-breeding-rules.md` : ce document non suivi décrit surtout des règles futures, pas une conformité actuelle.

- Union élémentaire exacte Paille + Neige, ordre des parents indifférent : **Frisket 50 % / Icy 50 %** dès affection 2, de façon permanente. Politique de pool Rare admissible déclarative, pas une liste d'espèces ni un cadeau scripté. Les unions avec un troisième élément restent historiques.
- Paille + Feu à affection 2 : poids **Paille 40, Feu 40, Ardent 20, SNK 20**, soit 1/3, 1/3, 1/6, 1/6.
- À affection 4, Bouée rejoint avec poids 20 : probabilités 2/7, 2/7, 1/7, 1/7, 1/7. Si la garantie historique se déclenche pour Bouée non découverte, elle peut imposer Bouée à 100 % ; les nouveaux Rares ne sont pas garantis.
- Vol + Neige à affection 2 : **Neige 40 % / Volant 40 % / Pic Pic 20 %**. Aucune nouvelle politique Rare uniquement.
- Les Communs restent reproductibles hors politique exacte Paille + Neige. Terre et Uncommon sont conservés. Les seuils et probabilités historiques des autres espèces, dont Dragon, sont inchangés.
- Les anciennes naissances Commun/Brumelin restent rechargeables et accueillables sans nouveau tirage. Aucun changement de version de sauvegarde.
- Le Nid ne généralise plus affection 4 aux Rares. Le carnet annonce la garantie à partir de `guaranteeEligible`, pas de l'absence de probabilité spéciale. Confidentialité préservée.
- Ne pas appliquer spontanément les futures règles Épiques, Mythique, exclusion globale des Communs ou rééquilibrage de garantie.

## Laboratoire compilé et preview à conserver

- Build local : `netlify-site/`, ignoré par Git. Jeu à `/`, laboratoire à `/dev/`.
- Preview existant **PID 29584**, port **5174**, host `0.0.0.0`, sert `netlify-site`. Ne pas l'interrompre inutilement.
- URL LAN vérifiée lors du dernier checkpoint : **http://192.168.1.13:5174/dev/** (Wi-Fi du PC ; vérifier l'IP si réseau changé).
- Jeu et laboratoire : `build-revision.txt` = **e99dab8d42f5cc34a0629ce4e9fcf7f46e8ac993** ; réponse HTTP LAN vérifiée identique.
- Scénarios accessibles depuis Paramètres, partie et horloge isolées :
  - `frisketIcy` : Frisket/Icy adultes découverts, affection 2.
  - `ardent` : « Ardent et SNK — découverte et reproduction », quatre adultes Ardent/SNK/Paille/Feu, affection 2, joueur niveau 5, habitat universel niveau 2 avec une place libre.
  - `picPic` : « Pic Pic — découverte et reproduction », Pic Pic/Neige/Volant adultes découverts, affection 2, joueur niveau 9, habitat universel niveau 2 avec deux places libres.
- Nid libre, Nurserie vide, durées normales ; pas d'aide d'initiation dans ces fixtures. Aucun don artificiel de connaissance des recettes : seules les découvertes les révèlent.
- D'anciens previews temporaires hors dépôt existent aussi sur 5185/5186 ; ne pas les confondre avec le build LAN 5174.

## Vérifications et artefacts

- Intégration Pic Pic (`34b35de`) : **1740 tests / 96 fichiers**, dont comparaison indépendante de **32 400 distributions ordonnées**. Typecheck, diff-check, identité binaire des PNG et build frais jeu/laboratoire hors dépôt réussis (47/43 fichiers vérifiés). Chromium monde, portrait, parent au Nid, cristaux entiers, aucune erreur.
- Dernier scénario (`e99dab8`) : **45 tests ciblés**, typecheck et diff-check réussis ; pas de nouvelle suite complète pour ce seul ajout de fixture. Chromium avant commit et sur le vrai build compilé : vrai sélecteur, rendu, portrait, Neige/Volant puis Pic Pic/Neige sélectionnables, 40/40/20, aucune erreur.
- `build:netlify` exécuté après commit, `verify-production` jeu/laboratoire réussi (47/43 fichiers), cuisine isolée et musique partagée vérifiées.
- Captures/rapport du dernier scénario : `%TEMP%\prairie-pic-pic-scenario-proof\` (`world.png`, `portrait.png`, `commons-parents.png`, `pic-pic-parents.png`, `parent-portrait.png`, `report.json`). Script hors dépôt : `%TEMP%\pic-pic-scenario-browser.cjs`.
- Intégration Pic Pic : `%TEMP%\prairie-pic-pic-proof\` ; précédents contenus : `%TEMP%\prairie-snk-proof\`, `%TEMP%\prairie-ardent-proof\`.
- Aucun essai iPhone réalisé par Codex, aucune publication. Le retour du propriétaire sur Pic Pic est consigné plus haut.

## État Git et précautions de reprise

Entrées préexistantes à préserver intégralement, jamais à inclure en bloc dans un commit de mission :

```text
 M ../.gitignore
 M docs/progress.md
?? docs/_debug-guided.cjs
?? docs/art-bible-buildings.md
?? docs/art-references/
?? docs/rabbit-breeding-rules.md
```

`progress.md` contenait déjà des modifications anciennes protégées ; cette passation y ajoute seulement un lien en tête, sans indexer ses changements préexistants. Le présent document est commité séparément. Préserver également `../.claude/`, tous les assets/références et les sauvegardes normales.

Aucun GitHub (compte suspendu), push, publication Netlify, `git add -A`, reset ou clean global. Pas de `dist/` suivi dans les commits de ces missions. Indexer explicitement les fichiers concernés. Ne pas affaiblir les assertions ; signaler les attentes adaptées aux nouveaux contenus. Le propriétaire ne demande pas de prochain chantier dans cette passation.
