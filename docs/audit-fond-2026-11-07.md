# Audit de fond — 7 novembre 2026 (branche feature/noel)

Demande du propriétaire : reprendre tout le code, toutes les mécaniques et toute la mise à jour de Noël, corriger les défauts et optimiser le jeu. Il faut faire particulièrement attention aux défauts typiques d'un jeu HTML codé « à l'IA ».

## 1. Liste de ce qu'il faut vérifier

### A. Base saine
- [x] Types (`tsc --noEmit`), suite complète vitest, build du jeu et du laboratoire, `git diff --check`.
- [x] Erreurs ou avertissements dans la console au chargement et pendant une partie complète (partie jouée automatiquement).

### B. Défauts typiques d'un jeu HTML « vibe codé »
- [x] `innerHTML` construit avec des textes du joueur : nom de lapin, pseudo, e-mail (risque d'injection).
- [x] `localStorage` et `sessionStorage` sans `try/catch` : navigation privée sur Safari, quota plein.
- [x] Écouteurs d'événements, `setInterval`, `setTimeout` et `requestAnimationFrame` jamais retirés : fuites à chaque ouverture de panneau.
- [x] Rendus DOM complets trop fréquents : `render()` qui reconstruit tout à chaque seconde.
- [x] Boucle de jeu et musique qui continuent quand l'onglet est caché ou que l'iPhone est verrouillé : batterie.
- [x] Spécificités de l'iPhone :
  - `100vh` et zones sûres (`safe-area-inset`) ;
  - zoom au double toucher et loupe ;
  - sélection de texte et surbrillance au toucher ;
  - son débloqué au premier toucher ;
  - mode écran d'accueil ;
  - orientation.
- [x] Horloge : heure du téléphone qui recule ou avance (triche ou fuseau), `Date.now()` dispersé dans le code.
- [x] Nombres : `NaN`, `Infinity`, débordements, arrondis d'argent, valeurs négatives.
- [x] Promesses rejetées sans traitement, `catch` vides qui cachent des erreurs.
- [x] `console.log` oubliés, code mort, fichiers ou dépendances inutiles.
- [x] Doubles clics ou doubles touchers qui déclenchent deux fois une action payante.
- [ ] Accessibilité de base : boutons sans nom, contraste, tailles de toucher (44 px).

### C. Mécaniques et simulation
- [x] Chaque commande de `src/simulation/actions.ts` :
  - refus correctement motivés ;
  - aucune ressource créée ni perdue ;
  - pas d'XP en double.
- [x] Revenus des enclos, plafonds, temps hors ligne, accélérations en Cœurs.
- [x] Reproduction, nid, nurserie, chances (Épique ×1,5 / ×2), pitié, Benny.
- [x] Affection, statues, évolutions, défis d'évolution, plafond 30.
- [x] Missions quotidiennes et principales, série de 3 jours, cycles.
- [x] Fermes, cultures, nourriture, cuisine, voyages, salon, pique-nique, corde à sauter.
- [x] Économie : `docs/progression-simulation.mjs` (niveau 22 vers le jour 20).

### D. Sauvegarde et compte
- [x] Format v27 : migrations, refus des sauvegardes invalides, aller-retour sans perte.
- [x] Sauvegarde en ligne : conflits, hors ligne, double appareil, aucun secret dans le client.
- [x] Le laboratoire et `?dev=1` ne touchent jamais la partie normale.

### E. Mise à jour de Noël
- [x] Défis, bonus, sucres d'orge, bulles de pièces, cadeaux du ciel, bonhomme de neige, boules de neige.
- [x] Marché : décorations, Ultra neige, lapins de Noël (600).
- [x] Île enneigée, nuit et guirlandes, flocons.
- [x] Fin de l'événement : tout se désactive proprement et ce qui a été acheté reste.

### F. Performance et poids
- [x] Poids des images chargées au démarrage et poids total servi (`public/assets`).
- [x] Taille des fichiers JavaScript, chargements différés.
- [x] Coût par image de la scène Phaser : nombre d'objets, tweens, redessins des bulles.
- [x] Mémoire : textures jamais libérées, objets Phaser détruits.

## 2. Résultats

Trois relectures en lecture seule (interface et rendu, simulation et sauvegarde, Noël), puis contrôle de chaque défaut signalé dans le code avant correction. Aucun défaut grave (perte de partie, triche facile, injection, secret dans le client) n'a été trouvé.

### Vérifié et sain
- Noms de lapins et textes du joueur affichés avec `textContent`, jamais via `innerHTML` : pas d'injection.
- Tous les accès à `localStorage` sont protégés (navigation privée, quota plein).
- Les actions payantes passent par `ActionGate` : un double toucher ne paie pas deux fois.
- La musique se met en pause quand l'onglet est caché ; zones sûres et `dvh` gérés pour l'iPhone.
- Supabase est chargé à la demande, avec seulement la clé publique ; le laboratoire ne touche jamais la partie normale.
- Migrations de sauvegarde v16 à v27 et refus des sauvegardes invalides : déjà bien couverts par les tests.

### Corrigé
1. **Sauvegarde écrite toutes les 5 secondes** même sans rien faire : elle est maintenant écrite au plus une fois par minute pendant le jeu passif, et toujours quand l'onglet est caché ou quitté (`GameController.refresh`, `PASSIVE_SAVE_MS`).
2. **Bulles de pièces reconstruites toutes les 5 secondes** (le petit saut repartait de zéro, objets Phaser recréés) : elles ne sont redessinées que si elles changent (`MeadowScene.drawBubbles`).
3. **L'île continuait d'être dessinée derrière la boutique, le marché, la Cuisine et les jeux plein écran** : la boucle Phaser se met en veille tant qu'un écran plein la couvre (`main.ts`, `ISLAND_COVER_EVENT`).
4. **Travail inutile à chaque image** : la préférence « réduire les animations » est lue une seule fois au lieu d’être redemandée au navigateur à chaque appel (14 endroits) ; les lueurs de nuit ne sont calculées que la nuit ; la minuterie de l'interface tourne 4 fois par seconde au lieu de 60.
5. **Gestes iPhone** : plus de surbrillance grise au toucher ni de sélection de texte ou de loupe sur les boutons et panneaux (les champs de saisie restent sélectionnables).
6. **Lapins de Noël du marché achetables sous le niveau requis** de leur espèce : refus `LEVEL_REQUIRED` comme ailleurs.
7. **Bonhomme de neige** : en supprimant l'enclos puis en rechargeant, on pouvait en faire un deuxième le même jour ; il reste maintenant enregistré.
8. **Sauvegarde en ligne et Benny** : si l'heure du téléphone reculait, la recharge de Benny faisait croire à un changement et pouvait provoquer un conflit inutile ; elle est maintenant comptée comme les autres délais (format d'empreinte 4, repris automatiquement).
9. **Poids** : 7 images jamais utilisées retirées (environ 5,7 Mo de moins à servir).

### Restant (non corrigé, à décider ou mineur)
- **Musique `dragon-chill.mp3` de 19,5 Mo** : à ré-encoder vers 2 à 3 Mo (128 kbit/s suffit). Aucun outil de conversion n'est installé sur la machine.
- **Palais Ultra neige** : après la fin de l'événement, il ne peut plus être amélioré, et les sucres d'orge dépensés sont perdus si on le retire. C'est une règle de jeu : décision du propriétaire.
- **Défis de Noël du tout premier jour** d'une partie (ou du jour de lancement de l'événement) : tant qu'aucun défi n'a avancé, la liste peut changer quand l'île grandit (une ferme, le niveau 2). Aucune progression n'est perdue : le tirage est enregistré au premier défi avancé. L'enregistrer plus tôt changerait toutes les sauvegardes neuves ; laissé tel quel.
- Mineurs, laissés tels quels : la position du bandeau du haut est relue à chaque image (coût faible) ; un écouteur d'annulation de l'évolution n'est pas retiré (fuite négligeable, un par évolution).
