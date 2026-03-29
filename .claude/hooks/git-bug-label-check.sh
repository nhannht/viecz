#!/usr/bin/env bash
# Claude Code PreToolUse hook: block direct `git-bug bug label new` calls
# Forces use of scripts/git-bug-label.sh wrapper for label validation

if [[ "${CLAUDE_TOOL_NAME:-}" != "Bash" ]]; then
  exit 0
fi

input="${CLAUDE_TOOL_INPUT:-}"

# Check if the command uses `git-bug bug label new` directly (bypassing validation)
if echo "$input" | grep -qE 'git-bug\s+bug\s+label\s+new'; then
  # Allow if it's being called from the wrapper script itself
  if echo "$input" | grep -q 'git-bug-label.sh'; then
    exit 0
  fi
  echo "BLOCKED: Use scripts/git-bug-label.sh instead of raw 'git-bug bug label new'" >&2
  echo "This ensures labels are validated against .git-bug-labels.yml" >&2
  echo '{"decision": "deny"}'
  exit 0
fi

exit 0
