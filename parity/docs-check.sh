#!/bin/bash
# Builds and compares the docs examples of some pages, safely next to other runs:
#   parity/docs-check.sh components/toolbar[,components/filter-bar] [example-filter]
# The gallery build is shared, so it runs under a lock; each run then keeps its own copy of both
# builds and its own output folder: parity/runs/<pages>/{react,flutter,out}.
set -euo pipefail
ui="$(cd "$(dirname "$0")/.." && pwd)"
pages="$1"
run="$ui/parity/runs/$(echo "$pages" | tr '/,' '__')"
mkdir -p "$run"
export PATH="/Users/mohamad/dev/flutter/bin:$PATH"

(cd "$ui" && npx vite build --config parity/vite.config.ts --outDir "$run/react" --logLevel error)

lock="$ui/parity/runs/.gallery.lock"
until mkdir "$lock" 2>/dev/null; do sleep 2; done
trap 'rmdir "$lock" 2>/dev/null || true' EXIT
node "$ui/flutter/tool/sync_docs_examples.mjs" --only "$pages"
(cd "$ui/flutter/example" && flutter build web --release --output "$run/flutter" 2>&1 | tail -2)
rmdir "$lock"

scenes=()
IFS=',' read -ra list <<< "$pages"
for p in "${list[@]}"; do scenes+=("docs:$p"); done
PARITY_REACT="$run/react" PARITY_FLUTTER="$run/flutter" PARITY_OUT="$run/out" \
  node "$ui/parity/compare.mjs" "${scenes[@]}" | { if [ -n "${2:-}" ]; then grep -- "$2"; else cat; fi; }
echo "captures: $run/out"
