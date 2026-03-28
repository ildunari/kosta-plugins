#!/usr/bin/env bash
# Detect iOS project in CWD and output metadata for session context
set -euo pipefail

detect_project() {
    local project_type=""
    local project_name=""
    local swift_version=""
    local ios_target=""
    local has_xcodegen=false
    local has_spm=false

    # Check for XcodeGen
    if [[ -f "project.yml" ]]; then
        has_xcodegen=true
        project_name=$(grep "^name:" project.yml 2>/dev/null | head -1 | sed 's/name: *//')
        ios_target=$(grep -A5 'deploymentTarget:' project.yml 2>/dev/null | grep 'iOS:' | sed 's/.*iOS: *"*//;s/"*//')
    fi

    # Check for .xcodeproj
    if [[ -z "$project_name" ]]; then
        local xcproj=$(find . -maxdepth 1 -name "*.xcodeproj" -print -quit 2>/dev/null)
        if [[ -n "$xcproj" ]]; then
            project_name=$(basename "$xcproj" .xcodeproj)
            project_type="xcodeproj"
        fi
    fi

    # Check for .xcworkspace
    if [[ -z "$project_name" ]]; then
        local xcwork=$(find . -maxdepth 1 -name "*.xcworkspace" -not -name "*.xcodeproj" -print -quit 2>/dev/null)
        if [[ -n "$xcwork" ]]; then
            project_name=$(basename "$xcwork" .xcworkspace)
            project_type="xcworkspace"
        fi
    fi

    # Check for SPM with iOS target
    if [[ -f "Package.swift" ]]; then
        has_spm=true
        if grep -q "iOS" Package.swift 2>/dev/null; then
            [[ -z "$project_name" ]] && project_name=$(grep 'name:' Package.swift 2>/dev/null | head -1 | sed 's/.*name: *"//;s/".*//')
        fi
    fi

    # No iOS project found
    if [[ -z "$project_name" ]]; then
        return 0
    fi

    # Detect Swift version from Package.swift or project settings
    if [[ -f "Package.swift" ]]; then
        swift_version=$(head -1 Package.swift | grep -o '[0-9]\.[0-9]' || true)
    fi

    # Output context
    echo "iOS project detected: $project_name"
    [[ -n "$ios_target" ]] && echo "  Deployment target: iOS $ios_target"
    [[ -n "$swift_version" ]] && echo "  Swift version: $swift_version"
    $has_xcodegen && echo "  Build system: XcodeGen (project.yml)"
    $has_spm && echo "  SPM: yes"
    [[ -f "Podfile" ]] && echo "  CocoaPods: yes (consider migrating to SPM)"
    [[ -f "CLAUDE.md" ]] && echo "  CLAUDE.md: present"
    [[ -f "AGENTS.md" ]] && echo "  AGENTS.md: present"
}

detect_project
