#!/usr/bin/env bash
# Runs check-component.sh over every component folder: the library's <LivingCity>, and the demo site's route
# component, each feature's components and the shared UI. Also: no source file in the package over 300 lines.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
for dir in src/LivingCity/ site/src/app/*/ site/src/features/*/components/*/ site/src/shared/ui/*/; do
  bash scripts/check-component.sh "${dir%/}" > /tmp/check-component.out 2>&1 || fail=1
  grep -E '^(FAIL|OK)' /tmp/check-component.out
done
# no !important anywhere in the site's styles, and no effects in the site or the library
if grep -rn '!important' site/src src --include='*.css'; then echo 'FAIL !important in styles'; fail=1; fi
while IFS= read -r f; do
  n=$(wc -l < "$f")
  if [ "$n" -gt 300 ]; then echo "FAIL too long: $f ($n lines, max 300)"; fail=1; fi
done < <(find src -name '*.ts' -o -name '*.tsx' -o -name '*.css')
if grep -rnE '\buse(Layout)?Effect\b' site/src src --include='*.ts' --include='*.tsx'; then echo 'FAIL effect hook'; fail=1; fi
exit "$fail"
