# Animations des légendaires (Lapin Dragon, Lapin Requin)

Demande du propriétaire du 31 octobre 2026 : animations de lapins légendaires sans changer leurs dessins. Toutes les images sont des peintures ChatGPT (carte blanche donnée à l'assistant) ; les sources brutes restent dans `output/imagegen/legendaires-v1/` (hors Git).

## Ce que voit le joueur

- **Première apparition** (`src/ui/legendaryReveal.ts`) : plein écran.
  - Dragon : cinq murs de feu peints montent du bas et descendent du haut, les cinq peintures se relaient pour faire danser le feu, des braises s'envolent ; le feu s'éteint et le Dragon apparaît devant un halo doré qui tourne.
  - Requin : trois vagues peintes montent et déferlent, l'écume couvre l'écran, puis des gouttes glissent et des bulles montent ; le Requin apparaît devant le halo doré.
  - Un toucher passe à la fin. Avec « réduire les animations », la fin s'affiche directement.
  - « Revoir l'apparition » dans la fiche de l'espèce (Collection) ; reflet doré discret sur les cartes légendaires de la Collection.
- **Dans l'enclos** (`src/display/legendaryEffects.ts`, logique pure dans `legendaryTimeline.ts`) :
  - halo doré permanent et discret, trois petites étincelles, aile ou aileron qui bouge ;
  - Dragon touché : il ouvre la bouche et crache du feu (six images de souffle), un cercle de flammes animées (six images) et des braises ; de temps en temps : fumée des narines, hoquet de feu, braises ;
  - Requin touché : il plonge dans une flaque, seul l'aileron tourne, puis il ressort avec une éclaboussure ; de temps en temps : surf de 2 secondes sur une planche avec une petite vague, bulles, éclaboussure. Il ne crache jamais d'eau.
  - Premier spectacle spontané après 10 à 25 s, puis toutes les 40 à 95 s ; endormis, seulement fumée ou bulles. Rien n'est sauvegardé et le générateur aléatoire du jeu n'est pas utilisé.
- **Laboratoire** (`/dev/`) : section « Animations légendaires » pour rejouer les deux apparitions et chaque spectacle d'enclos.

Décisions de l'assistant : halo aussi permanent (discret) dans l'enclos ; halo doré aussi pour le Requin ; pas de son ; mouvement réduit = pas de spectacle spontané, aile et halo immobiles.

## Refaire les images

1. Effets : `node scripts/prepare-legendary-effects.mjs --sources output/imagegen/legendaires-v1` (découpe et détourage vers `assets-source/effects/legendary/`), puis `node scripts/prepare-legendary-effects.mjs` (WebP dans `public/assets/effects/legendary/`, avec Playwright via `PLAYWRIGHT_MODULE`).
2. Bouche ouverte : `node scripts/prepare-dragon-mouth.mjs output/imagegen/legendaires-v1/dragon-bouche-1.png` (seul le museau de la retouche est repris, recalé sur le master approuvé).
3. Aile, aileron et corps : `node scripts/prepare-legendary-parts.mjs`.

Les tailles déclarées dans `src/config/legendaryArt.ts` sont vérifiées par `tests/legendary-animations.test.ts`.
