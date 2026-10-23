# Neige — image originale v1

Cette livraison concerne uniquement `neige`. L’original fourni, déjà présent sous le nom historique « Lapin Hotot Blanc », est conservé dans [source.png](reference/neige/source.png). Le nom et l’identifiant de l’espèce en jeu restent Lapin Neige / `neige`.

Le [PNG préparé](../public/assets/rabbits/neige/neige-v1.png) conserve les pixels colorés de l’original. Détourage du bleu, adoucissement du bord alpha et marge transparente de quatre pixels : aucune illustration générée intégrée, aucune déformation ni étirement. Les deux oreilles restent visibles. Le script [prepare.sh](reference/neige/prepare.sh) reproduit la préparation avec ImageMagick 7. Comparaison des RGB sur tous les pixels complètement opaques, par rapport au rectangle source correspondant : différence maximale **0**.

- Source : SHA-256 `b7d3db45119155de6cad4e276c6d94b509fe68d79cb20f5c1a8ab3ee6e2f0765`.
- Asset : 518 × 473 RGBA, SHA-256 `b85337b3d3b3079644fb3df3e7f13f50e4226a0389a5b1a1c95fabf3f348276a`.
- Configuration de présentation : `src/config/rabbitArt.ts`, associée uniquement à l’identifiant stable `neige`. Même URL pour Phaser, fiche, boutique, collection, carnet, accueil et choix des parents ; base correcte dans le normal et le laboratoire.
- Scène : largeur locale 48, échelle uniforme, origine au sol. Animation existante appliquée à l’image entière par translation ; aucune articulation d’oreilles ou déformation.
- Sélection : masque alpha de Neige évalué au toucher, sans grande zone rectangulaire recouvrant les voisins. Priorité de proximité des occupants, bulles, panneaux et boutons conservée ; les autres espèces gardent leur sélection et leur rendu existants.

[Référence et capture de la fiche](validation/neige-v1/reference-vs-game.png) · [Sept occupants](validation/neige-v1/seven-occupants.png) · [Zoom maximal](validation/neige-v1/zoom-max.png).

Contrôles locaux : TypeScript et builds normal/laboratoire ; tests du rendu partagé et de la sélection, plus la suite existante. Le navigateur sélectionne individuellement sept occupants mixtes du jardin enneigé aux zooms 0,8 / 1,05 / 1,65, puis contrôle fiche, boutique, collection, parents et viewport portrait. Les hooks de ce parcours sont injectés seulement dans les sources Vite de test, jamais dans l’application publiée. [Rapport](validation/neige-v1/browser.json).

Le second parcours contrôle les builds sans hooks ni injection de sauvegarde : empreinte SHA-256 de l’asset réellement servi, alpha nul dans le coin, pixel blanc/rosé du pelage `[254,243,249,255]`, dimensions naturelles, affichage `contain`, portraits et captures de scène dans les deux routes. Il est aussi exécuté après publication.

Format v6, règles, sauvegardes, autres lapins, caméra, île et décorations inchangés. Supabase/email restent en pause. Aucun travail sur le prochain lapin.

Les captures et tests utilisent Chromium avec viewport mobile et émulation tactile ; ils ne constituent pas une validation Safari sur iPhone physique. À vérifier sur iPhone : toucher Neige dans un habitat chargé, regarder sa fiche et la boutique en portrait/paysage, puis zoomer au minimum et au maximum.
