#!/bin/sh
# Stamp a fresh ?v= on the app's scripts and stylesheet in index.html so browsers
# fetch the new files after a deploy instead of serving cached ones.
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s/\?v=[0-9]+\"/?v=$v\"/g" index.html
echo "asset version $v"
