#!/bin/bash
# check-auth.sh
# PostToolUse hook: fires after Write on any route.ts file.
# Warns if an API route handler is missing the auth.getUser() + 401 pattern.

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# Only check route.ts files inside app/api/
if [[ "$FILE" != *"/app/api/"* ]] || [[ "$FILE" != *"route.ts" ]]; then
  exit 0
fi

# Check each exported handler for the auth pattern
MISSING=()
for METHOD in GET POST PATCH PUT DELETE; do
  # Check if handler exists in file
  if grep -q "export async function $METHOD" "$FILE" 2>/dev/null; then
    # Check if auth check exists anywhere in the file (shared auth check is fine)
    if ! grep -q "auth.getUser\|getUser()" "$FILE" 2>/dev/null; then
      MISSING+=("$METHOD")
    fi
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  AUTH CHECK MISSING in $(basename $(dirname $FILE))/$(basename $FILE)"
  echo "   Handlers without getUser() check: ${MISSING[*]}"
  echo "   Required pattern:"
  echo "     const { data: { user } } = await userClient.auth.getUser();"
  echo "     if (!user) return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });"
  exit 1
fi

exit 0
