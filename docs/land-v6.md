# Île à neuf parcelles — sauvegarde v6

Jeu : https://sullivanlegoff-code.github.io/Project-L/ ; laboratoire séparé : https://sullivanlegoff-code.github.io/Project-L/dev/.

Le centre possède neuf cases de bâtiments. Huit parcelles de neuf cases sont immédiatement disponibles, y compris les diagonales, dans n’importe quel ordre. Le nième achat coûte 500 × n pattes : 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000. Le mode « Agrandir l’île » affiche les choix, un aperçu et une confirmation. Aucun terrain intermédiaire n’est acheté automatiquement. Un prix devenu obsolète est refusé et doit être confirmé à nouveau ; le complément en cœurs reste explicite.

Les douze objets achetables sont extérieurs. Coussin, jouets et parasol occupent 1 × 1 case fine ; tunnel 2 × 1, tournable. Identifiants, prix et revente sont conservés : 50 % des pattes, arrondi inférieur, aucun cœur. Une empreinte peut traverser deux parcelles acquises, mais jamais l’eau, un bâtiment ou une autre décoration. Les bâtiments refusent les objets gênants ; déplacement ou rangement restent des actions manuelles. Les graphismes intégrés aux habitats sont conservés. Toucher un objet ouvre ses actions ; Aménagement privilégie les objets, mode photo n’ouvre aucun panneau et glisser/pincer ne sélectionne pas.

## Conversion unique

Les formats 1 à 5 passent directement en v6, sans redotation. `acquiredParcels` remplace les anciens indicateurs : centre seul, centre + est pour une ancienne extension, centre + est + ouest pour deux. Bâtiments : x ancien 0…5 → x + 3 ; 6…8 → x − 6 ; y → y + 3. Objets extérieurs : x fin < 24 → x + 12 ; sinon x − 24 ; y fin → y + 12. Une empreinte traversant l’ancienne limite est/ouest est rangée entière dans l’inventaire.

Tous les anciens objets intérieurs sont rangés avec leur identifiant, sans achat, remboursement ou perte. Un message unique indique le nombre d’objets rangés. Individus, affection, découvertes, missions et récompenses déjà obtenues, travaux, revenus fractionnaires, résultats et échéances de reproduction sont préservés. La mission d’extension accepte toute première parcelle supplémentaire et ne redonne jamais une récompense déjà réclamée.

Les clés de stockage normal et laboratoire restent distinctes. Le JSON source v5 est conservé avant v6 ; un échec d’écriture garde le secours et la source. Exporter une partie v6 ne la rend pas compatible avec les anciens clients. Décorations reste figé en v5 et Comptes en v4, sans intervention email/Supabase/SQL. Un import volontaire remplace uniquement la destination après confirmation ; pas de transfert automatique entre espaces.

## Vérifications

569 tests : huit acquisitions en plusieurs ordres, coûts, prix obsolète, refus, complément en cœurs, placements des douze objets, rotation, collision, vente, migrations des trois anciennes tailles, exemplaires intérieurs et traversée discontinue, rechargement et import/export. TypeScript et builds normal/laboratoire contrôlés. Parcours Chromium : diagonale sans intermédiaire, annulation/double confirmation, île en L et complète, sélection tactile des douze objets, glisser/pincer/photo/bulles, vente atomique ; builds normaux et laboratoire sans injection, quinze espèces et quatorze scénarios isolés.

Le terrain utilise des textures statiques par parcelle, au plus 708 × 624 unités et résolution ≤ 2. Le cache conserve les textures des parcelles dont le voisinage et les bâtiments restent identiques. L’eau est un fond statique : pas de grande texture animée ni de coût permanent de recalcul du terrain. Les règles, silhouettes et animations des quinze espèces sont inchangées.

Les contrôles Chromium ne remplacent pas un essai Safari physique. Sur iPhone : fermer les anciens onglets, rouvrir le jeu sans effacer les données Safari ; vérifier l’éventuel message de conversion ; ouvrir « Agrandir l’île », annuler puis acheter une diagonale ; placer et tourner le tunnel, sélectionner/déplacer/ranger un objet, annuler puis confirmer une vente ; recharger et vérifier inventaire/ressources.

## Captures et mesure ciblée

[Centre en paysage mobile](validation/land-v6/centre.png) · [forme partielle en L](validation/land-v6/partial.png) · [île complète](validation/land-v6/full.png). Captures Chromium des sources validées `cc4bfdf`, avec les seuls hooks de test injectés dans le serveur local. Les vues partielles/complètes utilisent une fenêtre de vue d’ensemble ; le cadrage et l’échelle du jeu mobile restent inchangés. [Sélection et caméra aux quatre diagonales](validation/land-v6/remote-parcels-report.json).

La CI mesure 40,5 ms au total pour trois commandes successives (achat d’objet, construction, achat d’une parcelle détachée), rendu et sauvegarde compris. Elle confirme la conservation des textures pour l’achat d’objet et la parcelle détachée, et la reconstruction de celle modifiée par le bâtiment. Trois textures mesurées de 1416 × 1248 pixels. Cette mesure Linux/Chromium sert au contrôle ciblé du cache, pas à une estimation des images par seconde sur iPhone.
