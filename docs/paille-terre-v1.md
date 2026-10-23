# Paille et Terre — originaux v1

Seuls les visuels `paille` et `terre` sont remplacés. Sources exactes ajoutées par le joueur sur `production`, conservées dans [Paille](reference/paille/source.png) et [Terre](reference/terre/source.png). Les autres fichiers du catalogue restent disponibles pour une étape ultérieure.

| Espèce | Source SHA-256 | Asset transparent | Dimensions | Largeur monde |
| --- | --- | --- | --- | --- |
| Paille | `10918fd0b34953aa264bf0572b8f76835f447926cfce7e18d086e1c4e1e8e0f9` | [paille-v1.png](../public/assets/rabbits/paille/paille-v1.png) | 350 × 495 | 40 |
| Terre | `0314ef1cd4127ac39c6f40fcc5a505295547fd9e9be64a4c3f1c6c94a7077b50` | [terre-v1.png](../public/assets/rabbits/terre/terre-v1.png) | 992 × 907 | 48 |

[Préparation reproductible](reference/prepare-paille-terre.sh) avec ImageMagick 7 : fond connecté retiré, frange nettoyée sur le canal alpha seulement, recadrage et marge transparente de quatre pixels. Le bandeau gris du fond Paille s’arrête avant les oreilles et est retiré. Ni redessin, ni génération, ni modification des couleurs, du cœur ou des pierres. [Comparaison des pixels](validation/paille-terre-v1/pixel-fidelity.json) : différence RGB maximale **0** sur tous les pixels opaques par rapport à la source, soit 101 525 pixels Paille et 522 194 pixels Terre. Les comparaisons des captures de fiche sont agrandies uniformément pour être lisibles ; l’anticrénelage du navigateur explique leur résolution plus basse.

[Paille : référence / capture](validation/paille-terre-v1/paille-reference-vs-game.png) · [Terre : référence / capture](validation/paille-terre-v1/terre-reference-vs-game.png) · [Sept occupants mixtes](validation/paille-terre-v1/seven-occupants.png) · [Parents](validation/paille-terre-v1/parents.png) · [Orientation portrait](validation/paille-terre-v1/portrait.png).

L’association aux identifiants stables est isolée dans `src/config/rabbitArt.ts`. Phaser précharge chaque texture une seule fois et réutilise ses pixels dans les habitats. Les fiches, boutique, collection, carnet, découverte et parents utilisent le même PNG via `portrait()`. Les espèces inconnues restent masquées selon les règles existantes.

Échelle uniforme et ancrage `(0.5, 1)` à `y = 12`, comme Neige ; la largeur de Paille respecte sa posture verticale et ses proportions propres. Les translations et petits sauts existants animent toute l’image ; aucune déformation ni nouvelle animation. Chaque sélection inverse la transformation du sprite et consulte **sa propre** silhouette alpha, y compris les oreilles. Priorités des panneaux, bulles, gestes, mode photo et aménagement conservées.

Neige conserve son PNG SHA-256 `b85337b3d3b3079644fb3df3e7f13f50e4226a0389a5b1a1c95fabf3f348276a`, ses dimensions 518 × 473, largeur monde 48, ancrage, CSS et animation. Aucun changement de règles, format v6, sauvegardes, caméra, île ou décorations ; Supabase/email restent en pause.

Validation locale : 586 tests / 18 fichiers, TypeScript, builds normal et laboratoire ; [contrôle source](validation/paille-terre-v1/browser.json), 21 sélections individuelles aux zooms 0,8 / 1,05 / 1,65 et sélection des oreilles ; [contrôle des builds sans hooks](validation/paille-terre-v1/local-builds.json), SHA-256 des trois originaux, dimensions, transparence et portraits. Les scripts correspondants sont rejoués en CI et sur les routes publiques.

Limite : Chromium avec émulation tactile et écrans 852 × 393 / 390 × 844 ; aucun iPhone Safari physique disponible. Sur iPhone, vérifier les sept sélections, le pincement sans sélection, les portraits et le retour en jeu.

Livraison validée : application `5248235`, [PR nº 6](https://github.com/sullivanlegoff-code/Project-L/pull/6), [CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043020922), [publication et cinq suites publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043530418). [Preuve durable](validation/paille-terre-v1/publication.json).
