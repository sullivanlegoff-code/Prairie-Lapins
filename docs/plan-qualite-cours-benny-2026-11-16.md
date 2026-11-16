# « Cours cours Benny ! » — audit et plan d'action vers la qualité de Blade of Brim (16 novembre 2026)

Objectif du propriétaire : « un jeu aussi qualitatif que Blade of Brim ». On s'inspire du genre (cadrage, échelle, rythme, effets), jamais de ses dessins, de ses personnages ni de ses niveaux.

## 1. Comment l'audit a été fait

- Comparaison avec les 21 captures iPhone de Blade of Brim et les trois vidéos du propriétaire (`assets-source/Cours cours benny/`, jamais dans Git).
- Une vraie partie jouée dans Chromium au format d'un iPhone (390 × 844, densité 2), avec une capture toutes les 2,5 s, plus des scènes ciblées : tailles, ennemis, coffre, murs des trois mondes.
- Mesure de fluidité dans Chromium sans carte graphique : 17 ms par image en médiane, 24 ms pour les 5 % les plus lents. C'est assez bon, mais **rien n'est mesuré sur iPhone**.
- Lecture du code : `src/ui/BennyRunActivity.ts` (1 787 lignes) et `src/simulation/bennyRun.ts` (1 232 lignes).

## 2. Ce qui est déjà au niveau

- **Caméra.** Elle est proche et basse derrière Benny, trois voies qui remplissent l'écran, une route qui serpente et monte un peu.
- **Gestes.** Ils sont complets : sauter, glisser, changer de voie, courir sur un mur, bondir d'un mur à l'autre, frapper en changeant de voie, faire un coup lointain ou une roulade.
- **Benny.** Elle est peinte et proche de celle du jeu : course, saut, roulade, bond d'attaque, retombée, chute.
- **Décor de la prairie.** Il est complet et peint : sol à dalles, murs à tranches (le socle bleu clair signale qu'on peut courir dessus), barrière miel, objets de bord, ciel. La lave et la neige ont leurs sols et leurs murs.
- **Tailles.** Depuis le lot 162, les objets et ennemis sont proches de l'échelle de Blade of Brim, et les objets de bord frôlent la caméra.
- **Effets.** Ils sont nombreux : éclats, anneaux, petite pause au coup, traînée arc-en-ciel, « 3 COUPS », secousses, Frénésie.
- **Fin de partie.** La Dragon rattrape Benny dans une scène dessinée (« Rends-moi mon trésor ! »).

## 3. Les écarts, du plus visible au moins visible

| # | Écart | Ce qu'on voit chez nous | Ce que fait Blade of Brim |
|---|---|---|---|
| A | **Textes posés sur la route** | Aides, défis et alertes (« Aïe ! La Dragon arrive ! », « Un pot doré ! Frappe-le… ») en bandeaux semi-transparents au milieu de l'écran, souvent par-dessus la route à 20–60 m ; jusqu'à trois textes à la fois | Le centre de l'écran reste libre. Défi en bas, score en haut, quelques gros mots d'action (« 3 COUPS ») et c'est tout |
| B | **Interface pauvre** | Petit score en haut à gauche, mètres et pièces en petit | Bandeau du haut fort : vies (cœurs), score avec trophée, multiplicateur, boutons d'aide sur le côté |
| C | **Obstacles encore « bruts »** | Rochers d'éboulement = petits cailloux gris ; étiquettes « saute » / « roulade » minuscules et illisibles ; coffres alignés qui se chevauchent en pile | Chaque obstacle est un objet peint et volumineux qu'on reconnaît à 40 m, sans texte |
| D | **Mondes lave et neige incomplets** | Objets de bord de la prairie (roses, citrouilles) sur la lave ; mêmes ennemis partout ; ciel identique | Chaque monde a ses ennemis, ses objets, sa lumière |
| E | **Écran de fin** | Carte blanche avec une liste de chiffres, souvent « 0 mur, 0 esquive, 0 défi » | Écran de récompense animé : butin qui se compte, record, envie de rejouer |
| F | **Monotonie sur la durée** | 270 m de prairie dans la partie test ; motifs qui reviennent | Scènes fortes régulières : ponts, chutes, couloirs d'ennemis, mini-boss, pluie de pièces |
| G | **Impact des coups** | Bon, mais le « +10 » est petit et gris ; Benny tient le bâton dans la bouche en courant et dans la patte au coup | Coups très lisibles : arc d'arme net, ennemi qui vole, chiffre doré qui saute |
| H | **Méta-jeu** | Pièces converties en pattes pour un nombre de courses par jour, défis, record | Équipement, améliorations, quêtes, coffres, boss : raisons de revenir |
| I | **Sur iPhone : inconnu** | Fluidité, lisibilité au doigt, taille réelle | — |

## 4. Plan d'action

Chaque lot est court, contrôlé dans Chromium (captures) et testé avant le suivant. Le propriétaire essaie sur iPhone à la fin de chaque phase.

### Phase 1 — Lisibilité et sensation (priorité 1 : c'est ce que le joueur voit à chaque seconde)

1. **Libérer le centre de l'écran (A).**
   - Une seule aide à la fois, en haut, sous le score, sur une étiquette pleine et lisible.
   - Les alertes de danger (« La Dragon arrive ») deviennent un signe visuel : bord de l'écran rougi et Dragon qui se rapproche à l'image.
   - Le défi reste en bas, comme aujourd'hui.
2. **Nouveau bandeau du haut (B), au style de l'interface B du jeu (pierre et parchemin, Lilita One).**
   - Il porte le score, les mètres, les pièces et le multiplicateur de combo.
   - Il ajoute un indicateur de « chocs avant la Dragon » qui remplace le texte.
3. **Plus de textes sur les obstacles (C).**
   - Les étiquettes « saute » et « roulade » sont remplacées par des pictogrammes peints (flèche haut, flèche bas) au-dessus de l'obstacle pendant les premières rencontres seulement.
4. **Coups plus forts (G).**
   - Le chiffre de points devient doré, cerné et plus gros, et il saute.
   - Un ennemi frappé est projeté un peu plus loin.
   - Le bâton reste dans la patte pendant tout le coup.
5. **Coffres et pots alignés (C).**
   - Un écart minimal entre deux objets de la même voie, pour qu'ils ne se chevauchent plus à l'écran.
   - Les règles ne changent pas, seulement leur placement.

### Phase 2 — Dessins qui manquent (priorité 2)

Pour chaque élément, Codex produit les images et l'intégration suit le modèle des lots précédents.

6. **Obstacles peints en volume (C).**
   - Il s'agit des rochers d'éboulement, des piliers, de la barrière basse, de la poutre de roulade et du tremplin, dans le style de la prairie, lisibles de loin.
7. **Lave et neige complètes (D).**
   - Chaque monde reçoit ses objets de bord (3 × 3 par monde).
   - Il reçoit aussi un ciel propre : fumées et lueur rouge sur la lave, ciel froid et flocons sur la neige.
   - Les ennemis sont recolorés ou ont leur version (braise sur la lave, boule de neige vivante sur la neige), **sur décision du propriétaire** : ce sont de nouveaux personnages.
8. **Effets peints.**
   - Éclats de pot, poussière, étincelles du bâton.
   - Aujourd'hui ce sont des points de couleur dessinés par le code.

### Phase 3 — Rythme et variété (priorité 3)

9. **Scènes fortes.**
   - Toutes les 30 à 45 s, une séquence marquée : pont étroit au-dessus du vide, couloir de dragonnets à enchaîner, pluie de pièces sur un mur, grande descente.
   - Elles utilisent les règles existantes, sans nouvelle règle.
10. **Passage d'un monde à l'autre.**
    - Il devient une vraie scène (porte, pont, changement de lumière) au lieu d'un simple fondu.
11. **Réglage de la difficulté avec le robot de partie.**
    - Courbe de vitesse et densité, pour garder une première minute douce et une montée nette.

### Phase 4 — Fin de partie et envie de rejouer (priorité 4)

12. **Écran de fin animé (E).**
    - Le butin se compte pièce par pièce, le record s'anime, et seules les lignes qui ne valent pas zéro apparaissent.
    - Le bouton « Rejouer » est mis en avant.
13. **Méta-jeu (H) — décisions du propriétaire avant tout code.**
    - Améliorations des pouvoirs (durée de l'aimant, de la bulle…) achetées avec les pièces de course.
    - Quêtes de la semaine, ou un mini-boss de la Dragon.
    - Tout changement d'économie passe par `node docs/progression-simulation.mjs`.

### Phase 5 — Finition et iPhone (en continu)

14. **Fluidité.**
    - Garder un sol simple automatique sur appareil lent (déjà en place).
    - Ajouter, en mode `?dev=1` seulement, un compteur d'images par seconde affiché à l'écran, que le propriétaire pourra lire sur son iPhone (il n'existe pas encore).
15. **Son.**
    - Le jeu appelle déjà les bruitages du jeu principal ; une ambiance par monde et des sons de coups plus riches seraient un vrai plus.
    - **Décision du propriétaire** (le son était exclu de cette mission jusqu'ici).
16. **Suite complète, builds, puis fusion dans `main`** quand le propriétaire le demande.

## 5. Décisions qui reviennent au propriétaire

- Ennemis propres à la lave et à la neige (nouveaux personnages) : oui ou non, et lesquels.
- Méta-jeu : améliorations, quêtes, boss, ou rien de plus.
- Son et musique de la course.
- Vies affichées en cœurs (comme Blade of Brim) à la place de la règle actuelle des chocs avant la Dragon : c'est un changement de règle.

## 6. Ordre conseillé

Phase 1 en entier (lots 1 à 5), puis essai iPhone par le propriétaire, puis phase 2. Les phases 3 et 4 attendent les décisions de la section 5.
