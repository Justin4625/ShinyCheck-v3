#!/bin/sh
# Stamp a fresh ?v= on the app's scripts and stylesheet in index.html (and sw.js) so browsers
# fetch the new files after a deploy instead of serving cached ones.
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s/\?v=[0-9]+\"/?v=$v\"/g" index.html
# The service worker precaches exactly these files, and a changed sw.js is what makes
# browsers pick up the new version.
sed -i '' -E "s/^const VERSION = \"[0-9]+\"/const VERSION = \"$v\"/" sw.js
echo "asset version $v"
