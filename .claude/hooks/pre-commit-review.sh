#!/bin/bash
# Pre-commit code review hook for Claude Code
# Fires on PreToolUse for Bash tool calls
# Blocks git commit and instructs Claude to run /code-review first

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -qE '^git commit|&& git commit|; git commit'; then
  exit 0
fi

# Check if code review was already done (marker file)
if [ -f "/tmp/claude-code-review-passed" ]; then
  rm -f "/tmp/claude-code-review-passed"
  exit 0
fi

# Block the commit and ask Claude to review first
jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "block",
    "permissionDecisionReason": "Run /code-review before committing. After review passes, create /tmp/claude-code-review-passed marker file and retry the commit."
  }
}'
