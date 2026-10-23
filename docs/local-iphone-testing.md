# Tests locaux iPhone, sans publication

Les crédits Netlify sont limités : tout se teste localement par défaut. Une compilation du dossier `netlify-site/` n'est pas une publication. Le propriétaire décidera explicitement d'une éventuelle publication ultérieure.

Depuis PowerShell :

```powershell
Set-Location C:\Users\sulli\Documents\Project-L\prairie-lapins-prototype
ipconfig
npm run dev -- --port 5173 --strictPort
```

IPv4 Wi-Fi relevée le 2026-10-17 : **192.168.1.13** (elle peut changer). Dans Safari de l'iPhone, sur le même Wi-Fi :
- Jeu : `http://192.168.1.13:5173/`
- Laboratoire : `http://192.168.1.13:5173/?dev=1`

Pour vérifier le build compilé à la place :

```powershell
npm run build:netlify
npm run preview -- --outDir netlify-site --port 5174 --strictPort
```

- Jeu : `http://192.168.1.13:5174/`
- Laboratoire : `http://192.168.1.13:5174/dev/`

Le PC doit rester allumé et le serveur actif ; Ctrl+C l'arrête. Ne pas ouvrir `localhost` sur l'iPhone. Si la connexion échoue, vérifier même Wi-Fi et absence d'isolation du réseau invité, puis l'autorisation Node sur réseau privé dans le pare-feu Windows. Aucune règle de pare-feu ni configuration réseau ne doit être changée automatiquement.

## Mode écran d'accueil en HTTP local

La procédure Apple permet Partager → Sur l'écran d'accueil → **Ouvrir comme app web** si le réglage existe. Cependant, la documentation consultée ne confirme pas le cas précis d'une IPv4 privée en HTTP sur l'iPhone du propriétaire. **Standalone sur cette adresse locale : non confirmé.** Tester l'installation depuis Safari, ouvrir la nouvelle icône et vérifier l'absence d'interface du navigateur ; la simple présence d'une icône n'est pas une preuve. Si le mode application n'est pas obtenu en HTTP, un HTTPS local avec certificat approuvé sur l'iPhone sera une configuration séparée, sans publication Netlify automatique. Aucun service worker ni mode hors ligne n'est requis pour les essais de cette tâche.

Le serveur HTTP, le contenu compilé et la réponse sur l'IPv4 du PC peuvent être vérifiés sur PC. Cela ne prouve ni l'accès à travers le Wi-Fi/pare-feu depuis l'iPhone, ni le mode standalone physique. Les résultats effectivement vérifiés sont consignés dans la Passation de `progress.md`.

Vérifié par Codex le 2026-10-17 : serveurs lancés avec les commandes ci-dessus, réponses HTTP 200 contenant la page du jeu depuis le PC sur `192.168.1.13:5173/`, `:5173/?dev=1`, `:5174/` et `:5174/dev/`. Le build modifié a aussi été servi temporairement sur `:5175/` pour les comparaisons avant/après. L'accès physique depuis l'iPhone et l'installation standalone HTTP restent non testés. Les serveurs de vérification sont arrêtés en fin de tâche : relancer la commande voulue pour les essais du propriétaire.

Un véritable essai navigateur sur l'adresse LAN a ensuite révélé un ancien blocage : `crypto.randomUUID()` n'y était pas exposé, contrairement à `localhost` traité comme contexte de confiance. Le script précoce fournit désormais cette API uniquement quand elle manque, à partir de `crypto.getRandomValues()`, avec le même format UUID v4 et les mêmes garanties de hasard cryptographique ([spécification Web Crypto](https://w3c.github.io/webcrypto/)). Aucun changement du contrôleur, schéma, migration ou règle de sauvegarde. Le démarrage réel jeu et laboratoire a été vérifié en Chromium à `isSecureContext=false`, sans erreur et avec statut `saved` sur les deux URL dev de l'IPv4, puis en **Chromium et WebKit Windows sur le build compilé** (`http://192.168.1.13:5174/` et `/dev/`) : canvas présent, identifiant valide, aucune erreur, statut `saved` dans les quatre contextes. Un HTTP 200 seul n'aurait pas suffi à prouver le fonctionnement du jeu.

Source : [Apple — ouvrir un site comme app web](https://support.apple.com/guide/iphone/iphea86e5236/ios).

## Essai de l'île agrandie (parcelles 4 × 4, sauvegarde v11)

À faire par le propriétaire sur son iPhone, en Safari, avec le **build compilé** (commandes ci-dessus : `npm run build:netlify`, puis `npm run preview -- --outDir netlify-site --port 5174 --strictPort`, et l'IPv4 du jour relevée par `ipconfig`). Rien n'est publié.

Une partie déjà enregistrée sur cette adresse (`http://<IPv4>:5174/`) est migrée une seule fois en v11 à l'ouverture ; sa source brute reste disponible (Paramètres → exporter la source avant migration, copie `before-v11`). Un ancien client v10 ne relira pas cette partie.

Points à vérifier :
1. **Nouvelle partie** (Paramètres → « Recommencer avec confirmation », après export si la partie compte) : le nid, la nurserie et l'habitat de Paille sont centrés sur une parcelle plus grande (4 × 4 cases).
2. **Recentrer** (bouton ⌖), en paysage puis en portrait : les trois bâtiments sont entièrement visibles, à côté de la colonne de boutons en paysage, en dessous en portrait, sans être cachés par le HUD.
3. **Pincer et glisser jusqu'aux bords** : le zoom suit les doigts, la vue ne perd jamais l'île, l'eau reste visible autour au dézoom maximal.
4. **Achat d'une extension au laboratoire** (`http://<IPv4>:5174/dev/`) : Paramètres → scénario « Extension cardinale — Centre + Est », puis Boutique → Île → Voir Ouest → Acheter (« + 16 cases »). La nouvelle parcelle se raccorde sans trait entre les parcelles.
5. **Mode Aménager** sur une grande île (scénario « Prairie dense — sélection et performances » ou « Île complète — 12 × 12 ») : la grille fine s'affiche, la pose et le déplacement restent fluides en zoomant et en glissant.
6. **Île maximale** : scénario « Île complète — 12 × 12 », dézoom maximal, aucune ligne fine entre les parcelles ; zoom maximal sur une frontière, aucune ligne non plus.
7. **Fluidité** : glisser et pincer sans saccade sensible sur l'île maximale, y compris pendant le placement d'un bâtiment.

Mode écran d'accueil : en HTTP local, il **n'est pas confirmé** sur l'iPhone du propriétaire (voir la section précédente). Les points ci-dessus se vérifient dans Safari ; un essai écran d'accueil nécessitera soit une confirmation de ce mode en HTTP, soit un HTTPS local séparé, jamais une publication Netlify automatique.

## Essai de la musique, des réglages du son et de l'écran de chargement

Même procédure (build compilé, `http://<IPv4>:5174/` et `/dev/`). Points à vérifier :
1. **Écran de chargement** : il apparaît dès l'ouverture, la barre avance, les cinq étapes se cochent ; rien ne réagit au toucher derrière lui. « Jouer » ferme l'écran et lance une musique ; le tutoriel et le message de bienvenue apparaissent ensuite.
2. **Musique** : une piste démarre au toucher de « Jouer » ; à la fin d'une piste, une autre enchaîne (les pistes durent 5 à 20 minutes ; pour tester l'enchaînement sans attendre, le laboratoire suffit à vérifier le démarrage, l'enchaînement étant couvert par les tests).
3. **Retour dans l'application** : changer d'app ou verrouiller l'iPhone, puis revenir : la musique doit être en pause pendant l'absence et reprendre la **même** piste au retour, jamais deux à la fois. Si elle ne reprend pas toute seule, un toucher dans le jeu doit la relancer.
4. **Bouton silencieux** : le jeu demande le mode « ambiant » si Safari le propose. Vérifier interrupteur activé puis désactivé et volume système audible : musique et bruitages doivent suivre les règles système. Vérifier également le mélange avec une autre app musicale. Ce comportement dépend de Safari/iOS ; signaler les résultats avec la version iOS, sans supposer qu'un comportement différent indique forcément un ancien iOS.
5. **Réglages** : Paramètres → Son ; couper et rétablir Musique et Bruitages séparément, déplacer les curseurs (le volume de la musique doit réellement changer sur iPhone), recharger la page : les réglages restent. Le laboratoire garde ses propres réglages.
6. **Mode écran d'accueil** : non confirmé en HTTP local (voir plus haut). S'il fonctionne, refaire les points 1 à 4 depuis l'icône : l'écran de chargement doit respecter l'encoche et la barre d'accueil.
7. **Portrait/paysage** : tourner pendant le chargement puis après Jouer ; barre, boutons et réglages restent accessibles et dans les safe areas. Faire une action réussie, par exemple nourrir un lapin, pour écouter le ping ; couper uniquement Bruitages doit supprimer ce ping tout en conservant la musique. Refaire avec uniquement Musique coupée et vérifier le ping.

L'agrandissement précédent de l'île a été testé avec succès sur iPhone en local par le propriétaire. La musique et le nouvel écran restent à vérifier sur cet appareil. Le serveur local n'est pas une publication. Si l'IP Wi-Fi change, l'adresse et donc le stockage Safari changent également : conserver la même adresse pour tester la persistance.
