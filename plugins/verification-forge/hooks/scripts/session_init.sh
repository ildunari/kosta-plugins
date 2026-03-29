#!/usr/bin/env bash
# verification-forge: Session initialization script
# Checks environment readiness and reports prior verification state.

set -euo pipefail

# 1. Check Python 3 availability
if command -v python3 &>/dev/null; then
    py_version=$(python3 --version 2>&1)
    echo "[verification-forge] $py_version available"
else
    echo "[verification-forge] WARNING: python3 not found — hook scripts will not function"
    exit 0
fi

# 2. Check required Python packages (advisory only, don't block)
missing_packages=()
for pkg in python-docx openpyxl; do
    # Map package install names to importable module names
    case "$pkg" in
        python-docx) module="docx" ;;
        *)           module="$pkg" ;;
    esac
    if ! python3 -c "import $module" &>/dev/null 2>&1; then
        missing_packages+=("$pkg")
    fi
done

if [ ${#missing_packages[@]} -gt 0 ]; then
    echo "[verification-forge] Missing optional packages: ${missing_packages[*]}"
    echo "  Install with: pip3 install ${missing_packages[*]}"
else
    echo "[verification-forge] All optional packages available (python-docx, openpyxl)"
fi

# 3. Check for existing .claims.json files in CWD (prior verification session)
claims_count=$(find . -maxdepth 3 -name "*.claims.json" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$claims_count" -gt 0 ]; then
    echo "[verification-forge] Found $claims_count claims ledger(s) in workspace — prior verification session detected"
    # List up to 5 for context
    find . -maxdepth 3 -name "*.claims.json" -type f 2>/dev/null | head -5 | while read -r f; do
        echo "  - $f"
    done
    if [ "$claims_count" -gt 5 ]; then
        echo "  ... and $((claims_count - 5)) more"
    fi
else
    echo "[verification-forge] No prior claims ledgers found — clean workspace"
fi
