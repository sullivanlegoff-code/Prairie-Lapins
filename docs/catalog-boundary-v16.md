# Frontière de catalogue — sauvegarde v16

Décision du propriétaire : les parties de développement peuvent être réinitialisées. Le type **Terre**, son habitat et les espèces **Terre, Mottelin, Géant et Brumelin** sont retirés du jeu. Aucune conversion des exemplaires existants n'est faite.

## Mécanisme (le plus simple)

- `SAVE_VERSION = 16` (`src/persistence/json.ts`). Un seul schéma, sans chaîne de migration.
- `decodeGame` refuse toute version entière de 1 à 15 avec la raison `INCOMPATIBLE_CATALOG` ; une autre version inconnue (par exemple 17) reste `UNSUPPORTED_VERSION` ; un fichier v16 invalide (espèce retirée, par exemple) reste `INVALID_STATE`.
- **Au chargement** (`GameController`) : une sauvegarde `INCOMPATIBLE_CATALOG` n'est ni lue, ni convertie, ni restaurée. Une nouvelle partie valide est créée et écrite par le chemin d'écriture habituel (échecs d'écriture inchangés : la partie reste en mémoire, l'ancienne sauvegarde reste en place, « Réessayer » fonctionne). `Snapshot.catalogReset` vaut `true` pour cette session ; l'interface affiche un message dismissible (`#catalog-reset-notice`) et `main.ts` relance le guidage de nouvelle partie.
- **Normal et laboratoire** : le contrôleur lit et écrit seulement sa propre clé (`prairie-lapins.save.v1`, préfixée en laboratoire). Rien d'autre n'est touché : ni préférences, ni autres clés, ni `localStorage` en bloc.
- **Import** : `prepareImport` renvoie `INCOMPATIBLE_CATALOG` (message dédié dans `SavePanel`) avant toute modification ; la partie en cours et sa sauvegarde ne changent pas.
- Les anciennes copies `prairie-lapins.backup.before-v*` éventuellement présentes dans un navigateur sont des clés orphelines : plus lues, plus proposées, plus supprimées.

## Contenu retiré

Espèces (`src/config/species.ts`), type `terre` (`RABBIT_TYPES`), habitat « Terrier de terre », achat/déblocage `terre`, missions « Découvrir Terre » et « Découvrir Brumelin », recette offerte au départ (Brumelin), table historique d'affection Brumelin/Mottelin, poids historiques propres à Terre, rendu procédural de Brumelin/Mottelin, image `public/assets/rabbits/terre/`.

## Effets sur la reproduction et la progression

- Frisket/Icy restent 50/50 (union Paille + Neige, Rares uniquement).
- Les autres unions gardent leurs poids bruts ; Brumelin, qui appartenait aux unions de trois éléments contenant Paille et Neige, en sort sans redistribution (renormalisation automatique). Magicien et Dragon gardent conditions et probabilités.
- La garantie ordinaire compte désormais Lunettes, Perroquet, Feu Glacé et Bouée.
- Plus aucune recette offerte au départ (`GIFTED_RECIPES` vide) : le carnet d'une nouvelle partie est vide.
- Les récompenses « Découvrir Terre » (50 pattes) et « Découvrir Brumelin » (1 cœur) disparaissent ; aucune compensation. Seuils et récompenses des autres missions inchangés.
- Les droits d'achat par niveau ne changent pas : Feu 5, Bélier Gris 7, Volant 9.

Les fichiers `docs/test-saves/*.json` décrivent d'anciennes parties de test (v2 à v4) : ils ne se chargent plus.
