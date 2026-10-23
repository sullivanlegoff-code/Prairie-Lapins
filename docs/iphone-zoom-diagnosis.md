# Pincement, reprise de l'app et projection — 2026-10-17

Retour du propriétaire sur iPhone, écran d'accueil, build `80de283` : installation et plein écran OK ; caméra qui monte au dézoom, page devenue très agrandie menus compris après une sortie/retour, plateau ressenti comme penché. Ce retour est celui du propriétaire, pas un essai Codex.

## Caméra : cause reproduite et correction

`src/ui/gestures.ts`, `Gestures.move` : distance entre les deux doigts, ancien/nouveau centre et déplacement du centre sont calculés correctement. `MeadowCamera.scale` prend le point monde sous l'ancien centre, change le zoom, puis compense la translation pour le retrouver sous le nouveau centre. Le défaut venait du `clamp` appelé ensuite : il voulait contenir tout le viewport dans les bornes du terrain + eau ; quand le viewport dépassait ces bornes, il imposait leur centre, puis soustrayait l'offset du HUD divisé par le zoom. Le point suivi changeait donc, même avec un pincement fixe. Reproduction numérique sur l'ancien code, 390 × 844 : déplacements écran verticaux 6,4 puis 31,6 pixels sur certains paliers ; ensuite 6,1 pixels par palier. Le signe correspond à une montée de la caméra, donc un déplacement de l'image vers le bas.

Le `clamp` actuel ne corrige que si moins de 80 pixels CSS de terre restent visibles sur un axe (ou la totalité du viewport/de la parcelle quand plus petits). `MeadowScene.updateVisibleRegions` lui fournit les parcelles réellement acquises, y compris disjointes : on choisit la correction minimale conservant une parcelle visible, sans considérer comme terre un trou d'eau entre deux parcelles. Pendant un choix d'extension, on utilise les neuf positions potentielles, puis on revient aux terres acquises à la fermeture. Les changements pendant un geste sont différés jusqu'au lever des doigts. Glisser et zoom partagent cette limite ; Recentrer conserve son focus et son zoom 1,05. Aucune valeur de projection ni illustration modifiée.

## Zoom de page : voie vérifiée, incident précis non instrumenté

Avant correction : viewport `width=device-width, initial-scale=1, viewport-fit=cover`, sans limite de zoom ; `html`, `body`, `#app` en `touch-action: manipulation` (autorise le pincement natif, contrairement au double toucher) ; canvas en `none`, panneaux en `pan-y`. `meadowInput.ts` ne recevait que les événements du canvas. Aucun gestionnaire `gesturestart`/`gesturechange` ne protégeait les autres surfaces, et aucune politique ne se réappliquait au retour de l'app. Un geste commencé sur HUD/fond, ou un geste natif WebKit après reprise qui ne passe pas par les PointerEvents du canvas, pouvait donc zoomer la page. Le fait que les menus aussi soient agrandis est cohérent avec un zoom de page ; sans capture de `visualViewport.scale` sur l'iPhone lors de l'incident, la cause exacte de la reprise reste une hypothèse, pas un fait mesuré.

`public/assets/app/standalone-zoom.js` est chargé de façon bloquante dans le head, avant le téléchargement/exécution de Phaser. Détection par `(display-mode: standalone)` ou `navigator.standalone`. Seulement en mode application : viewport `minimum-scale=1, maximum-scale=1, user-scalable=no`, CSS `pan-x pan-y` au niveau de la page, annulation de `gesturestart`/`gesturechange` et de `touchstart`/`touchmove` à plusieurs doigts (`capture`, `passive:false`). La politique est réappliquée sur `pageshow`, retour visible et changement de display-mode. Un seul doigt n'est pas annulé ; aucun PointerEvent n'est arrêté. Le canvas reste en `touch-action:none`, les panneaux en `pan-y` et le correctif double toucher reste intact.

Dans Safari classique : viewport original et `manipulation` conservés, gestes natifs bloqués seulement sur le canvas qui appartient à Phaser ; le zoom d'accessibilité de page reste autorisé sur les surfaces qui le permettaient déjà (pas les panneaux `pan-y`). Aucun changement au zoom système d'accessibilité iOS : une page web ne le contrôle pas. Aucune garantie sur le comportement natif de chaque version d'iOS n'est déduite des tests synthétiques.

Sources primaires : [Apple — événements de gestes et preventDefault](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html), [Apple — viewport](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html), [WebKit — différences Safari/WKWebView sur les limites de zoom](https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/).

## Impression de plateau incliné : diagnostic seul

Code : `gridPoint` projette régulièrement `x = 120 + colonne × 176`, `y = 120 + ligne × 148` (`src/config/visual.ts`). Les bords de `parcelArt.ts` ont la même largeur en haut/en bas, avec angles arrondis ; aucune convergence en trapèze. `MeadowScene.applyCamera` appelle un seul `setZoom` et `centerOn`, sans rotation. Les mises à l'échelle des illustrations sont uniformes. Les rotations trouvées concernent les variantes d'objets et les oreilles animées des lapins, pas le plateau.

Mesure d'une scène source en Chromium 390 × 844 : rotation caméra 0, zoomX = zoomY = 1,05 ; `transform` et `perspective` CSS à `none` sur canvas, `#game`, `#app`, body et html ; rapport taille CSS/intrinsèque du canvas égal à 1 sur les deux axes. Pas de cisaillement ni déformation réelle constatés. La projection est une vue aérienne 2D régulière, comprimée en profondeur (148/176 ≈ 0,84), sans points de fuite. Elle cohabite avec des bâtiments montrant toit et façade en trois-quarts, des lapins plutôt frontaux/trois-quarts et des ombres elliptiques. Ce mélange et les motifs aplatis au sol peuvent suggérer une table inclinée ; c'est une interprétation visuelle à confirmer avec le propriétaire.

Pistes, sans application :
- Faible à moyenne ampleur : harmoniser direction/intensité des ombres et les appuis au sol ; une partie des ombres est intégrée aux images.
- Moyenne ampleur : essayer une profondeur de grille moins comprimée. Cela modifierait l'espacement visuel et nécessiterait de revérifier placements, cadrages et sélections.
- Grande ampleur : harmoniser l'angle de vue des bâtiments, lapins et décorations dans une série d'illustrations cohérente, en conservant les sources actuelles.

## Parcours iPhone après publication manuelle

1. Vérifier la révision en ligne. Fermer complètement l'app depuis le sélecteur, puis la rouvrir pour charger le nouveau head/script ; conserver les données et l'icône existantes.
2. En portrait, choisir un détail du sol près du centre. Pincer lentement en gardant le milieu des deux doigts fixe, jusqu'au zoom minimum, puis réagrandir. Le détail doit rester sous ce milieu tant qu'il n'est pas nécessaire de garder la terre à l'écran. Déplacer les deux doigts ensemble, à distance constante : le détail doit suivre leur milieu sans zoom supplémentaire. Répéter en paysage et à différents endroits.
3. Glisser longtemps vers les quatre côtés et en diagonale : de la terre doit rester visible ; Recentrer doit retrouver le cadrage normal. Vérifier aussi Boutique → Île, retour, puis Recentrer.
4. Pincer au-dessus du HUD et d'un panneau : les menus ne doivent pas grossir. Ouvrir une longue liste de recettes et la défiler à un doigt ; revenir dans la prairie et vérifier son pincement Phaser.
5. Sortir vers l'écran d'accueil, attendre une dizaine de secondes, revenir ; répéter cinq fois, dont une fois après verrouillage/déverrouillage et une fois après rotation. Après chaque retour : refaire les gestes sur HUD, panneau et prairie. Vérifier la taille inchangée des menus et le fonctionnement des commandes. Ne pas confondre un mouvement normal de la prairie avec un agrandissement de toute l'interface.
6. Dans Safari classique, vérifier séparément que le zoom de page reste disponible hors canvas sur une surface autorisée ; le zoom du canvas reste celui du jeu.

Playwright Chromium/WebKit Windows vérifie les balises et les événements annulés, pas le zoom de page natif ni la suspension de l'app iOS. Le test iPhone de ce correctif reste à faire par le propriétaire.
