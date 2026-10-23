# Livraison normale v5 publiée — 9 octobre 2026

**PR nº 2 fusionnée dans `production`** : application `7da76c747de6aec72cdcd3f1281bcf66dc2078d5`. [Publication et contrôles HTTPS réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37956243641), [preuve durable](validation/production-v5-2026-10-09.json), [captures et rapports publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37956243641/artifacts/11627499043) conservés jusqu’au 8 novembre 2026.

**Jouer : [jeu principal](https://sullivanlegoff-code.github.io/Project-L/). Tester : [laboratoire](https://sullivanlegoff-code.github.io/Project-L/dev/).** Normal et laboratoire v5, même révision `7da76c7`. Quinze espèces, neuf recettes et filtres ; île validée, douze décorations avec sélection, déplacement, rangement et vente, Aménagement/photo et cache statique conservés. Aucun nouveau visuel de lapin ni changement d’équilibrage.

Normal : aucun outil de temps ou ressources, même avec `?dev=1`. Laboratoire : onze scénarios dont collection quinze espèces et sept scénarios d’île/décorations, partie/horloge/préférences/secours séparés et bandeau permanent. Une seule publication pour quatre routes : Décorations v5 figé `85fe255`, Comptes v4 figés `3e70d9e`, stockages isolés. Branche Comptes/PR nº 1 conservées ; email/Supabase/SQL restent en pause. Aucun appel backend ajouté à la publication.

Avant fusion : [544 tests/14 fichiers, TypeScript et six parcours Chromium réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37955358594), [préflight quatre builds réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37955358771). Livraison : 544 tests actuels, 415 Comptes figés, 544 Décorations figées, TypeScript et quatre builds. Après déploiement : révisions, HTML, scripts et fonctionnalités des quatre routes contrôlés ; neuf groupes d’interactions normales réelles dont achat/annulation/vente atomique/rechargement, sept groupes laboratoire dont carnet Dragon exact Perroquet × Feu à 2 %, onze scénarios, conservation des clés normales et rechargement. Aucun hook, interception ou sauvegarde préchargée dans ces deux parcours HTTPS ; aucune erreur console/réseau.

Le joueur a confirmé le fonctionnement général sur iPhone avant intégration. Aucun détail de scénario, modèle ou version Safari supplémentaire déduit ; les parcours automatisés Chromium ne constituent pas un nouvel essai Safari physique.

Migration v4→v5 sur les mêmes clés avec secours, sans redotation ni effacement silencieux. Fermer les anciens onglets puis ouvrir le normal ; ne pas effacer les données Safari. Aucun transfert automatique depuis un espace de test. Pour un transfert volontaire, exporter source et destination puis importer avec confirmation dans la destination, ce qui remplacera sa partie. Les fichiers v5 restent incompatibles avec les comptes v4. [Migration et récupération](migration-v5.md).

Les sections suivantes sont les bilans historiques des étapes précédentes ; elles ne décrivent pas les sources actuelles du normal/laboratoire.

---

# Les quinze espèces — prévisualisation du 9 octobre 2026

**Publication vérifiée — quinze espèces :** sources Décorations `85fe255ec8e7e65213cd570f91f5bb1fe66a30d7`, [workflow 37949526936 réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37949526936). Quatre révisions, HTML et scripts servis contrôlés ; noms des quatre nouvelles espèces et filtres présents. Jeu/laboratoire `ae31131` v4 et comptes `3e70d9e` v4 conservés. [Preuve publique](validation/publication-species-2026-10-09.json). Aucun essai Safari physique revendiqué.


**Validation finale réussie :** [Actions 37949391700](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37949391700), application `85fe255ec8e7e65213cd570f91f5bb1fe66a30d7`, **544 tests / 14 fichiers**, TypeScript, build et six parcours Chromium (espèces/Dragon, stabilité/récupération, île, sélection/vente, aménagement, gestes/densité). [Bilan durable](validation/species-ci-2026-10-09.json), [captures/rapports CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37949391700/artifacts/11626120641), conservés 30 jours. Aucun essai Safari physique revendiqué.

| Identifiant stable | Nom | Types | Rareté | Obtention | Affection minimale des deux parents | Croissance |
|---|---|---|---|---|---:|---:|
| paille | Lapin Paille | paille | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| neige | Lapin Neige | neige | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| terre | Lapin Terre | terre | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| brumelin | Brumelin | paille + neige | peu commun | reproduction uniquement | 2 | 15 min |
| mottelin | Mottelin | paille + terre | peu commun | reproduction uniquement | 2 | 15 min |
| feu | Lapin Feu | feu | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| belier-gris | Lapin Bélier Gris | métal | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| volant | Lapin Volant | vol | commun | boutique : 80 pattes, ou reproduction | 2 | 5 min |
| lunettes | Lapin à Lunettes | métal + paille | rare | reproduction uniquement | 4 | 30 min |
| perroquet | Lapin Perroquet | vol + feu | rare | reproduction uniquement | 4 | 30 min |
| feu-glace | Lapin Feu Glacé | feu + neige | rare | reproduction uniquement | 4 | 30 min |
| bouee | Lapin en Bouée | paille + feu | rare | reproduction uniquement | 4 | 30 min |
| geant | Lapin Géant | terre + paille | épique | reproduction uniquement | 6 | 60 min |
| magicien | Lapin Magicien | métal + vol | épique | reproduction uniquement | 6 | 60 min |
| dragon | Lapin Dragon | vol + feu | légendaire | exactement Perroquet × Feu | 10 | 120 min |

L'achat d'un commun l'accueille immédiatement à l'affection 1 ; aucune croissance ni condition de niveau de joueur. Le minimum d'affection du tableau concerne uniquement la reproduction. Les types de la recette doivent tous être présents dans l'union des deux parents ; leurs espèces précises ne sont pas imposées, sauf Dragon qui exige exactement Perroquet et Feu dans un ordre indifférent. Les neuf espèces de reproduction ne sont jamais achetables, y compris avec un complément de cœurs.

Reproduction : gratuite (0 patte, 0 cœur), 20 minutes puis transfert manuel dans la nurserie libre, deux individus distincts d'affection au moins 2. La colonne croissance ne concerne pas les achats, qui sont accueillis immédiatement. Revenus identiques pour toutes les raretés : `12 + 2 × (affection − 1)` pattes/heure ; affection 1 à 20. Habitats universels et spécialisés existants, compatibilité par types, capacités et plafonds inchangés.

Les tables historiques paille/neige/terre restent la distribution **ordinaire**. Avec feu, métal ou vol : poids 40 par commun correspondant à un type présent, poids 20 pour chacune des six recettes ordinaires admissibles (Brumelin, Mottelin, À Lunettes, Perroquet, Feu Glacé, En Bouée), puis normalisation. Les seuils de chaque parent filtrent chaque recette, sans empêcher la reproduction ordinaire dès affection 2.

Hors garantie, réserver Géant 5 %, Magicien 5 %, Dragon 2 % quand admissibles, une seule fois par espèce ; multiplier chaque probabilité ordinaire par `1 − somme des chances spéciales`. Les spéciaux ne rejoignent jamais les poids ordinaires. Leur admissibilité, le calcul du tirage et l’affichage sont partagés dans `src/simulation/breeding.ts`.

| Parents et affection | Distribution hors garantie |
|---|---|
| Paille × Feu, 4/4 | Paille 40 %, Feu 40 %, Bouée 20 % |
| Paille × Terre, 6/6 | Paille 38 %, Terre 38 %, Mottelin 19 %, Géant 5 % |
| Bélier Gris × Volant, 6/6 | Bélier Gris 47,5 %, Volant 47,5 %, Magicien 5 % |
| Perroquet × Feu, 10/10 | Feu 39,2 %, Volant 39,2 %, Perroquet 19,6 %, Dragon 2 % |
| Géant + Magicien admissibles | 5 % chacun ; résultats ordinaires se partagent 90 % |

Garantie : groupe de six recettes ordinaires seulement. Après neuf échecs admissibles, la dixième tentative admissible est entièrement remplacée par une répartition égale des recettes ordinaires inconnues admissibles. Aucun commun, épique ou légendaire dans ce tirage. Une naissance épique/légendaire sur une tentative admissible compte comme un échec ; elle ne réserve pas une découverte ordinaire et son accueil ne remet pas le compteur à zéro. Les réservations ordinaires persistées restent intactes. Un résultat est tiré une seule fois au lancement et caché jusqu’à la fin de croissance ; découverte à l’accueil, affection initiale 1.

Collection : quinze entrées, filtres combinables par type, rareté et découverte, réinitialisation et message si aucun résultat. Les filtres restent lors des rafraîchissements et ne révèlent jamais un résultat en attente. Carnet : neuf recettes ; conditions des deux parents, espèces exactes pour Dragon, croissance, probabilités réelles et préparation sans paiement/tirage. Le nid indique les seuils 4/6/10 et utilise le même pool, garantie comprise.

Visuels provisoires des quatre nouvelles espèces : silhouette et animation existantes, couleur unie dans `src/ui/portraits.ts`/`COATS` par identifiant stable. Aucun accessoire, effet, aile, corne, taille ou animation spécifique ajouté. La fenêtre de découverte actuelle affiche nom, types et rareté. Les onze visuels précédents et l’île/habitats/décorations sont préservés. Les références visuelles seront traitées dans une étape future.

Sauvegardes v5 inchangées : pas de nouvelle dotation ni de migration structurelle. Les anciennes parties v1–v5 et les résultats/délais déjà lancés se conservent. Les nouvelles espèces sont reconnues par le catalogue ; une ancienne application limitée à onze identifiants ne peut pas lire ces nouveaux lapins. Exporter avant essais ; comptes v4 et autres routes restent isolés. [Récupération](migration-v5.md).

Dans Décorations : **Outils test → Collection — quinze espèces et recettes**, après confirmation uniquement. Trois habitats niveau 3, quinze espèces affection 10, nid/nurserie libres ; ressources de test préparées, aucune garantie permanente ou naissance forcée dans le jeu. Ce scénario n’ouvre pas de partie normale et ne lui donne aucun lapin.

Essai iPhone : garder un export ; charger volontairement le scénario ; combiner les filtres puis réinitialiser ; vérifier les conditions du carnet et préparer Dragon au nid (Perroquet/Feu, 2 % hors garantie) ; recharger une reproduction lancée sans nouveau tirage. Safari physique reste à vérifier.


Captures durables : [filtre épique + vol](validation/species-2026-10-09/collection-filter.png), [recette Dragon](validation/species-2026-10-09/dragon-recipe.png), [découverte existante](validation/species-2026-10-09/dragon-discovery.png), [collection mobile 667 × 375](validation/species-2026-10-09/collection-compact.png). [Rapport tactile](validation/species-2026-10-09/species-report.json). Le futur artefact v5 quatre routes a été [préparé et vérifié sans publication](validation/species-preflight-2026-10-09.json), avec les comptes v4 figés.
