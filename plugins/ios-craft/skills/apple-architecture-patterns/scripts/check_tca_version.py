#!/usr/bin/env python3
"""
check_tca_version.py

This utility inspects a Swift `Package.swift` file to determine the version of
**The Composable Architecture (TCA)** your project depends on. It searches
for a package dependency whose URL contains `swift-composable-architecture`
and attempts to extract a version string from the manifest. If it cannot
determine a version (for example, if you depend on a branch or a revision),
it reports that fact.

Usage:

    python3 check_tca_version.py --package-file /path/to/Package.swift

Outputs a message describing the detected TCA version and suggests
verifying the latest release notes. Note that this script does **not**
fetch the latest version from the internet; it merely parses your local
manifest. You should still consult Point‑Free’s release notes and blog
posts to ensure you are on the most recent stable release【746950836239898†L232-L243】.
"""

import argparse
import re
import sys


def extract_tca_version(package_contents: str) -> str | None:
    """Return the version string of TCA if found, else None."""
    # Pattern matches the package line containing the URL and a version, e.g.:
    # .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.2.3")
    # or .package(url: "...", exact: "1.3.0")
    dep_pattern = re.compile(
        r"\.package\s*\(\s*url\s*:\s*\"https?://github\.com/pointfreeco/swift-composable-architecture\"\s*,\s*(from|exact)\s*:\s*\"([0-9]+\.[0-9]+\.[0-9]+)\""
    )
    match = dep_pattern.search(package_contents)
    if match:
        return match.group(2)
    # We intentionally ignore version range syntax to keep this script simple.
    return None


def extract_branch_or_revision(package_contents: str) -> str | None:
    """Return the branch or revision if TCA is specified via a branch or revision."""
    # Check for branch specification
    branch_pattern = re.compile(
        r"\.package\s*\(\s*url\s*:\s*\"https?://github\.com/pointfreeco/swift-composable-architecture\"\s*,\s*branch\s*:\s*\"([^\"]+)\""
    )
    match = branch_pattern.search(package_contents)
    if match:
        return f"branch {match.group(1)}"
    # Check for revision specification
    rev_pattern = re.compile(
        r"\.package\s*\(\s*url\s*:\s*\"https?://github\.com/pointfreeco/swift-composable-architecture\"\s*,\s*revision\s*:\s*\"([^\"]+)\""
    )
    match = rev_pattern.search(package_contents)
    if match:
        return f"revision {match.group(1)}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the TCA version in a Package.swift file")
    parser.add_argument("--package-file", required=True, help="Path to the Package.swift file to inspect")
    args = parser.parse_args()
    try:
        with open(args.package_file, "r", encoding="utf-8") as f:
            contents = f.read()
    except OSError as e:
        print(f"Error reading {args.package_file}: {e}", file=sys.stderr)
        return 1
    version = extract_tca_version(contents)
    if version:
        print(f"Detected TCA version: {version}")
        print("Please verify this against the latest release notes at:")
        print("  https://github.com/pointfreeco/swift-composable-architecture/releases")
        return 0
    branch_or_rev = extract_branch_or_revision(contents)
    if branch_or_rev:
        print(f"TCA is pinned to a {branch_or_rev}. Consider using a stable release tag when possible.")
        print("Check for updates at:")
        print("  https://github.com/pointfreeco/swift-composable-architecture/releases")
        return 0
    # If we reach here, no dependency was found
    print("No swift-composable-architecture dependency found in the specified Package.swift.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())