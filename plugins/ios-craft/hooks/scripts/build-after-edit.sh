#!/usr/bin/env bash
# PostToolUse: trigger incremental build after Swift file edits
# Batches builds — only triggers every 3rd Swift edit to avoid excessive builds
#
# ASSUMPTION TO TEST (Harness Principle #5):
# This hook runs a full `xcodebuild build` every 3rd Swift edit. The assumption is
# that catching compile errors mid-session (before the user's next intentional build)
# saves time. But if the user always builds manually after a batch of edits, this hook
# adds ~10-30s of latency for no benefit. Stress-test this:
#   - If errors caught by this hook are almost always also caught by the next manual
#     build, increase the interval to every 5th edit or remove the hook entirely.
#   - If this hook regularly catches errors that would have compounded (e.g., a typo
#     in file A that breaks files B and C edited afterward), keep or tighten the interval.
# Track results in the skill FEEDBACK.md files.
set -euo pipefail

INPUT="${1:-}"
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || true)

# Only care about .swift files
[[ "$FILE_PATH" != *.swift ]] && exit 0

# Build counter file
COUNTER_FILE="/tmp/.ios-craft-build-counter"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Build every 3rd edit
if (( COUNT % 3 != 0 )); then
    exit 0
fi

# Find the project
if [[ -f "project.yml" ]]; then
    SCHEME=$(grep "^name:" project.yml 2>/dev/null | head -1 | sed 's/name: *//')
elif ls *.xcodeproj 1>/dev/null 2>&1; then
    SCHEME=$(basename *.xcodeproj .xcodeproj)
else
    exit 0
fi

# Quick syntax check build (no linking, just compile)
echo "Building $SCHEME (edit #$COUNT)..."
xcodebuild build -scheme "$SCHEME" -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | tail -5 || true
