# Lot 2 — corrections de Benny Rampage à transmettre (23 novembre 2026)

Ces corrections viennent du plan `docs/plan-amelioration-2026-11-23.md`. Elles concernent seulement les fichiers de Benny Rampage
(`src/ui/BennyRunActivity.ts`, `src/ui/bennyRun*.ts`, `src/simulation/bennyRun*.ts`, `src/display/benny-run.css`). Une autre conversation y travaille :
cette branche (`feature/vol-audit`) n'y a pas touché. Les numéros de ligne datent de l'audit du 23 novembre et ont pu bouger.

Pour chaque correction : un test qui la prouve, puis les tests ciblés ; `npx tsc --noEmit` et les deux builds ; un contrôle dans
Chromium ; un commit en français par correction. Ni dessin, ni dialogue de Paille, ni économie ne changent.

| # | Problème | Correction demandée |
|---|---|---|
| 2.1 | « Quitter » depuis la pause jette la course sans prévenir (`BennyRunActivity.ts`, vers la ligne 2392). | **Décision du propriétaire (D2) :** la course est payée comme si elle était finie (pièces, cœurs, record), dans la limite du jour, puis la fenêtre de fin s'affiche. |
| 2.2 | Un passage lent au début (chargement des images) baisse la qualité pour toutes les courses suivantes (vers les lignes 899-913). | Remettre la qualité à fond au début de chaque nouvelle course. |
| 2.3 | Après une perte du contexte graphique (fréquente sur iPhone après un passage en arrière-plan), le sol reste en mode lent jusqu'au rechargement (`src/ui/bennyRunFloor.ts`, vers la ligne 185). | Reconstruire le sol quand le contexte revient (`webglcontextrestored`). |
| 2.4 | Environ 100 Mo de textures préparées, dont une bonne partie n'est jamais dessinée (vers les lignes 419-430). Le canvas WebGL garde sa taille après la sortie. | Ne préparer que ce qui est dessiné ; vider le canvas (taille 1 × 1, contexte perdu volontairement) à la fermeture. Gain estimé : 25 à 35 Mo. |
| 2.5 | Des milliers de petits objets créés à chaque image, et des recalculs de mise en page à chaque pièce ramassée. | Projection sans créer d'objets ; animations des pièces en Web Animations (sans relire la mise en page) ; dos de la barrière dessiné seulement de près. |
| 2.6 | Le bouton peut rester sur « Chargement… » si le téléphone est tourné en portrait pendant le chargement. | Remettre le libellé normal dans tous les cas. |
| 2.7 | Petites aides qui manquent. | « Esquive ! » les 3 premières fois ; pièces et cœurs gagnés affichés dans la fenêtre de pause ; « Encore N courses récompensées aujourd'hui » au départ. Textes au tutoiement. |
| 2.8 | Fichier de 2 460 lignes difficile à modifier. | Le découper par étapes, sans changer le comportement : caméra, images, effets, piste, personnages, affichage. À faire en dernier. |

Déjà fait sur `feature/vol-audit`, utile pour Rampage :
- `pauseWhenLeft(pause, signal)` dans `src/ui/activityPause.ts` met un mini-jeu en pause quand Safari range la page
  (`visibilitychange` et `pagehide`). Rampage peut l'utiliser pour sa propre pause.
- Les cœurs de Rampage (4 par course, au plus 12 par jour dès le niveau 25) sont comptés dans le calendrier des cœurs
  (`tests/heart-calendar.test.ts`, décision D7). Si une correction change ces nombres, ce test le dira.
