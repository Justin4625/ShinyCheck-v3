#!/bin/sh
# Stamp a fresh ?v= asset version and regenerate the CSS links, import map and offline file list.
# Called by the pre-commit hook; the work happens in bump-version.mjs (needs Node).
cd "$(dirname "$0")/.." || exit 1
exec node scripts/bump-version.mjs
