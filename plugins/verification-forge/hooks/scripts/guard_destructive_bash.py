#!/usr/bin/env python3
"""
verification-forge: PreToolUse guard for destructive bash commands.

Categorizes commands into BLOCK (exit 1), WARN (exit 0 + warning), or PASS (exit 0 silent).
"""

import json
import re
import sys


def parse_command(tool_input: str) -> str:
    """Extract the command string from tool input JSON."""
    try:
        data = json.loads(tool_input)
        return data.get("command", "")
    except (json.JSONDecodeError, TypeError):
        # If it's not JSON, treat the whole input as a command string
        return str(tool_input) if tool_input else ""


def normalize(cmd: str) -> str:
    """Collapse whitespace for easier pattern matching."""
    return re.sub(r"\s+", " ", cmd).strip()


def should_block(cmd: str) -> str | None:
    """Return a reason string if the command should be blocked, else None."""
    n = normalize(cmd)

    # rm -rf on root or home
    if re.search(r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+/\s*$", n):
        return "rm -rf / would destroy the entire filesystem"
    if re.search(r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+~/?(\s|$)", n):
        return "rm -rf ~ would destroy your home directory"
    # Also catch the reversed flag order: rm -fr
    if re.search(r"\brm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+/\s*$", n):
        return "rm -fr / would destroy the entire filesystem"
    if re.search(r"\brm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+~/?(\s|$)", n):
        return "rm -fr ~ would destroy your home directory"

    # git reset --hard (with no further qualification is dangerous)
    if re.search(r"\bgit\s+reset\s+--hard\b", n):
        return "git reset --hard discards all uncommitted changes"

    # git push --force to main/master
    if re.search(r"\bgit\s+push\s+.*--force.*\b(main|master)\b", n):
        return "force-pushing to main/master can destroy shared history"
    if re.search(r"\bgit\s+push\s+.*-f\b.*\b(main|master)\b", n):
        return "force-pushing to main/master can destroy shared history"

    # Writing to raw block devices
    if re.search(r">\s*/dev/[sh]d[a-z]", n):
        return "writing directly to a block device would destroy disk data"

    # dd to block devices
    if re.search(r"\bdd\b.*of=/dev/[sh]d[a-z]", n):
        return "dd to a block device would destroy disk data"

    # mkfs on real devices
    if re.search(r"\bmkfs\b.*\s/dev/[sh]d[a-z]", n):
        return "mkfs would format the disk"

    return None


def should_warn(cmd: str) -> str | None:
    """Return a warning string if the command deserves a warning, else None."""
    n = normalize(cmd)

    # rm -rf on directories (but not / or ~ which are blocked above)
    if re.search(r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f", n) or re.search(r"\brm\s+-[a-zA-Z]*f[a-zA-Z]*r", n):
        return "recursive force-delete — verify the target path is correct"

    # git reset (without --hard, still worth a heads-up)
    if re.search(r"\bgit\s+reset\b", n):
        return "git reset will move HEAD — uncommitted changes may be affected"

    # SQL destructive operations
    if re.search(r"\bDROP\s+TABLE\b", n, re.IGNORECASE):
        return "DROP TABLE will permanently delete the table and its data"
    if re.search(r"\bTRUNCATE\b", n, re.IGNORECASE):
        return "TRUNCATE will delete all rows from the table"

    return None


def main():
    # Tool input comes as the first argument
    tool_input = sys.argv[1] if len(sys.argv) > 1 else ""

    if not tool_input:
        # No input to analyze — pass
        sys.exit(0)

    cmd = parse_command(tool_input)
    if not cmd:
        sys.exit(0)

    # Check BLOCK first
    reason = should_block(cmd)
    if reason:
        print(f"[verification-forge] BLOCKED: {reason}", file=sys.stderr)
        sys.exit(1)

    # Check WARN
    warning = should_warn(cmd)
    if warning:
        print(f"[verification-forge] WARNING: {warning}", file=sys.stderr)
        sys.exit(0)

    # PASS — silent
    sys.exit(0)


if __name__ == "__main__":
    main()
