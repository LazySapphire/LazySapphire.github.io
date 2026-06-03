#!/usr/bin/env bash
set -euo pipefail

target="${1:-public}"

if [[ ! -d "$target" ]]; then
  echo "Missing build output directory: $target" >&2
  exit 1
fi

patterns=(
  "localhost:1313"
  "127.0.0.1:1313"
  "/livereload.js"
  "My awesome website"
  "href=\"#\""
  "mail.google.com/mail/u/0/#inbox"
)

failed=0

for pattern in "${patterns[@]}"; do
  if grep -RIn --exclude-dir=".git" --fixed-strings "$pattern" "$target"; then
    echo "Found forbidden production artifact pattern: $pattern" >&2
    failed=1
  fi
done

exit "$failed"
