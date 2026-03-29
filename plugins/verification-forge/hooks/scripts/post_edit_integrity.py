#!/usr/bin/env python3
"""
verification-forge: PostToolUse integrity checker for Edit/Write operations.

After each file edit, checks whether a .claims.json ledger exists for that file.
If it does, validates that any referenced values in the edited file still match
their verified values from the ledger.
"""

import json
import os
import sys


def parse_file_path(tool_input: str) -> str | None:
    """Extract file_path from tool input JSON."""
    try:
        data = json.loads(tool_input)
        return data.get("file_path")
    except (json.JSONDecodeError, TypeError):
        return None


def get_claims_path(file_path: str) -> str:
    """Derive the .claims.json ledger path for a given file.

    Example: /path/to/report.docx -> /path/to/report.docx.claims.json
    """
    return file_path + ".claims.json"


def load_claims(claims_path: str) -> list[dict] | None:
    """Load and return claims from a ledger file. Returns None on any error."""
    try:
        with open(claims_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Support both a top-level list and a dict with a "claims" key
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "claims" in data:
            claims = data["claims"]
            if isinstance(claims, list):
                return claims
        return None
    except (OSError, json.JSONDecodeError):
        return None


def read_file_content(file_path: str) -> str | None:
    """Read the current content of the edited file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def check_integrity(content: str, claims: list[dict]) -> tuple[list[str], list[str]]:
    """Check file content against claimed values.

    Each claim is expected to have at minimum:
      - "field" or "key": identifier for the claim
      - "value" or "verified_value": the verified correct value

    Returns (passes, warnings) — lists of human-readable messages.
    """
    passes = []
    warnings = []

    for claim in claims:
        if not isinstance(claim, dict):
            continue

        # Extract claim identifiers
        field = claim.get("field") or claim.get("key") or claim.get("name", "unknown")
        verified = claim.get("verified_value") or claim.get("value")

        if verified is None:
            continue

        verified_str = str(verified)

        # Skip very short values (single chars, empty) — too many false positives
        if len(verified_str) < 2:
            continue

        # Check if the verified value appears in the file content
        if verified_str in content:
            passes.append(field)
        else:
            # The verified value is absent — could be fine (not every claim
            # appears in every file), or could indicate tampering.
            # Only warn if the claim has a "required" flag or if a different
            # value for the same field pattern appears.
            original = claim.get("original_value") or claim.get("original")
            if original is not None and str(original) != verified_str:
                original_str = str(original)
                if original_str in content and len(original_str) >= 2:
                    warnings.append(
                        f"'{field}': file contains original value '{original_str}' "
                        f"instead of verified value '{verified_str}'"
                    )

    return passes, warnings


def main():
    tool_input = sys.argv[1] if len(sys.argv) > 1 else ""

    if not tool_input:
        sys.exit(0)

    file_path = parse_file_path(tool_input)
    if not file_path:
        sys.exit(0)

    # Resolve to absolute path
    file_path = os.path.abspath(file_path)

    # Check for claims ledger
    claims_path = get_claims_path(file_path)
    if not os.path.isfile(claims_path):
        # No ledger — nothing to check, exit silently
        sys.exit(0)

    # Load claims
    claims = load_claims(claims_path)
    if not claims:
        # Ledger exists but is empty or malformed — note it but don't block
        print(f"[verification-forge] Claims ledger found but could not be parsed: {claims_path}")
        sys.exit(0)

    # Read the current file content
    content = read_file_content(file_path)
    if content is None:
        # Can't read the file (maybe binary or permissions) — skip
        sys.exit(0)

    # Run integrity check
    passes, warnings = check_integrity(content, claims)

    if warnings:
        for w in warnings:
            print(f"[verification-forge] WARNING — {w}")
        print(
            f"[verification-forge] INTEGRITY: {len(warnings)} issue(s) detected, "
            f"{len(passes)} claim(s) verified"
        )
    elif passes:
        print(f"[verification-forge] INTEGRITY: PASS ({len(passes)} claim(s) verified)")
    # If neither passes nor warnings, the claims didn't apply to this file — stay silent

    sys.exit(0)


if __name__ == "__main__":
    main()
