#!/bin/bash
# check-design.sh
# PostToolUse hook: fires after Write/Edit on any .tsx file.
# Flags dark-theme colours, neon colours, and wrong status colours.

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# Only check .tsx files in src/web-app/app/ (not node_modules, .next)
if [[ "$FILE" != *"/src/web-app/app/"* ]] || [[ "$FILE" != *".tsx" ]]; then
  exit 0
fi
if [[ "$FILE" == *"node_modules"* ]] || [[ "$FILE" == *".next"* ]]; then
  exit 0
fi

WARNINGS=()

# ── Dark theme remnants ────────────────────────────────────────────────────
if grep -qE '(#0a0a0a|#111827|#1a1a1a|#0d0d0d|#18181b)' "$FILE" 2>/dev/null; then
  WARNINGS+=("Dark background colour found — use #fff for cards, var(--surface-muted,#f7f8fc) for page bg")
fi
if grep -qE 'rgba\(255,255,255,0\.0[1-9]\)|rgba\(255,255,255,0\.1[0-2]\)' "$FILE" 2>/dev/null; then
  WARNINGS+=("Glass card background (rgba white low opacity) — light theme uses solid #fff")
fi
if grep -qE 'text-white|text-neutral-400|text-neutral-500' "$FILE" 2>/dev/null; then
  WARNINGS+=("Dark-theme text class found — use color: var(--brand-navy,#0D1144) or rgba(13,17,68,0.5)")
fi
if grep -qE 'bg-zinc-|bg-slate-9|bg-neutral-9|bg-gray-9' "$FILE" 2>/dev/null; then
  WARNINGS+=("Dark Tailwind bg class found — use backgroundColor: '#fff' or var(--surface-muted)")
fi

# ── Neon/old status colours ────────────────────────────────────────────────
if grep -qE '#34d399|#4ade80|#60a5fa|#c084fc|#f87171|#fbbf24|#a78bfa' "$FILE" 2>/dev/null; then
  WARNINGS+=("Neon/old-palette colour found — use canonical status colours (#059669 approved, #dc2626 rejected, #d97706 in-progress, #7c3aed awaiting, #2563eb sent)")
fi

# ── Currency / date formatting ─────────────────────────────────────────────
if grep -qE '\`£\$\{|\"\£\" \+|'\''£'\'' \+' "$FILE" 2>/dev/null; then
  WARNINGS+=("Hardcoded £ string concatenation — use Intl.NumberFormat(\"en-GB\",{style:\"currency\",currency:\"GBP\",maximumFractionDigits:0})")
fi

# ── Next.js 16 async params ────────────────────────────────────────────────
if grep -qE 'const \{.*\} = params[^.]|const \{.*\} = context\.params[^.]' "$FILE" 2>/dev/null; then
  if ! grep -qE 'await params|await context\.params' "$FILE" 2>/dev/null; then
    WARNINGS+=("Sync params access — Next.js 16 requires: const { id } = await params")
  fi
fi

# ── Report ─────────────────────────────────────────────────────────────────
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  DESIGN DRIFT in $(basename $FILE):"
  for W in "${WARNINGS[@]}"; do
    echo "   • $W"
  done
  exit 1
fi

exit 0
