#!/bin/bash
# PreToolUse hook: block git commit if gitleaks detects secrets in staged changes.
set -e

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if ! echo "$command" | grep -qE 'git commit'; then
  exit 0
fi

# Run gitleaks on staged changes
cd "$CLAUDE_PROJECT_DIR"
if ! gitleaks git --staged --no-banner -v 2>/dev/null; then
  echo "BLOCKED: gitleaks detected secrets in staged changes."
  echo "Fix the leaks before committing. Run: gitleaks git --staged -v"
  exit 2
fi

exit 0
