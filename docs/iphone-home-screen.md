# Écran d'accueil iPhone

Le jeu déclare `display: standalone`, sans service worker ni cache hors ligne applicatif. Une connexion reste nécessaire au chargement ; le cache HTTP ordinaire du navigateur reste géré par l'hébergement. Aucune balise ajoutée n'exige de service worker. Le manifeste est à `assets/app/manifest.webmanifest` : `id`, `start_url` et `scope` relatifs `../../` reviennent à la racine du jeu, que la base soit `/` ou `/Project-L/`. Les icônes du manifeste sont relatives à ce fichier.

Les pages du laboratoire et de prévisualisation n'annoncent ni manifeste, ni balises Apple d'application, ni icône d'installation du jeu. Le plugin Vite retire ce bloc du HTML pour ces builds et pour `?dev=1` en développement. Les fichiers statiques copiés dans `/dev/assets/app/` ne constituent pas une déclaration d'application : aucune balise ne les référence dans le laboratoire. Sur iOS récent, l'utilisateur peut néanmoins choisir d'installer n'importe quel site ; ne pas installer le laboratoire comme jeu.

Barre d'état : `default`, avec contenu système adapté au fond clair ; pas de barre noire translucide à texte clair sur la crème du HUD. `viewport-fit=cover` et `env(safe-area-inset-*)` réservent l'encoche et la barre d'accueil. Aucun verrou d'orientation : en portrait le HUD compact et l'avertissement de portrait existant restent disponibles ; en paysage les marges latérales protègent les commandes de l'encoche. Les barres système iOS peuvent rester visibles : standalone retire l'interface de navigateur, pas nécessairement toute interface système.

Les règles existantes `overscroll-behavior: none`, page sans défilement, `touch-action: manipulation` en Safari et canvas `touch-action: none` sont conservées. Depuis le correctif du 2026-10-17, le mode standalone bloque aussi le zoom de page (viewport limité à 1, `touch-action: pan-x pan-y`, annulation des gestes natifs et touches multiples), avec réapplication à la reprise ; le défilement à un doigt et les PointerEvents Phaser restent disponibles. Les panneaux restent en `touch-action: pan-y`, défilants. Les champs de sauvegarde restent éditables. Les menus d'images/canvas et sélections accidentelles des commandes sont supprimés ; le correctif double toucher n'est pas retiré. [Diagnostic, limites et parcours de reprise iPhone](iphone-zoom-diagnosis.md).

## Installation après publication manuelle par le propriétaire

1. Vérifier que le nouveau dossier `netlify-site/` a été déposé et que `/build-revision.txt` correspond à la révision livrée.
2. Sur l'écran d'accueil de l'iPhone, maintenir l'ancienne icône du site et choisir sa suppression (selon iOS : « Supprimer le signet » ou « Supprimer l'app »).
3. Ouvrir explicitement **Safari**, puis `https://velvety-squirrel-142402.netlify.app/` (pas `/dev/`).
4. Ouvrir **Partager**, puis **Sur l'écran d'accueil**. Si l'action n'apparaît pas, la chercher dans **Modifier les actions**. Si le réglage **Ouvrir comme app web** apparaît, l'activer. Vérifier le nom et l'icône Paille, puis **Ajouter**.
5. Fermer Safari et ouvrir la nouvelle icône. Vérifier l'absence de barre d'adresse et de commandes Safari/Chrome, le jeu normal, le nom/l'icône dans le sélecteur d'applications.
6. En portrait puis en paysage : vérifier HUD et commandes hors encoche/barre d'accueil, accès à Paramètres, pincement et glisser de la prairie, défilement d'une longue liste de recettes, absence de rafraîchissement par tirage et de menu d'appui long sur les portraits. Vérifier les boutons sans zoom après double toucher. Fermer/réouvrir pour contrôler la sauvegarde locale.

Le propriétaire accepte que le stockage du mode application soit séparé de celui de Safari : une partie commencée dans Safari ne suit pas automatiquement. Aucun transfert ni changement de sauvegarde n'est ajouté dans cette tâche. La création et l'ouverture effectives sur l'iPhone restent à confirmer par le propriétaire ; les essais locaux n'en constituent pas la preuve.

Références consultées : [Apple — transformer un site en app dans Safari](https://support.apple.com/guide/iphone/iphea86e5236/ios), [Apple — balises prises en charge](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html), [WebKit — apps d'écran d'accueil dans Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).

## Icônes et provenance

Source intacte : `public/assets/rabbits/paille/paille-v1.png`, SHA-256 `005ac9f351bfe9614520b1e1998eee1421a5c6aff1c05bcf92172bbb52dd9dfe`. Icône dérivée générée avec l'outil intégré imagegen, puis réduite en PNG RGB opaques de 180, 192 et 512 pixels dans `public/assets/app/`. Paille assis, corps entier, oreilles et pieds visibles, fond vert pâle, sans texte ni coins arrondis incorporés. Il s'agit d'une adaptation générée, pas d'une copie pixel à pixel de l'illustration.

Prompt : « Create one square iPhone home screen app icon for Prairie de lapins using the attached owner's rabbit Paille illustration. Preserve this specific cream rabbit's identity, proportions, pink ears, large brown eyes, chest heart and gentle expression. Show the entire seated rabbit, ears and feet fully inside the square, centered with 10 percent breathing room. Flat uniform pale meadow green background #e8efd9, fully opaque edge to edge. No border, no rounded corners baked in, no shadow, no text, no additional objects. Faithfully composite the original illustration, do not invent a new character. Output a square master icon for resizing to 180, 192, and 512 pixels. »
