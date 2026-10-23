# Prairie de lapins

Jeu de collection et de gestion de lapins, développé avec Phaser 3, TypeScript et Vite. Le joueur aménage son jardin, agrandit et améliore ses habitats, nourrit et élève ses lapins, complète sa collection et ses missions, et débloque des recettes et des améliorations grâce à sa progression.

## Sauvegardes

Le format actuel est la version 16. Les sauvegardes des versions 1 à 15 ne sont pas compatibles avec cette version du jeu. Les données de partie sont stockées localement dans le navigateur.

## Développement

Prérequis : Node.js et npm.

```sh
npm ci
npm run dev
```

Vite affiche l’adresse locale à ouvrir. Ajouter `?dev=1` pour accéder au laboratoire de développement.

## Vérifications et builds

```sh
npm test
npm run typecheck
npm run build
npm run build:netlify
```

`npm run build:netlify` crée un site de production local dans `netlify-site/` ; cette commande ne le publie pas. Les commandes de build incluent la vérification TypeScript.
