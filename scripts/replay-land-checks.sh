#!/usr/bin/env bash
# Local replay of the browser checks of .github/workflows/validate-land.yml (Git Bash on Windows
# or any POSIX shell). Nothing is published. Requires Playwright 1.56.1 installed with --no-save
# (see AGENTS.md) and Python 3 for the static server.
# usage: bash scripts/replay-land-checks.sh <outside-Git-directory> [check-name ...]
set -u
cd "$(dirname "$0")/.."
OUT="${1:?output directory}"; shift || true
ONLY="$*"
REVISION="$(git rev-parse HEAD)"
mkdir -p "$OUT/land-proof" "$OUT/logs"
export MSYS_NO_PATHCONV=1 PRAIRIE_CAPTURE_DIR="$OUT/land-proof"
export PRAIRIE_CHROMIUM="$(node -e "console.log(require('playwright').chromium.executablePath())")"
export PRAIRIE_TEST_URL="http://127.0.0.1:5183/Project-L/?dev=1"
pids=()
cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT
wanted() { [ -z "$ONLY" ] || [[ " $ONLY " == *" $1 "* ]]; }
results=()
run() { # name, command...
  local name="$1"; shift
  wanted "$name" || return 0
  local start=$SECONDS
  if "$@" > "$OUT/logs/$name.log" 2>&1; then results+=("PASS $name $((SECONDS-start))s"); else results+=("FAIL $name $((SECONDS-start))s"); fi
  echo "${results[-1]}"
}
# 1. Terrain and touch gestures, on the dev server (base /Project-L/).
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort --base=/Project-L/ > "$OUT/logs/vite-land.log" 2>&1 & pids+=($!)
for _ in $(seq 1 60); do curl -fsS "$PRAIRIE_TEST_URL" > /dev/null 2>&1 && break; sleep 1; done
for check in migration-v6-browser-check parcels-browser-check decorations-selection-check snow-browser-check paille-terre-browser-check \
  belier-feu-volant-browser-check fine-buildings-browser-check manual-breeding-browser-check camera-overview-browser-check; do
  run "$check" node "docs/$check.cjs"
done
# 2. Compiled builds without injection (GitHub Pages layout /Project-L/ and /Project-L/dev/).
if [ ! -f "$OUT/site/Project-L/index.html" ] || [ "$(cat "$OUT/site/Project-L/build-revision.txt" 2>/dev/null)" != "$REVISION" ]; then
  VITE_BUILD_REVISION="$REVISION" npm run build:pages -- "$OUT/site/Project-L" > "$OUT/logs/build-pages.log" 2>&1 || { echo "build:pages failed"; exit 1; }
fi
python -m http.server 5185 --bind 127.0.0.1 --directory "$OUT/site" > "$OUT/logs/site-land.log" 2>&1 & pids+=($!)
for _ in $(seq 1 30); do curl -fsS http://127.0.0.1:5185/Project-L/ > /dev/null 2>&1 && break; sleep 1; done
export PRAIRIE_CHROMIUM=playwright
for check in nursery-art-browser-check nest-art-browser-check farm-art-browser-check production-browser-check laboratory-browser-check \
  foundations-browser-check snow-public-check paille-terre-public-check belier-feu-volant-public-check fine-buildings-public-check \
  camera-overview-public-check manual-breeding-public-check missions-current-public-check guided-start-public-check initiation-public-check \
  start-validation-public-check ui-comfort-public-check coin-public-check touch-policy-public-check; do
  run "$check" node "docs/$check.cjs" http://127.0.0.1:5185/Project-L/ "$REVISION"
done
printf '%s\n' "${results[@]}" > "$OUT/summary.txt"
echo "---"; cat "$OUT/summary.txt"; echo "$(grep -c '^PASS' "$OUT/summary.txt") passed, $(grep -c '^FAIL' "$OUT/summary.txt") failed"
