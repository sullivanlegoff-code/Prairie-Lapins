# Pièce principale

La pièce originale est un PNG RGBA de 1254 × 1254, conservé sans redessin dans `public/assets/currency/coin.png`. Il sert également de source : aucune compression destructive ou transformation de l’illustration. Le contour extérieur est transparent ; les quatre angles sont transparents. La patte centrale et les quatre petits coussinets restent distincts aux tailles d’interface de 18 à 28 px. Le dessin ne contient ni texte ni emoji.

`src/display/currency.ts` centralise les nombres français, les signes, les stocks, les images et le libellé masqué « pièces ». Les groupes sont insécables. Les textes existants sont transformés en nœuds texte et images, jamais interprétés comme HTML. Les clés `pattes`, les fichiers JSON, les transactions et l’économie restent identiques. Les noms historiques dans les modèles ne sont pas affichés directement.

`src/display/currencyPhaser.ts` réutilise la même texture et le même format numérique pour les bulles de récolte. La texture est chargée une seule fois par scène. Les autres bulles et les priorités tactiles sont conservées.

Le compteur, les prix, revenus, stocks, missions, confirmations, notifications, guidage, import et boutons du laboratoire utilisent la pièce. Les cœurs et l’herbe gardent leur présentation. Les anciennes prévisualisations sont construites depuis leurs références figées.

## Vérification reproductible

- `npm test` : tests de simulation existants et deux contrôles de présentation (groupement/signes/stocks/accessibilité, texte importé sûr et remplacement sans duplication).
- `npm run typecheck` ; `npm run build:pages` : normal et laboratoire.
- `docs/coin-public-check.cjs` : commandes réelles sur builds ou site public, 667 × 375 et 390 × 844, compteur/prix/missions, vente annulée, confirmation mixte pièces/cœurs, montants regroupés, images chargées, groupes insécables et absence de l’ancien nom visible.
- Les parcours navigateur existants utilisent désormais les noms accessibles « pièces ». Leurs clés et les données de test restent inchangées.
- Les contrôles de publication exécutent également les autres parcours et les builds des deux prévisualisations figées.

Les captures sont des contrôles Chromium tactiles. Aucun essai physique Safari n’est revendiqué.


Les [captures et résultats publics](proofs/currency-coin/README.md) sont archivés dans le dépôt.
