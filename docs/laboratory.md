# Laboratoire complet — 26 octobre 2026

Le laboratoire n'a jamais accès aux comptes ni à la sauvegarde en ligne et n'initialise jamais le SDK Supabase.

Ouvre le jeu local avec `?dev=1`, puis **Paramètres → laboratoire**. Dans le build de test (`/dev/`), ouvre simplement **Paramètres**. Le jeu normal publié n’inclut pas ces outils : son paramètre `?dev=1` ne les active pas. Le mécanisme d’import conditionnel existant est conservé. Partie, horloge, préférences et secours restent isolés sous le préfixe du laboratoire. Aucun transfert depuis ta vraie partie n’est automatique.

Les outils sont organisés en sections repliables, avec champs et sélecteurs adaptés au téléphone, cibles d’au moins 44 px, papier du carnet et boutons en pierre existants. Chaque action affiche un résultat dans le statut du laboratoire. Les modifications d’état passent par `replaceTestState` et l’import transactionnel : validation et sauvegarde avant remplacement, sans récompense d’import.

- **Ressources** : fixe exactement tes pièces, ta nourriture et tes cœurs avec un champ entier et « Appliquer ». Les raccourcis ajoutent 1 000 ou 10 000 ; « Beaucoup (1 000 000) » fixe le stock à un million. Les valeurs négatives, fractionnaires ou dépassant les entiers sûrs sont refusées.
- **Niveau du joueur** : choisis directement de 1 à 30. L’XP total correspond au début de ce niveau ; ses récompenses sont considérées comme reçues et aucun cœur n’est ajouté. Les boutons +50 / +500 XP conservent la progression et les récompenses ordinaires.
- **Temps** : conserve les sauts +5 / +20 / +60 / +360 / +1 440 minutes. « Terminer tous les délais maintenant » rend prêts cultures, reproduction au nid, croissance en nurserie, voyages, cadeau de cœurs et ouverture de la quotidienne suivante. Récolte, transfert, accueil et réclamation restent manuels ; aucune monnaie ni récompense n’est encaissée. Les voyages gardent leur durée entière et leur récompense.
- **Lapins — Boutique de test** : les 35 espèces sont groupées par rareté avec portrait et icônes d’éléments. Choisis une affection commune entre 1 et 20, puis « Ajouter » ou « Un exemplaire de chaque espèce » (35 ajouts, en plus des individus déjà présents). Chaque lapin est découvert et rejoint automatiquement un habitat compatible ayant une place libre. À défaut, un enclos universel de niveau 3 est créé gratuitement, avec son empreinte réelle ; les extensions nécessaires sont acquises. Le statut annonce ces créations. Une île entièrement occupée peut refuser l’ajout sans changement partiel. Le placement manuel dans un habitat existant reste disponible séparément. « Toutes les recettes connues » renseigne le carnet ; « Oublier les recettes achetées » conserve cadeaux et découvertes, sans remboursement.
- **Affection** : sélectionne un individu par son nom personnel ou son espèce, avec son habitat et son identifiant. Fixe son affection de 1 à 20, ou celle de tous les lapins à 2 / 10 / 15 / 20. Au-delà de 14 sans Statue de l’Affection, le statut signale la dérogation de test. Abaisser sous 2 un parent en reproduction rend sa naissance prête pour conserver un état valide.
- **Bâtiments et île** : construis gratuitement ferme (deux au maximum), Cuisine, agence, Statue de l’Affection, nid, nurserie et chaque type d’habitat. Les limites de bâtiments uniques restent respectées. Fixe séparément chaque ferme à 1/2, l’agence à 1/2/3 et chaque habitat à 1/2/3 avec l’empreinte correspondante. Un habitat agrandi peut être déplacé automatiquement sur une case libre et le terrain étendu ; aucun autre objet n’est déplacé. Réduire une capacité occupée, un stockage trop rempli, une ferme portant une culture avancée ou une agence ayant trop de voyageurs est refusé avec une explication : récolte, accueille ou déplace d’abord les occupants. Choisis 1–4 coussins de nurserie, puis applique. « Acheter toutes les extensions » acquiert gratuitement les neuf parcelles.
- **Missions et guidage** : rends toutes les missions principales ou les quotidiennes prêtes sans payer les récompenses ni effacer les réclamations déjà faites. Après réclamation d’une quotidienne, le délai normal de la suivante revient ; utilise l’outil de temps pour le terminer. « Nouveau cycle quotidien » ouvre un cycle neuf, progression et réclamations quotidiennes remises à zéro. Revois l’accueil de Coco, relance le tutoriel de Paille dans les préférences de test (les progrès de jeu restent acquis), rends le cadeau de cœurs disponible ou réinitialise les échanges au comptoir de Paille.
- **Décorations** : ajoute gratuitement un exemplaire de chaque décoration à l’inventaire, dont la statue du robot. La limite d’inventaire reste respectée ; pose et vente se testent ensuite dans le jeu.
- **Scénarios** : tous les précédents sont conservés. « Fin de partie complète » prépare niveau 30, neuf parcelles, ressources abondantes, exactement un individu de chacune des 35 espèces, habitats variés de niveau 3 avec leur empreinte, affections 2/10/15/20, toutes les recettes et décorations, missions prêtes, deux fermes niveau 2 (culture prête et culture en cours), Cuisine, Statue de l’Affection, agence niveau 3 (voyage revenu et voyage en cours), quatre coussins avec un lapereau prêt et un nid avec une naissance prête. « Début de partie — tutoriel de Paille » charge une partie neuve et relance les préférences de guidage. Charger un scénario remplace la partie de test après confirmation ; exporte-la d’abord si tu veux la conserver.
- **Sauvegarde** : export, import et remise à zéro sont conservés. La remise à zéro conserve l’horloge et les préférences ; le scénario « Début de partie » relance aussi le tutoriel. Les exports MODE-TEST peuvent contenir ressources gratuites et délais modifiés.

Les actions pures sont dans `src/dev/labActions.ts`, l’interface dans `src/dev/labPanel.ts`, le montage et la frontière de stockage dans `src/dev/tools.ts`. `tests/lab-actions.test.ts` vérifie les effets et les allers-retours strictement identiques `encodeGame` / `decodeGame`, `tests/lab-panel.test.ts` exerce le DOM sans navigateur. Les tests historiques continuent à couvrir isolation, stockage et scénarios. Un essai sur iPhone physique reste à faire pour confirmer le rendu et les gestes réels.

Les sections ci-dessous sont des archives historiques ; versions et effectifs anciens ne décrivent pas ce laboratoire.

---

# Livraison normale v5 publiée — 9 octobre 2026

**PR nº 2 fusionnée dans `production`** : application `7da76c747de6aec72cdcd3f1281bcf66dc2078d5`. [Publication et contrôles HTTPS réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37956243641), [preuve durable](validation/production-v5-2026-10-09.json), [captures et rapports publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37956243641/artifacts/11627499043) conservés jusqu’au 8 novembre 2026.

**Jouer : [jeu principal](https://sullivanlegoff-code.github.io/Project-L/). Tester : [laboratoire](https://sullivanlegoff-code.github.io/Project-L/dev/).** Normal et laboratoire v5, même révision `7da76c7`. Quinze espèces, neuf recettes et filtres ; île validée, douze décorations avec sélection, déplacement, rangement et vente, Aménagement/photo et cache statique conservés. Aucun nouveau visuel de lapin ni changement d’équilibrage.

Normal : aucun outil de temps ou ressources, même avec `?dev=1`. Laboratoire : onze scénarios dont collection quinze espèces et sept scénarios d’île/décorations, partie/horloge/préférences/secours séparés et bandeau permanent. Une seule publication pour quatre routes : Décorations v5 figé `85fe255`, Comptes v4 figés `3e70d9e`, stockages isolés. Branche Comptes/PR nº 1 conservées ; email/Supabase/SQL restent en pause. Aucun appel backend ajouté à la publication.

Avant fusion : [544 tests/14 fichiers, TypeScript et six parcours Chromium réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37955358594), [préflight quatre builds réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37955358771). Livraison : 544 tests actuels, 415 Comptes figés, 544 Décorations figées, TypeScript et quatre builds. Après déploiement : révisions, HTML, scripts et fonctionnalités des quatre routes contrôlés ; neuf groupes d’interactions normales réelles dont achat/annulation/vente atomique/rechargement, sept groupes laboratoire dont carnet Dragon exact Perroquet × Feu à 2 %, onze scénarios, conservation des clés normales et rechargement. Aucun hook, interception ou sauvegarde préchargée dans ces deux parcours HTTPS ; aucune erreur console/réseau.

Le joueur a confirmé le fonctionnement général sur iPhone avant intégration. Aucun détail de scénario, modèle ou version Safari supplémentaire déduit ; les parcours automatisés Chromium ne constituent pas un nouvel essai Safari physique.

Migration v4→v5 sur les mêmes clés avec secours, sans redotation ni effacement silencieux. Fermer les anciens onglets puis ouvrir le normal ; ne pas effacer les données Safari. Aucun transfert automatique depuis un espace de test. Pour un transfert volontaire, exporter source et destination puis importer avec confirmation dans la destination, ce qui remplacera sa partie. Les fichiers v5 restent incompatibles avec les comptes v4. [Migration et récupération](migration-v5.md).

Les sections suivantes sont les bilans historiques des étapes précédentes ; elles ne décrivent pas les sources actuelles du normal/laboratoire.

---

# Laboratoire de test publié

- Jeu normal : [https://sullivanlegoff-code.github.io/Project-L/](https://sullivanlegoff-code.github.io/Project-L/).
- Laboratoire : [https://sullivanlegoff-code.github.io/Project-L/dev/](https://sullivanlegoff-code.github.io/Project-L/dev/).
- Livraison : **`production`**, mêmes sources et même révision pour les deux builds. Le laboratoire active les outils de test ; il n'est pas une branche expérimentale publiée séparément.

Publication et vérification HTTPS réussies le 8 octobre 2026, première révision `92d6511a4b478af9df8b0c2a8f1852949303d3be`, [workflow réussi](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37809697390). Les 381 tests, TypeScript, deux builds et les parcours du site réel (huit contrôles normaux, sept groupes d’isolation) passent, sans erreur de console/réseau. La révision actuelle se lit dans Paramètres et dans `build-revision.txt` de chaque route, y compris après les mises à jour documentaires. Bilan : [progress.md](progress.md). Le joueur a confirmé que la publication normale précédente fonctionne sur son iPhone, ordinateur éteint. Aucun scénario détaillé supplémentaire n'est déduit de ce retour.

## Utilisation

Dans le jeu normal, **Paramètres → Ouvrir le laboratoire de test**, ou ouvrir directement `/dev/`. Aucun paramètre d'URL ni serveur Windows requis pour le laboratoire publié. Son bandeau permanent **MODE TEST — PARTIE SÉPARÉE** propose **Retour au jeu normal**. Le panneau est dans **Paramètres**, avec une place réservée au bandeau pour garder les commandes accessibles.

C'est un bac à sable public, sans authentification ni privilèges serveur. Un chemin, un lien discret ou `?dev=1` n'est pas un contrôle d'accès. Les outils ne sont pas inclus dans le JavaScript du jeu normal ; `?dev=1` n'y active rien.

Commandes :

- Temps de test : **+5, +20, +60, +360, +1 440 minutes**. L'offset est enregistré séparément ; l'horloge réelle du jeu normal reste `Date.now`.
- Pattes : **+1 000 / +10 000** ; herbes : **+100 / +1 000** ; cœurs : **+10 / +100**.
- **Remettre la partie de test à zéro**, après confirmation : nouvelle partie de test, seulement. L'horloge de test, ses préférences et les sauvegardes de secours restent conservées ; aucun `localStorage.clear()` ni suppression d'une autre partie.
- **Collection** : onze espèces présentes dans deux enclos universels de niveau 3.
- **Reproduction** : Paille et Neige à affection 2, avec nid/nurserie ; lancer la reproduction via les commandes ordinaires du jeu.
- **Missions** : les huit missions principales et les trois quotidiennes prêtes à réclamer, récompenses non encore encaissées.
- **Habitats** : un universel et les six spécialisés de niveau 3, sept occupants compatibles dans chacun, deux extensions (49 lapins).
- Export/import de la partie de test ; version et révision visibles dans Paramètres.

Les scénarios remplacent la partie de test après confirmation. Ils passent exactement `encodeGame`/`decodeGame` v4. Scénarios et ressources supplémentaires utilisent l'import transactionnel du contrôleur : écrire et valider avant de remplacer l'état courant, sans bonus d'import. Les actions ordinaires restent dans `GameController.perform` et la simulation. Les dépassements numériques, valeurs non prévues et erreurs de stockage sont refusés. Les outils refusent également un contrôleur marqué `normal`.

## Stockage sur une même origine

Les deux chemins partagent le même `localStorage` ; l'isolation repose sur un adaptateur qui préfixe **toutes** les lectures/écritures de sauvegarde du laboratoire, jamais sur le chemin seul. Aucune recherche de secours dans la partie normale.

| Donnée | Jeu normal, inchangé | Laboratoire |
|---|---|---|
| Partie v4 | `prairie-lapins.save.v1` | `prairie-lapins.development.prairie-lapins.save.v1` |
| Secours migration v1→v2 | `prairie-lapins.backup.before-v2` | `prairie-lapins.development.prairie-lapins.backup.before-v2` |
| Secours migration v2→v3 | `prairie-lapins.backup.before-v3` | `prairie-lapins.development.prairie-lapins.backup.before-v3` |
| Secours migration v3→v4 | `prairie-lapins.backup.before-v4` | `prairie-lapins.development.prairie-lapins.backup.before-v4` |
| Préférences | `prairie-lapins.ui.v1` | `prairie-lapins.development.ui` |
| Horloge | Heure réelle, aucun offset de test | `prairie-lapins.development.clock` |

Ce préfixe reprend celui du mode local historique `?dev=1`, avec contrôle des valeurs d'offset. Format JSON v4 et migrations inchangés. Plusieurs onglets d'une même partie gardent les protections existantes contre les écritures concurrentes ; utiliser un seul onglet par mode.

`SaveStorage.scope` et `GameController.storageScope` identifient la session. La politique `sessionPolicy(true)` expose **`onlineServicesAllowed: false`**, y compris pour le mode local de test ; tout futur client de comptes/synchronisation devra recevoir et respecter cette politique avant initialisation. Aucun compte ni adaptateur de sauvegarde en ligne n'est développé ici.

## Tester volontairement une copie

1. Dans le jeu normal, **Exporter ma partie**, conserver le JSON original.
2. Ouvrir le laboratoire et **Importer dans la partie de test**.
3. Vérifier le résumé, puis confirmer. Seule la partie de test est remplacée.

La partie source n'est pas copiée automatiquement ni modifiée par l'import. Les exports du laboratoire portent **`prairie-lapins-MODE-TEST-…json`**, y compris les exports de contenu protégé et les téléchargements de secours. Le JSON reste un v4 standard : aucun champ ajouté ni changement de format. Les préférences et l'offset ne sont pas exportés, comme pour le mode local historique. Le fichier peut contenir des ressources ajoutées et des dates simulées ; ne l'importer dans une vraie partie que volontairement. Le nom avertit, sans constituer un contrôle d'accès ou une interdiction d'import.

## Builds et publication

```bash
npm ci
npm test
npm run typecheck
VITE_BUILD_REVISION="$(git rev-parse HEAD)" npm run build:pages -- /tmp/prairie-pages
```

Racine : `prairie-lapins-prototype`. `scripts/build-pages.mjs` construit le jeu normal avec base `/Project-L/`, puis le laboratoire avec **`vite build --mode laboratory`**, base `/Project-L/dev/`. Sorties : `/tmp/prairie-pages` et `/tmp/prairie-pages/dev`. `build-revision.txt` est présent dans chaque route ; Paramètres utilise la même source unique de version et la révision injectée.

GitHub Actions utilise `$RUNNER_TEMP/prairie-pages`, vérifie les deux builds et envoie **un seul artefact Pages contenant les deux**. Le laboratoire et le jeu normal ne se déploient jamais indépendamment. Une publication conserve les deux routes ; les branches expérimentales ne remplacent pas le site. Si un build/test échoue, aucun nouveau site n'est déployé.

Le cache GitHub Pages et les assets Vite hashés restent utilisés sans service worker. Ne pas effacer les données Safari pour mettre à jour. Retour arrière : un commit de revert sur `production`, suivi du même pipeline. Le build normal précédent `2d3ba56` reste le point de retour avant le laboratoire ; revenir à cette livraison retire la route de test mais ne supprime aucune donnée stockée sur l'appareil. Pour les livraisons ultérieures, préférer un point fonctionnel comprenant les deux routes et compatible v4. Ne pas revenir au palier v3 de `main`.

## Vérification reproductible

`docs/laboratory-browser-check.cjs <URL normale> <révision>` ouvre les deux pages sur une même origine, en contexte Chromium jetable. Il teste la nourriture normale, le lien, les commandes, la comparaison octet par octet de toutes les clés hors espace de test, la copie par export/import avec annulation, le reset avec annulation/confirmation, les scénarios, les rechargements, le retour normal, les deux révisions et l'absence des outils sur `?dev=1` normal. Le parcours normal historique reste dans `docs/production-browser-check.cjs`.

Les tests unitaires couvrent aussi les backups de migration, préférences, erreurs d'écriture, overflow et contrôleur normal transmis par erreur. Le contexte de test n'utilise jamais la sauvegarde du joueur. Les essais automatisés Chromium (paysage 852×393 et portrait 390×844) ne constituent pas un essai physique Safari. Le certificat du proxy cloud est limité temporairement au certificat du site pour ce navigateur jetable ; les deux accès HTTPS réussissent également avec la validation TLS système active, sans modification du magasin de confiance.

Test iPhone en cinq étapes :

1. Ouvrir le jeu normal, noter les ressources et ouvrir le laboratoire depuis Paramètres.
2. Vérifier le bandeau ; ajouter des ressources et avancer de 60 minutes.
3. Recharger : retrouver les ressources de test et l'horloge avancée.
4. Confirmer la remise à zéro du test, puis revenir au jeu normal : retrouver la progression normale.
5. Fermer Safari, éteindre Windows, puis rouvrir les deux liens en Wi-Fi ou données mobiles.
