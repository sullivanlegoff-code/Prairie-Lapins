#!/usr/bin/env bash
# ImageMagick 7, original RGB retained; alpha only.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
magick "$root/docs/reference/belier-gris/source.png" -alpha on -fill none -fuzz 8% \
  -draw 'alpha 0,498 floodfill' -crop 561x491+0+8 +repage -trim +repage "$scratch/belier-gris.png"
magick "$root/docs/reference/feu/source.png" -alpha on -fill none -fuzz 8% \
  -draw 'alpha 0,0 floodfill' -trim +repage "$scratch/feu.png"
for species in belier-gris feu; do
  magick "$scratch/$species.png" -alpha extract -morphology Erode Diamond:1 \
    -blur 0x0.35 -level 1%,99% "$scratch/alpha.png"
  if [[ "$species" == belier-gris ]]; then
    # Keep the original fine whisker tips beyond the muzzle; erosion would remove them.
    magick "$scratch/$species.png" -alpha extract "$scratch/original-alpha.png"
    magick "$scratch/alpha.png" "$scratch/original-alpha.png" \
      -fx 'i>495 && j>120 && j<205 ? v : u' "$scratch/kept-alpha.png"
    mv "$scratch/kept-alpha.png" "$scratch/alpha.png"
  fi
  magick "$scratch/$species.png" "$scratch/alpha.png" -channel A -fx 'v.r' +channel \
    -bordercolor none -border 4 "$root/public/assets/rabbits/$species/$species-v1.png"
done

# Complete Volant original: original RGB, connected background removal only.
magick "$root/docs/reference/volant/source.png" -alpha on -fill none -fuzz 8% \
  -draw 'alpha 0,0 floodfill' -trim +repage "$scratch/volant.png"
magick "$scratch/volant.png" -alpha extract -morphology Erode Diamond:1 \
  -blur 0x0.35 -level 1%,99% "$scratch/alpha.png"
magick "$scratch/volant.png" "$scratch/alpha.png" -channel A -fx 'v.r' +channel \
  -bordercolor none -border 4 "$root/public/assets/rabbits/volant/volant-v1.png"
