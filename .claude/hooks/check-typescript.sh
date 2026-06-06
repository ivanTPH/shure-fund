#!/bin/bash
# check-typescript.sh
# PostToolUse hook: fires after Write on any .ts or .tsx file in src/web-app/.
# Runs tsc --noEmit and surfaces errors immediately so they don't reach Vercel.
# Uses a lockfile to prevent concurrent runs when multiple files are written in parallel.

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# Only check TS/TSX files in the web app
if [[ "$FILE" != *"/src/web-app/"* ]]; then
  exit 0
fi
if [[ "$FILE" != *".ts" ]] && [[ "$FILE" != *".tsx" ]]; then
  exit 0
fi
if [[ "$FILE" == *"node_modules"* ]] || [[ "$FILE" == *".next"* ]]; then
  exit 0
fi

LOCKFILE="/tmp/shure-fund-tsc.lock"
WEBAPPDIR="/Users/ivan-imac/shure-fund/src/web-app"

# Skip if another tsc check is running
if [ -f "$LOCKFILE" ]; then
  exit 0
fi

touch "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

cd "$WEBAPPDIR"
ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | head -8)

if [ -n "$ERRORS" ]; then
  echo ""
  echo "🔴 TYPESCRIPT ERRORS detected after writing $(basename $FILE):"
  echo "$ERRORS"
  echo ""
  echo "Fix these before committing — they will break the Vercel build."
  exit 1
fi

exit 0
