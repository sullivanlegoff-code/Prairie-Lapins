#!/usr/bin/env bash
# Preserve original RGB; remove only connected background, then soften alpha.
# ImageMagick 7. Paille's background gradient ends before its intact ears.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
magick "$root/docs/reference/paille/source.png" -alpha on -fill none -fuzz 8% \
  -draw 'alpha 0,543 floodfill' -crop 408x520+0+24 +repage -trim +repage "$scratch/paille.png"
magick "$root/docs/reference/terre/source.png" -alpha on -fill none -fuzz 8% \
  -draw 'alpha 0,0 floodfill' -trim +repage "$scratch/terre.png"
for species in paille terre; do
  magick "$scratch/$species.png" -alpha extract -morphology Erode Diamond:1 \
    -blur 0x0.35 -level 1%,99% "$scratch/alpha.png"
  magick "$scratch/$species.png" "$scratch/alpha.png" -channel A -fx 'v.r' +channel \
    -bordercolor none -border 4 "$root/public/assets/rabbits/$species/$species-v1.png"
done
