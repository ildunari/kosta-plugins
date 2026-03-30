#!/usr/bin/env python3
"""Guard destructive Bash commands in the subagent-forge plugin."""

import json
import sys

CATASTROPHIC_PATTERNS = [
    "rm -rf /", "rm -rf ~", "mkfs", "dd if=/dev/zero of=/dev/",
    ":(){ :|:& };:"
]

MUTATING_PATTERNS = [
    r"rm ", r"rmdir ", r"mv ", r"cp ", r"chmod ", r"chown ",
    r"git push", r"git reset --hard", r"git clean -fd"
]

def check_bash_command(command):
    for pattern in CATASTROPHIC_PATTERNS:
        if pattern in command:
            return "deny", f"Command blocked: {pattern} is catastrophic"
    for pattern in MUTATING_PATTERNS:
        if pattern in command:
            return "confirm", f"Command appears to mutate state"
    return "allow", "Command is safe"

def main():
    try:
        hook_event = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "message": "Invalid JSON"}))
        return 1
    command = hook_event.get("command", "")
    if not command:
        print(json.dumps({"status": "error", "message": "No command"}))
        return 1
    status, message = check_bash_command(command)
    output = {"status": status, "message": message, "command": command}
    print(json.dumps(output))
    return 0

if __name__ == "__main__":
    sys.exit(main())
