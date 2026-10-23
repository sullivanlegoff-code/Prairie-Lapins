# Intégrer un nouveau lapin Rare standard

Procédure courte pour un Rare approuvé : reproduction uniquement, deux éléments requis, affection 2 chez chacun des parents, niveau 1, sans prix, cadeau, garantie ni pourcentage fixe. Aucun scénario par espèce, aucune branche par ID dans le moteur, aucun code d'interface.

## Fichiers à renseigner (trois)

1. **PNG** : copier sans retouche le design approuvé vers `public/assets/rabbits/<id>/<id>-v1.png`. Ne pas modifier le dossier source sous `docs/art-references/`.
2. **Définition canonique** : une ligne à la fin de `REGISTRY` dans `src/config/species.ts`, sur le modèle des Rares existants (`id`, `name`, `description`, `types` ordonnés, `acquisition` recette `requiredTypes` + `minAffection: 2`, `art` `static-sprite`, `progression: {unlockLevel: 1}`). Mesurer `width`/`height` du PNG, choisir `worldWidth`, et régler `groundY` pour que le contact au sol (`groundY - (height - dernière ligne opaque) × worldWidth / width`) reste entre 11 et 12. `preloadOrder` est le suivant de la liste.
3. **Fiche d'attentes indépendante** : une entrée dans `NEW_RARES` de `tests/rabbit-art-fixtures.ts`, écrite à la main depuis le design approuvé et non recopiée du registre : nom, description, types, `requiredTypes`, `art` (via `sprite(...)`), `source` (chemin sous `Design des lapins/Rare/`), `foot` (dernière ligne opaque du PNG) et `exactUnion` (deux espèces dont l'union fournit exactement ses éléments, avec le tirage exact attendu à affection 2/2, dans l'ordre du catalogue).

Tout le reste se déduit de cette fiche : listes et compteurs du catalogue, raretés, niveaux, art et ordre de préchargement, acquisition, parcours paramétré (`tests/rare-journeys.test.ts` : sauvegarde, transfert, croissance, accueil, confidentialité), oracle des distributions, PNG identique, libellés du laboratoire et sélecteur « Lapins de test ».

## Quand une fiche existante doit aussi changer

- Si les éléments du nouveau Rare rejoignent l'union exacte d'un autre Rare, mettre à jour l'`exactUnion` de ce dernier : le pool exact change réellement.
- Idem pour les trois scénarios existants de `tests/laboratory.test.ts` (Pic Pic, Améthyste, Ardent/SNK) dont les poids exacts sont écrits dans le test.
- Un Rare hors du standard (prix, cadeau, garantie, parents précis, affection différente) demande une décision du propriétaire : ne pas l'ajouter à `NEW_RARES` sans étendre `STANDARD_RARE` ou la fiche.

## Commandes (depuis `prairie-lapins-prototype`)

```powershell
npm run typecheck
npm test                 # suite complète ; ciblé : npx vitest run tests/rare-journeys.test.ts tests/species-registry.test.ts
git diff --check
npm run build:netlify    # un seul build, avec verify-production
```

Construire une fois à la fin ; le dossier `netlify-site/` est ignoré par Git. Ne pas publier. La révision du build porte le suffixe `-modifie` tant que des modifications non commitées existent.

## Contrôle Chromium ciblé (build compilé, sans scénario dédié)

1. Servir `netlify-site/` (preview existant sur `http://localhost:5174/dev/?dev=1`).
2. Paramètres → section **« Lapins de test »** : choisir l'espèce, un habitat compatible avec place, **« Ajouter à la partie de test »**. Le lapin est un adulte à l'affection initiale ; ajouter les éléments nécessaires avec les mêmes boutons, nourrir si l'affection 2 est requise.
3. Vérifier : sélecteur contenant l'espèce, rendu dans le monde sans découpe et à bonne échelle, portrait de collection (dimensions, description après découverte), paire préparée au Nid avec les probabilités attendues, aucune erreur de page.
4. Un essai iPhone n'est pas systématique : seulement sur demande du propriétaire.
