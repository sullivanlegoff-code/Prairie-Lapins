# Recettes de reproduction — parcours actuel

Décision précisée le 27 octobre 2026 : **aucune paire ne donne de lapin commun, sauf deux parents eux-mêmes communs du même type**. Par exemple, deux Feu peuvent donner Feu. Les paires mixtes et les paires rares, épiques ou légendaires excluent également les résultats communs. Les autres résultats doivent toujours respecter leurs recettes et leurs conditions existantes.

Les probabilités fixes des Épiques et Légendaires, leurs bonus d'affection et la garantie ordinaire conservent leurs règles. Une recette spéciale n'est jamais ramenée à 100 % faute de résultat ordinaire : le lancement est alors refusé. Une naissance déjà tirée et enregistrée avant ce changement, même commune, conserve son identité, son espèce et sa croissance et reste accueillable.

La boutique présente uniquement les sept recettes payantes du catalogue, dans un ordre stable : nom, types, rareté et prix en pièces. Une carte est disponible, verrouillée par le niveau, ou déjà dans le carnet. Une découverte révèle gratuitement sa recette et retire le bouton d'achat. Le portrait reste anonyme tant que l'espèce n'a pas été découverte, même après l'achat de sa recette.

Une explication courte précise ce qui est acheté : les parents et leurs conditions, pas le lapin. L'achat demande une confirmation et conserve les prix de 450 ou 900 pièces. Aucun complément en cœurs, tirage ou lancement de reproduction n'est ajouté. Si la sauvegarde échoue, ni paiement ni recette ne sont validés.

Après l'achat, la carte reste au même endroit et propose « Consulter et préparer ». Ce bouton ouvre la bonne recette dans le carnet, avec les conditions et les paires conseillées. « Préparer cette paire au nid » sélectionne les parents ; seul le geste final « Croiser » lance une reproduction. Les règles avancées de garantie et de probabilités sont repliées sous « En savoir plus ». Les probabilités des paires gardent le calcul exact de la simulation.

Le carnet complet reste accessible depuis la boutique, la Collection et le Nid. Les recettes inconnues n'exposent jamais leurs parents, leur affection minimale, leurs probabilités ou leurs paires, même dans des détails fermés. Les paires connues restent chargées sur demande, trois à la fois avant « Voir plus ».

Le défilement et le focus sont conservés après un achat, un refus de sauvegarde ou une annulation. L'ouverture d'une recette amène le focus sur son titre. Ces comportements sont couverts dans `tests/recipe-shop.test.ts`, avec la confidentialité dans `tests/recipe-privacy-dom.test.ts` et le calcul différé dans `tests/notebook-performance.test.ts`.
