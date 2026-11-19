#!/usr/bin/env bash
# Runs check-component.sh over every component folder of the demo site: the route component, each feature's
# components, and the shared UI. The library's own <LivingCity> is not checked: its styles are inline on purpose
# (a package must work without the host importing a stylesheet), so it has no CSS module.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
for dir in site/src/app/*/ site/src/features/*/components/*/ site/src/shared/ui/*/; do
  bash scripts/check-component.sh "${dir%/}" > /tmp/check-component.out 2>&1 || fail=1
  grep -E '^(FAIL|OK)' /tmp/check-component.out
done
# no !important anywhere in the site's styles, and no effects in the site or the library
if grep -rn '!important' site/src --include='*.css'; then echo 'FAIL !important in site styles'; fail=1; fi
if grep -rnE '\buse(Layout)?Effect\b' site/src src --include='*.ts' --include='*.tsx'; then echo 'FAIL effect hook'; fail=1; fi
exit "$fail"
