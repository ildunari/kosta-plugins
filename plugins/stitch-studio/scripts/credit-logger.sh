#!/usr/bin/env bash
# Log Stitch credit usage to a local file.
# Called by the PostToolUse hook after any stitch MCP tool call.
#
# Usage: credit-logger.sh <tool_name>
#
# Logs to .stitch-credits.log in the current working directory.
# Each line: timestamp, tool name, estimated credit cost.

set -euo pipefail

TOOL_NAME="${1:-unknown}"
LOG_FILE=".stitch-credits.log"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# Estimate credit cost based on tool type
case "$TOOL_NAME" in
  *generate_screen*|*generate_variant*)
    COST=1
    ;;
  *edit_screen*)
    COST=1
    ;;
  *build_site*)
    COST=1
    ;;
  *get_screen_code*|*get_screen_image*|*list_*|*get_*)
    COST=0
    ;;
  *)
    COST=0
    ;;
esac

# Only log if there's a cost
if [ "$COST" -gt 0 ]; then
  echo "${TIMESTAMP},${TOOL_NAME},${COST}" >> "$LOG_FILE"
fi

# Calculate daily total and warn if approaching limit
if [ -f "$LOG_FILE" ]; then
  TODAY="$(date -u '+%Y-%m-%d')"
  DAILY_TOTAL=$(grep "^${TODAY}" "$LOG_FILE" 2>/dev/null | awk -F',' '{sum+=$3} END {print sum+0}')

  if [ "$DAILY_TOTAL" -ge 300 ]; then
    echo "⚠️  Stitch credit usage today: ~${DAILY_TOTAL}/400"
  fi
fi
