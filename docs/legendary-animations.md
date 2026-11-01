# Animations des légendaires (Lapin Dragon, Lapin Requin, Ankylosaure)

Demande du propriétaire du 31 octobre 2026 : animations de lapins légendaires sans changer leurs dessins. Toutes les images sont des peintures ChatGPT (carte blanche donnée à l'assistant) ; les sources brutes restent dans `output/imagegen/legendaires-v1/` (hors Git). Le 1er novembre 2026, le propriétaire a ajouté l’Ankylosaure, avec des animations autour de la terre (apparition par un grand tremblement de terre, coup de queue en massue sur le sol) ; ses peintures sont dans `output/imagegen/ankylosaure-effets-v1/`.

## Ce que voit le joueur

- **Première apparition** (`src/ui/legendaryReveal.ts`) : plein écran.
  - Dragon : cinq murs de feu peints montent du bas et descendent du haut, les cinq peintures se relaient pour faire danser le feu, des braises s'envolent ; le feu s'éteint et le Dragon apparaît devant un halo doré qui tourne.
  - Requin : trois vagues peintes montent et déferlent, l'écume couvre l'écran, puis des gouttes glissent et des bulles montent ; le Requin apparaît devant le halo doré.
  - Ankylosaure : un grand tremblement de terre secoue l’écran, le sol se fend depuis le milieu (peinture de faille), des rochers et des cailloux tombent, un mur de poussière monte puis retombe ; l’Ankylosaure apparaît devant le halo doré.
  - Un toucher passe à la fin. Avec « réduire les animations », la fin s'affiche directement.
  - « Revoir l'apparition » dans la fiche de l'espèce (Collection). La liste de la Collection reste sans reflet.
- **Fiches** (`src/ui/legendaryCard.ts`, `src/display/legendary-card.css`) : la fiche du lapin et sa fiche d'espèce sont aux couleurs du feu (Dragon), de l'eau (Requin) ou de la terre (Ankylosaure) : bandeau peint (mur de feu, grande vague, coupe des couches du sol) derrière le titre, page teintée, braises, bulles ou poussière et graviers qui montent sur les côtés derrière le texte, halo doré tournant et quatre éclats derrière le grand portrait.
- **Dans l'enclos** (`src/display/legendaryEffects.ts`, logique pure dans `legendaryTimeline.ts`) :
  - aile, aileron ou queue en massue qui bouge ; aucun halo ni étincelle dorée dans l'enclos (le brillant est réservé à l'apparition et aux fiches) ;
  - Dragon touché : il ouvre la bouche et crache du feu (six images de souffle), un cercle de flammes animées (six images) et des braises ; de temps en temps : fumée des narines, hoquet de feu, braises ;
  - Requin touché : il plonge dans une flaque, seul l'aileron tourne, puis il ressort avec une éclaboussure ; de temps en temps : surf de 2 secondes sur une planche avec une petite vague, bulles, éclaboussure. Il ne crache jamais d'eau.
  - Ankylosaure touché : il lève sa queue en massue et frappe le sol ; le sol se fissure, un anneau de poussière s'étend, des cailloux volent et l'enclos tremble un court instant (pas de secousse avec « réduire les animations ») ; de temps en temps : grondement (il tremble, des graviers sautillent), il creuse (mottes de terre lancées en arrière, petit tas qui grossit), petit nuage de poussière.
  - Premier spectacle spontané après 10 à 25 s, puis toutes les 40 à 95 s ; endormis, seulement fumée, bulles ou poussière. Rien n'est sauvegardé et le générateur aléatoire du jeu n'est pas utilisé.
- **Laboratoire** (`/dev/`) : section « Animations légendaires » pour rejouer les trois apparitions et chaque spectacle d'enclos.

Décisions : halo doré aussi pour le Requin ; pas de son ; mouvement réduit = pas de spectacle spontané, aile immobile, halo des fiches immobile, ni braises ni bulles. Le 31 octobre 2026, le propriétaire a retiré le brillant de l'enclos et le reflet de la Collection : il ne doit apparaître qu'à l'apparition et dans les fiches.

## Refaire les images

1. Effets : `node scripts/prepare-legendary-effects.mjs --sources output/imagegen/legendaires-v1` (découpe et détourage vers `assets-source/effects/legendary/`), puis `node scripts/prepare-legendary-effects.mjs` (WebP dans `public/assets/effects/legendary/`, avec Playwright via `PLAYWRIGHT_MODULE`).
2. Bouche ouverte : `node scripts/prepare-dragon-mouth.mjs output/imagegen/legendaires-v1/dragon-bouche-1.png` (seul le museau de la retouche est repris, recalé sur le master approuvé).
3. Aile, aileron, queue et corps : `node scripts/prepare-legendary-parts.mjs`. Pour la queue de l'Ankylosaure, la base de la queue reste aussi dans le corps, pour qu'aucun trou n'apparaisse quand la massue se lève.
4. Effets de terre : `node scripts/prepare-legendary-effects.mjs --sources output/imagegen/ankylosaure-effets-v1` (seules les peintures présentes dans le dossier sont redécoupées).

Les tailles déclarées dans `src/config/legendaryArt.ts` sont vérifiées par `tests/legendary-animations.test.ts`.
