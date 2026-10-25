> Historique : ce document décrit un départ ou un barème antérieur à v17, notamment les parcours `previousStart`. Référence courante : [économie v17](game-design.md) et [progression](player-progression.md).

# Validation du début, budget et rythme

Base : dernier `production` `42b11c6`, application `f2c3ad9`, sauvegarde v8. Aucun changement des revenus, prix, délais, probabilités ou récompenses dans cette étape.

## Parcours et corrections

Partie neuve : 300 pattes, 10 herbes, 12 cœurs ; Paille/Neige et habitat/nid/nurserie offerts. Nourriture, achat/placement de ferme, production, collection, récolte, reproduction gratuite, transfert manuel, croissance et accueil sont exécutés par les commandes de jeu. Les sept récompenses sont réclamées explicitement puis disparaissent. Une naissance commune suffit au guidage ; Brumelin reste un résultat possible à 20 % pour ces parents d’affection 2, hors garantie. Les résultats commun et Brumelin sont contrôlés seulement dans les tests, jamais dans le navigateur.

Corrections :

- Le guidage explique l’attente et les aides facultatives, au lieu de demander systématiquement d’attendre le délai normal.
- Une récolte en attente dans une seconde ferme est reconnue : « Me guider » ouvre cette ferme, sans demander une nouvelle production dans une ferme vide.
- Si le nid est prêt mais la nurserie occupée, le raccourci mène à la nurserie, où le joueur peut accueillir le lapereau précédent lorsqu’il est prêt.
- Terre, dans la boutique et son panneau d’achat, propose un deuxième habitat avant toute dépense lorsque les places compatibles sont pleines. Améliorer l’habitat actuel reste une alternative.
- Après le guidage, le carnet de Brumelin conserve son nom et reste accessible depuis les objectifs, avec « résultat possible » et « sans certitude ».
- La célébration conserve le portrait existant ; ses marges sont resserrées pour faciliter l’accès aux deux boutons sur petit paysage. Aucune fenêtre de tutoriel supplémentaire n’est déclenchée.

Après la première naissance et sa récompense : huit missions parallèles de collection, développement, affection, aménagement et expansion. Le joueur choisit ; décoration et extension sont facultatives. Les actions déjà accomplies sont reconnues et les missions réclamées ne sont pas répétées. Ni le guidage ni les aides n’ajoutent des récompenses.

## Calcul économique du début

Sans récolte de pattes, sans dépenses en cœurs, avec chaque récompense initiale réclamée. L’inventaire ne comprend pas les récompenses des branches parallèles ni des quotidiennes.

| Étape terminée | Pattes | Herbes | Cœurs | Délai normal ajouté |
|---|---:|---:|---:|---|
| Départ | 300 | 10 | 12 | — |
| Paille affection 2, récompense | 300 | 18 | 12 | — |
| Ferme placée, récompense | 240 | 38 | 12 | — |
| Petite production lancée | 230 | 38 | 12 | 5 min avant récolte |
| Récolte et récompense | 260 | 58 | 12 | — |
| Neige affection 2, récompense | 280 | 56 | 12 | — |
| Reproduction lancée, récompense | 280 | 76 | 12 | 20 min avant transfert |
| Transfert manuel, récompense | 310 | 76 | 12 | 5 min commun / 15 min Brumelin |
| Accueil et récompense | 360 | 76 | 12 | — |

Calcul : `300 − 60 − 10 + 30 + 20 + 30 + 50 = 360` pattes ; `10 − 2 + 10 + 20 + 20 − 2 + 20 = 76` herbes. Les aides remplacent uniquement les trois délais visés, jamais la récolte, le transfert ni l’accueil. Sans aides : minimum 30 minutes de délais cumulés pour un commun, 40 pour Brumelin, en transférant et accueillant dès disponibilité. Les pauses du joueur s’ajoutent à ces minima.

Les revenus des parents continuent au nid. Avant nourriture, deux lapins produisent 24 pattes/h ; après les deux repas, 28 pattes/h. Avec un nouveau commun d’affection 1, la famille produit 40 pattes/h. La rareté ne multiplie aucun revenu. Les fractions restent stockées et seules les pattes entières récoltées rejoignent le portefeuille.

## Simulation sur 24 heures

Projection conditionnelle, pas prédiction d’un joueur moyen. Commandes réelles de simulation, états sérialisés/rechargés et tirages contrôlés uniquement dans le test économique. Aucun ajout de ressources. Les délais sont avancés dans la simulation ; aucune observation humaine.

Hypothèses :

- Origine = création de la partie. Avec aides, les actions sont condensées à l’instant 0 pour calculer une référence ; cela ne prétend pas que le joueur joue instantanément. Sans aides, première naissance à 30 ou 40 minutes.
- Après l’accueil, nourrir le nouveau lapin jusqu’à affection 5 (20 herbes), acheter un deuxième habitat universel (120 pattes) puis Terre (80). Réclamer les branches acquises et la quotidienne d’affection. Résultat : 280 pattes, 86 herbes, 13 cœurs si première naissance commune / 14 si Brumelin. Le dernier cœur provient de la découverte réelle de Brumelin.
- Quatre lapins : parents affection 2, nouveau lapin affection 5, Terre affection 1. Revenus : 48 pattes/h dans le premier habitat, 12 dans le second ; plafonds 600 chacun.
- Une production moyenne lancée après cette session, puis à chaque visite sauf la dernière : 18 pattes, 40 herbes, 15 minutes. Récolter revenus et herbe à chaque visite. Aucun autre achat, repas ou reproduction dans cette projection.
- Réclamer les quotidiennes prêtes, le bonus seulement après les trois réclamations, et le cadeau de cœurs à 24 h. La visite à 24 h commence le nouveau cycle : ses récoltes peuvent gagner ses missions de pattes/herbes ; aucun deuxième bonus n’est gagné sans nourriture dans ce cycle.

| Parcours et visites depuis création | Pattes à 24 h | Herbes | Cœurs |
|---|---:|---:|---:|
| Aides, visites 1/4/8/12/18/24 h | 1 672 | 346 | 17 commun / 18 Brumelin |
| Attente normale, mêmes visites | 1 655 commun / 1 650 Brumelin | 346 | 17 / 18 |
| Aides, visites 8/24 h | 1 576 | 186 | 17 / 18 |
| Attente normale, visites 8/24 h | 1 559 commun / 1 554 Brumelin | 186 | 17 / 18 |

Vérification analytique avec aides et six visites : revenus `60 × 24 = 1 440` ; portefeuille `280 − 6 × 18 + 1 440 + 2 × 30 = 1 672` ; herbe `86 + 6 × 40 + 2 × 10 = 346`. Avec deux visites : le premier habitat perd 168 pattes de production lors des 16 heures entre visites (`48 × 16 − 600`), le second ne plafonne pas. Revenus récoltés 1 272 ; économie de quatre productions = 72 pattes ; solde final inférieur de 96 pattes et 160 herbes.

Cette trajectoire finance Terre et son habitat immédiatement après la première naissance. Avec aides, une extension de 500 pattes peut être financée à la visite de 4 h **avant** de relancer la production (514 pattes) ; attendre jusqu’à 8 h reste possible. Sans aides, ce même plan ne finance pas encore l’extension à 4 h. Son coût net après réclamation est 400 pattes : soustraire 400 aux soldes projetés si on la choisit, sans autre changement de production. Des fleurs à 20 pattes, puis la mission de pose à 20, ont un coût net nul après réclamation. Les autres décorations restent plus coûteuses.

Cinq espèces sont accessibles sans hybridation garantie : après Terre, acheter deux autres communs (160 pattes) dans les deux places du deuxième habitat. C’est un choix différent de l’extension ; il augmente les revenus et n’est donc pas inclus dans les totaux du tableau. Le carnet expose les recettes ; aucune projection ne garantit Brumelin après quelques essais.

## Rythme et éventuel équilibrage

Avec aides, il n’y a aucune pause obligatoire. La cible de 10–15 minutes **actives** reste à vérifier sur une personne lisant, explorant la caméra/collection et choisissant les actions ; elle n’a pas été mesurée sur un humain. Un automate peut finir beaucoup plus vite. Il ne faut ni assimiler son temps à celui d’un joueur, ni gonfler le parcours avec des achats ou attentes imposés.

Sans aides, la ferme fournit cinq minutes pour collection/caméra ; le nid impose ensuite vingt minutes et la croissance cinq ou quinze. Pendant ces deux dernières attentes, les parents sont indisponibles pour d’autres reproductions : consulter les recettes, produire de l’herbe ou préparer un habitat offre des choix, mais un joueur sans envie de ces activités peut n’avoir aucun choix intéressant. Les aides facultatives suppriment cette pause pour le premier parcours ; les reproductions suivantes retrouvent les délais normaux. Aucune accélération payante n’est nécessaire au premier accueil.

Les récompenses initiales financent bien les prochains choix : 360 pattes paient habitat + Terre (200), sans devoir consommer de cœurs. L’extension coûte 500 et reste un objectif de retour. Les 76 herbes permettent de passer les trois lapins à affection 5 : 18 + 18 + 20 = 56, avec 20 restantes ; cela rend la ferme peu nécessaire immédiatement après la naissance, mais la nourriture devient ensuite plus coûteuse.

**Proposition conditionnelle, non appliquée** : si les essais humains confirment que la ferme est ignorée après l’initiation, réduire la récompense « Au nid » de 20 à 10 herbes. Réserve après accueil : 76 → 66 ; après trois lapins à affection 5 : 20 → 10. Les parents initiaux, le parcours gratuit, les prix et les probabilités restent inchangés. Cette réduction seule ne garantit pas un rythme de 10–15 minutes ; attendre l’essai iPhone avant de décider. Aucune autre modification importante d’équilibrage recommandée à ce stade.

## Mesures navigateur et preuves

Le parcours aidé complet est exécuté sur le build **normal**, sans outils du laboratoire, écriture de stockage, ressources ajoutées, modification d’horloge ou de tirage. Les interruptions utilisent des rechargements ; rotations portrait/paysage, réclamations, disparition des missions, carnet et raccourci Terre sont vérifiés.

Le parcours sans aides utilise les commandes normales du laboratoire et avance explicitement son horloge de 5 + 20 + 5/15 minutes. Il vérifie les délais normaux et le transfert manuel ; ce n’est pas une attente physique de 30/40 minutes. Mesures locales réelles de l’automate : 20,038 s pour le parcours aidé complet, 22,956 s pour le parcours sans aides avec 30 minutes avancées explicitement dans le laboratoire. Ces durées comprennent chargements, captures et rechargements ; ce ne sont pas des durées de jeu humain. Les parcours publics sont mesurés séparément ci-dessous. Chromium tactile n’est pas Safari physique.

## Essai iPhone — neuf actions

1. Dans le laboratoire, charger « Initiation — trois aides inutilisées ».
2. Explorer/Recentrer, ouvrir Paille, nourrir puis réclamer la récompense.
3. Acheter/placer la ferme, réclamer et lancer la petite production.
4. Consulter la collection, revenir utiliser l’aide puis récolter/réclamer.
5. Nourrir Neige, réclamer, choisir les parents et lancer gratuitement ; consulter Brumelin.
6. Recharger, utiliser l’aide du nid : les parents doivent rester au nid.
7. Envoyer manuellement, réclamer, recharger puis utiliser l’aide de croissance.
8. Accueillir/réclamer, fermer la célébration et recharger : aucune répétition.
9. Choisir librement carnet ou Terre ; vérifier le raccourci habitat. Sur une autre partie neuve, laisser une étape finir normalement au lieu d’utiliser son aide.

## Preuves détaillées

- [Budget et huit projections sur 24 h](proofs/start-validation/economy.json) : calculs vérifiés par commandes de simulation, avec tirages contrôlés seulement dans les tests.
- [Rapport normal local](proofs/start-validation/local-normal-report.json) et [rapport local avec attente simulée](proofs/start-validation/local-waiting-report.json).
- Captures du build local, sans ajout de ressources : [choix libres](proofs/start-validation/local-free-goals.png), [Terre et habitat compatible](proofs/start-validation/local-terre-habitat.png). Les captures publiques sont dans l’artefact du déploiement.

## Livraison validée

Application publiée : [`63d74eb`](https://github.com/sullivanlegoff-code/Project-L/commit/63d74eb39bdee654838669cbe6bc84aa68fe6ecf), après [PR nº 14](https://github.com/sullivanlegoff-code/Project-L/pull/14). [Jeu normal](https://sullivanlegoff-code.github.io/Project-L/) · [Laboratoire](https://sullivanlegoff-code.github.io/Project-L/dev/).

Validation : **689 tests / 25 fichiers**, TypeScript, deux builds courants et deux builds des prévisualisations figées. La [CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38093458214) a validé neuf suites sur sources et treize suites sur builds, soit 48 contrôles sur ces builds. Le [déploiement](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38093808593) a validé les quatre routes HTTPS réellement servies et treize suites publiques / **48 contrôles**, tous réussis, sans erreur navigateur. Formats conservés : normal/laboratoire v8, comptes v4, décorations v5 ; prévisualisations respectivement `3e70d9e` et `85fe255`. Comptes/Supabase restent en pause.

Mesure publique réelle de l’automate : **17,620 secondes** pour la partie neuve complète sur le jeu normal, avec aides, rechargements, rotation et raccourcis après tutoriel ; premier accueil à 14,933 s et résultat non contrôlé **Brumelin**. Le parcours public sans aides a pris **18,658 secondes de script**, avec **30 minutes simulées** et une naissance commune. La CI a aussi rencontré une croissance de 15 min et 40 minutes simulées ; les deux issues sont garanties par des tirages contrôlés uniquement dans les tests. Aucun de ces chiffres ne constitue une mesure humaine des 10–15 minutes actives, ni une attente physique de 30/40 minutes.

[Rapport public permanent](proofs/start-validation/public-validation.json). Rapports et captures publics complets : [artefact de validation](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38093808593/artifacts/11685411143), conservation jusqu’au 9 novembre 2026. Les calculs et captures locales ci-dessus restent dans le dépôt. Le test physique Safari est à effectuer sur iPhone.
