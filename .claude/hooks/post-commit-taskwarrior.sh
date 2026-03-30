#!/bin/bash
# PostToolUse hook: after a successful git commit, block until Taskwarrior is updated.
# Uses a lock file — if the lock exists, the commit happened but TW wasn't updated yet.
set -e

LOCK_FILE="/tmp/claude-taskwarrior-pending"

input=$(cat)

# Extract the command that was run
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# --- Pre-check: block non-TW tool calls if the lock file exists ---
if [ -f "$LOCK_FILE" ]; then
  # Allow taskwarrior commands and lock removal through
  if echo "$command" | grep -qE '^task\b|rm.*/tmp/claude-taskwarrior-pending|^cat /tmp/claude-taskwarrior'; then
    exit 0
  fi
  commit_msg=$(cat "$LOCK_FILE")
  echo "BLOCKED: You committed but haven't updated Taskwarrior yet."
  echo "Commit: $commit_msg"
  echo "Run 'task <id> done' or 'task <id> modify' to reflect the commit, then run: rm $LOCK_FILE"
  exit 2
fi

# --- Post-commit: create the lock file ---
if ! echo "$command" | grep -qE 'git commit'; then
  exit 0
fi

# Check if the tool succeeded (commit actually happened)
stdout=$(echo "$input" | jq -r '.tool_response.stdout // empty')
if ! echo "$stdout" | grep -qE '^\[.+ [a-f0-9]+\]'; then
  exit 0
fi

# Extract commit subject
commit_subject=$(cd "$CLAUDE_PROJECT_DIR" && git log -1 --format='%s' HEAD 2>/dev/null || echo "unknown")

# Create lock file with commit info
echo "$commit_subject" > "$LOCK_FILE"

cat <<EOF
Post-commit: Update Taskwarrior to reflect this commit.
Commit: $commit_subject
Run 'task project:viecz list' to find the related task, then 'task <id> done' (or modify).
Then unlock with: rm $LOCK_FILE
EOF
exit 0
