# Plan d'amélioration de Prairie Lapins — audit du 23 novembre 2026

L'audit porte sur tout le jeu : le jeu principal, Benny Rampage, les mini-jeux, puis la partie technique (chargement, mémoire, sauvegarde, tests). Il a été fait en lecture seule, sur `main` en local (97c4363).

Les défauts marqués **vérifié** ont été relus dans le code, avec le fichier et la ligne. Les autres viennent de la lecture des audits et sont à confirmer avant d'être corrigés.

Pour chaque tâche : un **test** qui prouve la correction, puis les tests ciblés. La suite complète se lance seulement avant une publication. Le travail se fait sur une branche `feature/…`, sans fusion ni push sans « Publie » du propriétaire.

> **À savoir :** une autre session travaille sur Benny Rampage, dans le dossier `.claude/worktrees/rampage-*`. Le `main` local contient sa fusion 97c4363, qui n'est pas encore publiée. Les corrections de Rampage (lot 2) passent par cette session, ou se font après sa publication, pour ne pas toucher aux mêmes fichiers en même temps.

---

## Lot 1 — Ce qui fait perdre quelque chose au joueur (à faire en premier)

| # | Problème | Où | Correction |
|---|---|---|---|
| 1.1 | **Corde à sauter : une touche trop tôt fait perdre les cœurs du jour.** Toucher pendant « Prêt ? » compte comme un raté. La partie s'arrête à 0 saut, et le cœur et le défi (+2) du jour sont perdus. **Vérifié.** | `src/simulation/jumpRope.ts:45-48`, `:68` ; `actions.ts:283-288` | Ignorer les touches avant la première corde. Une partie à 0 saut ne consomme ni le cœur ni le défi. |
| 1.2 | **Benny Rampage : une course avec 9 cœurs ou plus est refusée en entier.** Le record, les pièces et la mission sont perdus. Rien n'arrête les cœurs à 8. **Vérifié.** | `bennyRun.ts:161`, `:1049` ; `actions.ts:640-641` | Ne plus faire apparaître de cœur après 8. L'action plafonne au lieu de refuser (pareil pour les pièces au-delà de 5000). |
| 1.3 | **Benny Rampage : quitter pendant la scène de fin (3,4 s) fait perdre la course.** La course n'est enregistrée qu'à l'ouverture de la fenêtre de fin. | `BennyRunActivity.ts:2263-2286`, `:2379` | Enregistrer la course dès qu'elle se termine ; la fenêtre ne fait plus que l'afficher. |
| 1.4 | **Sauvegarde en ligne bloquée après une mise à jour.** Un envoi en attente, écrit avec un ancien format, ne repart jamais. La synchro reste « hors ligne » pour toujours. **Vérifié.** | `src/cloud/sync.ts:127-131`, `:174` ; `gateway.ts:79` | Stocker et renvoyer la partie déjà convertie au format actuel. Ajouter un test avec le vrai encodage. |
| 1.5 | **Le retour sur l'iPhone ne récupère pas la partie jouée sur le PC.** Ça finit en « conflit », et le joueur doit jeter un des deux côtés. | `sync.ts:288-295` | Au retour au premier plan, relire la partie en ligne si rien n'a changé ici, et la prendre si elle est plus récente. |
| 1.6 | **Safari peut effacer la partie d'un joueur sans compte.** Après 7 jours sans visite dans Safari (pas l'écran d'accueil), iOS vide le stockage. **Vérifié** : `navigator.storage.persist()` n'est appelé nulle part. | `src/main.ts` | Demander un stockage persistant au démarrage. Dans Safari, proposer plus clairement le compte ou « Ajouter à l'écran d'accueil ». |
| 1.7 | **Pas de copie de secours automatique.** Une sauvegarde abîmée bloque le joueur sur l'écran « sauvegarde invalide ». | `GameController.ts:109-122` | Garder la sauvegarde précédente qui a marché, et proposer de la reprendre. |

## Lot 2 — Benny Rampage

| # | Problème | Correction |
|---|---|---|
| 2.1 | « Quitter » depuis la pause jette la course sans prévenir (`BennyRunActivity.ts:2392`). | Proposition à valider (décision D2) : soit terminer la course et payer, soit écrire « Abandonner (tu perds cette course) ». |
| 2.2 | Un passage lent (chargement d'images au début) baisse la qualité pour toutes les courses suivantes (`:899-913`). | Remettre la qualité à fond à chaque nouvelle course. |
| 2.3 | Après une perte du contexte graphique (fréquente sur iOS après l'arrière-plan), le sol reste en mode lent jusqu'au rechargement (`bennyRunFloor.ts:185`). | Reconstruire le sol au retour du contexte. |
| 2.4 | Environ 100 Mo de textures préparées, dont une bonne partie n'est jamais dessinée (`:419-430`). Le canvas WebGL garde sa taille après la sortie. | Ne préparer que ce qui est dessiné ; vider le canvas à la fermeture (gain estimé : 25 à 35 Mo). |
| 2.5 | Des milliers de petits objets créés à chaque image, et des recalculs de mise en page à chaque pièce ramassée. | Projection sans création d'objets ; animations en Web Animations ; dos de la barrière dessiné seulement de près. |
| 2.6 | Le bouton peut rester sur « Chargement… » si le téléphone est tourné en portrait. | Remettre le libellé. |
| 2.7 | Petites aides : « Esquive ! » les 3 premières fois, pièces et cœurs gagnés dans la fenêtre de pause, « Encore N courses récompensées aujourd'hui » au départ. | Textes au tutoiement. |
| 2.8 | Fichier de 2 460 lignes difficile à modifier. | Découper par étapes, sans changer le comportement : caméra, images, effets, piste, personnages, affichage. |

## Lot 3 — Mini-jeux

| # | Problème | Correction |
|---|---|---|
| 3.1 | **Corde à sauter et Cadeaux du ciel : la partie entière est recopiée 60 fois par seconde** pour le bandeau. C'est le même ralentissement que celui déjà corrigé dans le vol de Benny. **Vérifié** pour la corde. | Écrire le bandeau seulement quand il change (même méthode que le vol). |
| 3.2 | Corde à sauter : mise en page recalculée à chaque image, et corde dessinée en 48 morceaux. | Garder la taille en mémoire ; 24 morceaux. |
| 3.3 | **Cadeaux du ciel presque muets** : pas de son quand on attrape un cadeau, quand un cadeau tombe dans la neige, ni pour le poison ou la bombe. | Ajouter des sons (ceux qui existent déjà : pièce, choc, souffle). Ajouter aussi un son au raté de la corde. |
| 3.4 | Vol de Benny : la ligne « +1 Cœur » de la fin peut être fausse si les cœurs changent entre deux parties. | Le jeu donne directement les cœurs gagnés. |
| 3.5 | Bataille de boules de neige : beaucoup d'objets créés à chaque image (`snowballFight.ts:299`, `:135`). | Une table tenue à jour ; un seul calcul par image. |
| 3.6 | Construire un bonhomme de neige (ou un pique-nique) arrête toutes les batailles de l'île, pas seulement celle de l'enclos (`MeadowScene.ts:773`, `:682`). | Arrêter seulement la bataille de cet enclos. |
| 3.7 | Caresse de Benny : mise en page recalculée deux fois à chaque mouvement du doigt (`bennyCaress.ts:299-310`). | Réutiliser la première mesure. |
| 3.8 | Salon : la lueur au retour d'un soin peut manquer (`salonSpa.ts:159`). | Vérifier l'heure de fin au moment de récupérer. |
| 3.9 | Les trois jeux d'arcade répètent environ 70 lignes identiques (fenêtres, pause, fin de partie). Seule la cuisine se met en pause sur `pagehide`. | Une base commune pour les trois, avec la même pause partout. |
| 3.10 | Cuisine : ombres `drop-shadow` coûteuses sur iPhone pendant le glisser. | Ombres intégrées aux images. |

## Lot 4 — Jeu principal

| # | Problème | Correction |
|---|---|---|
| 4.1 | Certains écrans ne se mettent pas à jour à la fin d'un minuteur : retour à l'ancien dessin dans la forêt (« dans 0 s »), et pouvoir de Benny qui reste grisé. | Ajouter ces deux fins de minuteur au rafraîchissement. |
| 4.2 | Un enclos agrandi ne grandit qu'au rechargement du jeu, même après avoir libéré la place. | Le faire grandir dès que la place se libère. |
| 4.3 | Le test qui mélange des actions au hasard ne couvre pas les actions récentes (soins, pique-nique, débris, évolutions, Noël, déplacement…). Un défaut là donnerait « action non sauvegardée ». | Ajouter ces actions, sur plusieurs jours. |
| 4.4 | Le simulateur de progression échoue sur ses propres résultats : niveau 22 au jour 15, alors que le propriétaire a accepté le jour 15. Il ne compte ni Benny Rampage ni les mini-jeux. | Régler la limite sur la cible acceptée ; ajouter Rampage ; relancer. |
| 4.5 | `AGENTS.md` dit « sauvegarde v24 » alors que le jeu est en v29. | Mettre à jour la documentation, et utiliser `SAVE_VERSION` dans `newGame`. |
| 4.6 | « Un coin joli » se valide en déplaçant une décoration déjà posée. | À laisser tel quel ou à durcir (décision D6). |

## Lot 5 — Vitesse et mémoire sur iPhone

| # | Problème | Correction |
|---|---|---|
| 5.1 | **Mémoire des images trop haute** : risque que Safari recharge la page. Une ferme est peinte en 1254 px pour environ 340 px à l'écran au zoom maximum. Chaque bâtiment a aussi sa copie de nuit de la même taille. **Vérifié** pour la ferme. | Réduire les images de la prairie à environ 2 fois leur taille d'écran maximale, sans toucher aux peintures sources. Libérer les images qui ne sont plus affichées. Gain estimé : 60 à 75 % de la mémoire de la prairie. |
| 5.2 | La prairie lit la mise en page plusieurs fois à chaque image (`MeadowScene.ts:1720-1858`). | Garder ces mesures en mémoire et ne les relire qu'au changement. |
| 5.3 | Le jeu tourne à 60 images par seconde en permanence, même immobile. | 30 images par seconde quand rien ne bouge (batterie, chauffe). |
| 5.4 | **Tous les mini-jeux sont téléchargés au démarrage**, sauf Rampage. **Vérifié.** Les données de Noël aussi. | Les charger seulement à l'ouverture. |
| 5.5 | À chaque visite, des centaines d'images sont revérifiées auprès du serveur. Pas de jeu hors ligne. | Un petit « service worker » qui garde les images en cache. Jamais dans le laboratoire. |
| 5.6 | Le site publié contient 96 Mo de PNG que le jeu ne télécharge jamais (il prend les WebP). | Ne plus copier ces PNG dans le site publié. |
| 5.7 | Les musiques de la cuisine pèsent 5 Mo chacune. | Les ré-encoder à 96 kb/s, comme celles de Noël. |
| 5.8 | La sauvegarde en ligne garde des copies de secours qui ne sont jamais supprimées. | En garder une seule. |

## Lot 6 — Santé du projet

| # | Tâche |
|---|---|
| 6.1 | Accélérer la suite de tests (environ 10 min) : les tests sans écran tournent sans happy-dom et sans réisolation ; les tests d'images et de base de données se lancent seulement avant une publication. |
| 6.2 | Regrouper les petites fonctions en double (`clamp` existe 7 fois, « mouvement réduit » 5 fois). |
| 6.3 | Ranger les 37 anciens scripts `docs/*-browser-check.cjs` dans `docs/history/`. |
| 6.4 | Découper progressivement `GameUI.ts` (276 Ko) et `actions.ts`, un menu à la fois, en commençant par les missions et le marché de Noël. |
| 6.5 | Publication plus légère : récupérer seulement le code et `public/` (sans `assets-source/`, environ 600 Mo). |

---

## Décisions qui reviennent au propriétaire (rien n'est fait sans son accord)

- **D1. Corde à sauter :** le cœur et le défi ne se gagnent qu'à la toute première partie du jour. Faut-il, comme pour le vol de Benny, les donner à « la première partie qui réussit » ?
- **D2. Benny Rampage, bouton « Quitter » en pause :** faut-il payer la course, ou prévenir qu'elle est perdue ?
- **D3. Les mini-jeux rapportent très peu de pièces** : moins de 1 % de ce que rapportent les habitats chaque jour. Faut-il faire monter leurs pièces avec le niveau du joueur ?
- **D4. L'heure du changement de jour** dépend de l'heure où la partie a été créée (par exemple 19 h, au milieu de la session du soir). Faut-il la fixer, par exemple à 4 h du matin ?
- **D5. La mission « Promenade en forêt »** oblige à remettre l'ancien dessin d'un lapin évolué pendant 7 h. Faut-il la garder ou la changer ?
- **D6.** « Un coin joli » : faut-il qu'elle compte seulement une décoration nouvellement posée ?
- **D7. Cœurs de Rampage :** jusqu'à environ 12 par jour. Faut-il les compter dans le calendrier « tout payé en 15 jours » ?
- **D8. Supabase** (manipulation à faire par le propriétaire dans son tableau de bord) : fermer les inscriptions une fois les joueurs inscrits.
- **D9. Les sources des images** (environ 600 Mo dans Git) : les sortir du dépôt demanderait de réécrire l'historique. C'est à décider plus tard.

## Ordre conseillé

1. Le lot 1, en entier.
2. Le lot 3, de 3.1 à 3.8.
3. Le lot 4, de 4.1 à 4.5.
4. Le lot 5, de 5.1 à 5.4, puis de 5.6 à 5.8.
5. Le lot 2, via la session Rampage.
6. Le lot 5.5 (service worker, à faire avec soin).
7. Le lot 6.

Après chaque lot : un contrôle Chromium réel des écrans touchés, et `git diff --check`.
