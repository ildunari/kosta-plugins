#!/usr/bin/env bash
# Session start hook: detect DESIGN.md and report Stitch context.
# Output is injected into the session as context.
#
# NOTE: Claude Code hook scripts run in the USER'S working directory (the
# project root), NOT the plugin root. All relative paths below resolve
# against the user's project — do NOT cd or use $CLAUDE_PLUGIN_ROOT here.

set -euo pipefail

DESIGN_MD=""

# Check common DESIGN.md locations (relative to user's project root)
for path in "DESIGN.md" "Design/DESIGN.md" "design/DESIGN.md"; do
  if [ -f "$path" ]; then
    DESIGN_MD="$path"
    break
  fi
done

# Build context output
if [ -n "$DESIGN_MD" ]; then
  echo "[stitch-studio] DESIGN.md found at $DESIGN_MD — Stitch skills will use it for prompt enhancement and token consistency."
else
  echo "[stitch-studio] No DESIGN.md found. Run /stitch:brand to set up a design system, or /stitch:generate will work without one."
fi

# Check daily credit usage (relative to user's project root)
if [ -f ".stitch-credits.log" ]; then
  TODAY="$(date -u '+%Y-%m-%d')"
  DAILY_TOTAL=$(grep "^${TODAY}" ".stitch-credits.log" 2>/dev/null | awk -F',' '{sum+=$3} END {print sum+0}')
  if [ "$DAILY_TOTAL" -gt 0 ]; then
    echo "[stitch-studio] Stitch credits used today: ~${DAILY_TOTAL}/400"
  fi
fi
