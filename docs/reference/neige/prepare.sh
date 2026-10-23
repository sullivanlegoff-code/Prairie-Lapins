#!/usr/bin/env bash
# Pixel-preserving background removal of the provided original. Requires ImageMagick 7.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
magick "$root/docs/reference/neige/source.png" -alpha on -channel A \
  -fx 'b>r+0.045 && g>r+0.025 ? 0 : 1' +channel -trim +repage "$scratch/cutout.png"
magick "$scratch/cutout.png" -alpha extract -morphology Erode Diamond:1 -blur 0x0.35 -level 1%,99% "$scratch/alpha.png"
magick "$scratch/cutout.png" "$scratch/alpha.png" -channel A -fx 'v.r' +channel \
  -bordercolor none -border 4 "$root/public/assets/rabbits/neige/neige-v1.png"
