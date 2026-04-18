#!/bin/bash
# Pre-commit code review hook for Claude Code
# Blocks git commit unless /code-review passed for the EXACT staged content

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -qE '^git commit|&& git commit|; git commit'; then
  exit 0
fi

# Compute hash of currently staged changes
STAGED_HASH=$(git diff --cached | sha256sum | cut -d' ' -f1)

# Check marker contains matching hash
if [ -f "/tmp/claude-code-review-passed" ]; then
  SAVED_HASH=$(cat /tmp/claude-code-review-passed)
  if [ "$STAGED_HASH" = "$SAVED_HASH" ]; then
    exit 0
  fi
fi

# Block — hash mismatch or no marker
jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Run /code-review before committing. Staged content has changed since last review (or no review was done). After review passes with no CRITICAL or WARNING findings, the marker will be created automatically."
  }
}'
