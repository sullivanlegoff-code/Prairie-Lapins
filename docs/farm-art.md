# Ferme — moulin à tête de Miffy

## Référence et adaptation

Référence unique : [Ferme.png sur main](https://github.com/sullivanlegoff-code/Project-L/blob/bfa5b3940b0b9166c1286a2b2b7148070c3a9a98/Ferme.png), blob `eb2da64d26c95e2f8e95cfc020396eef1658b192`.
[Original conservé sans modification](references/farm/Ferme-original.png). Aucun code de main n'a remplacé production.

[Comparaison référence / adaptation](proofs/farm/farm-reference-comparison.png).
L'asset a été adapté avec un outil d'édition d'image à partir de cette référence et du style de l'île, sans dessin de substitution générique.
Le moulin crème au toit rose et son drapeau, les quatre pales en bois, la tête de Miffy au moyeu, le potager à droite, la clôture, le portillon et les pas japonais restent reconnaissables. Le fond crème et la tranche de terre flottante sont retirés ; un petit sol de jardin et des bords doux permettent de le poser dans la prairie. Les pales restent statiques.

## Intégration limitée au visuel

- PNG RGBA 1254 × 1254 : [farm-windmill.png](../public/assets/buildings/farm-windmill.png), blob `7d327382bf7714b8f32fc50ee08ebb7eb4b94ff5`.
- Une texture préchargée et partagée, largeur de dessin 156 unités, origine (0,5 ; 0,70). Même texture et même recalage pour toutes les fermes posées et les aperçus d'achat/déplacement. Aucune génération graphique de ferme par image.
- Empreinte logique 4 × 4 petits carrés, coordonnées, collisions et sélection logique conservées. Pas de modification des limites de caméra, de Recentrer ou de Vue d'ensemble.
- Bulle de récolte de la ferme placée dans la partie avant de son jardin (+38 unités), sous la tête centrale et au-dessus de son nom. Sa zone tactile reste dans sa propre empreinte pour ne pas intercepter la sélection d'une ferme immédiatement au nord. Les indicateurs de production et le temps restant du panneau restent ceux du jeu existant.
- Aucun visuel de ferme n'existait dans les cartes d'interface textuelles : pas de nouvelle vignette ni de changement des autres illustrations.
- Aucune modification des commandes, prix, délais, herbes, XP, missions, aides, niveaux ou sauvegardes v9. Supabase reste en pause.

Le contrôle des builds et celui des pages publiques comparent les octets du PNG livré à son blob Git ; les deux modes doivent servir l'adaptation exacte. Les deux prévisualisations historiques gardent leurs sources figées.

## Contrôle ciblé reproductible

`node docs/farm-art-browser-check.cjs <racine construite> <révision>`, depuis le projet après installation de Playwright/Chromium. Le modèle de cadrage de test est compilé depuis le module pur de caméra existant ; aucun hook dans le jeu, aucune écriture directe de sauvegarde ou ajout de ressources. La fixture du laboratoire est choisie par ses commandes existantes.

Le parcours vérifie le PNG transparent (53,94 % de pixels totalement transparents, aucun pixel opaque sur le bord), l'annulation d'un placement normal, le déplacement d'une ferme en production annulé puis confirmé, une deuxième ferme voisine, les états libre/en production/prêt, le coût de construction 60 et ses 20 XP, une commande à 10 pièces pour 20 herbes en 5 minutes, zéro XP au lancement/à la récolte, les sélections distinctes avec voisinage horizontal et vertical (y compris le bord avant d'une ferme au nord d'une récolte prête), le rechargement et l'isolation normal/laboratoire. Seul le temps du laboratoire est avancé, par son bouton existant. Une requête de texture pour les deux fermes est exigée avant puis après rechargement.

Captures Chromium tactile simulé :
- [Deux fermes, paysage](proofs/farm/farm-852-normal.png).
- [Deux fermes, portrait](proofs/farm/farm-390-normal.png).
- [Production et temps restant](proofs/farm/farm-running-landscape.png).
- [Récolte prête et tête dégagée](proofs/farm/farm-ready-landscape.png).
- [Aperçu de déplacement](proofs/farm/farm-moving-preview.png).

Les preuves du run ciblé contiennent aussi les zooms 0,4 / 1,05 / 1,65 dans les deux orientations. Au zoom éloigné, les petits traits du visage s'atténuent ; la silhouette du moulin et la tête blanche restent distinctes. Les seuils de masquage existants des étiquettes/bulles aux faibles zooms restent inchangés. Aucun test Safari physique revendiqué.

La validation obligatoire du candidat puis le déploiement vérifient la révision réellement servie et les parcours publics. La publication n'est confirmée qu'après ces contrôles.

Revue ciblée réussie : [run 38912735544](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38912735544), candidat applicatif `d29852e`. Les captures ci-dessus proviennent de ce run. Le commit de livraison ajoute les preuves et les contrôles obligatoires sans nouvelle modification des sources applicatives ni de l'asset.

## Reprise du contrôle public après publication

Le candidat applicatif a été fusionné par la PR24 en `5a55a2e`. La CI obligatoire [38913734041](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38913734041) a réussi : 1 020 tests, TypeScript, deux builds et contrôles navigateur, dont la ferme.

Le déploiement [38916097585](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38916097585) a servi la bonne révision et le PNG exact dans les deux modes, prévisualisations figées conservées. Son contrôle public de Vue d'ensemble a ensuite photographié le canvas avant la fin du préchargement Phaser : page crème entière, pas un débordement du moulin. Le [diagnostic 38917275526](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38917275526) conserve la capture initiale et reproduit ce même état en retenant la requête PNG ; après libération et chargement, le cadrage et l'eau sont corrects.

Correction de contrôle `06986df` : attendre la fin des transferts réseau et deux trames de rendu avant les commandes de caméra, au lieu de considérer la seule sauvegarde comme preuve du rendu prêt. Les assertions de pixels, cadrage, placement, gestes et sauvegardes sont inchangées. Aucune modification applicative ni délai arbitrairement augmenté. Reprise ciblée et contrôles publics restants : [38917550963](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38917550963). Il reste à confirmer la CI de cette correction puis la publication finale ; la preuve finale sera enregistrée dans les PR.
