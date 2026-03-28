#!/usr/bin/env bash
# PreToolUse guard: prevent dangerous writes to iOS project files
set -euo pipefail

INPUT="${1:-}"

# Extract file path from tool input (JSON)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || true)

[[ -z "$FILE_PATH" ]] && exit 0

BASENAME=$(basename "$FILE_PATH")

# Block direct .pbxproj edits (use XcodeGen instead)
if [[ "$BASENAME" == "project.pbxproj" ]]; then
    if [[ -f "project.yml" ]]; then
        echo "BLOCKED: Do not edit project.pbxproj directly. This project uses XcodeGen — edit project.yml and run 'xcodegen generate' instead."
        exit 1
    fi
fi

# Warn about secrets in source files
if [[ "$FILE_PATH" == *.swift ]]; then
    CONTENT=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('content','') + d.get('new_string',''))" 2>/dev/null || true)
    if echo "$CONTENT" | grep -qiE '(api_key|apikey|secret|password|token)\s*[:=]\s*"[^"]{8,}"'; then
        echo "WARNING: Possible hardcoded secret detected in $BASENAME. Use Keychain or environment variables instead."
    fi
fi

exit 0
