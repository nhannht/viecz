#!/bin/bash
# PostToolUse hook: after a successful git commit, remind Claude to update Serena memories.
set -e

input=$(cat)

# Extract the command that was run
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if ! echo "$command" | grep -qE 'git commit'; then
  exit 0
fi

# Check if the tool succeeded (commit actually happened)
stdout=$(echo "$input" | jq -r '.tool_response.stdout // empty')
if ! echo "$stdout" | grep -qE '^\[.+ [a-f0-9]+\]'; then
  exit 0
fi

# Extract what files changed from the commit
changed_files=$(cd "$CLAUDE_PROJECT_DIR" && git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || true)

# Determine which memories might need updating based on changed files
memories_to_check=""
if echo "$changed_files" | grep -q '^server/'; then
  memories_to_check="$memories_to_check architecture/go_backend conventions/go_style"
fi
if echo "$changed_files" | grep -q '^web/'; then
  memories_to_check="$memories_to_check architecture/angular_web conventions/angular_style"
fi
if echo "$changed_files" | grep -qE '^jellyfish(/|$)'; then
  memories_to_check="$memories_to_check project_overview"
fi
if echo "$changed_files" | grep -qE '(docker-compose|Dockerfile|systemd|\.env)'; then
  memories_to_check="$memories_to_check suggested_commands"
fi
# Always consider project_overview for structural changes
if echo "$changed_files" | grep -qE '(go\.mod|package\.json|build\.gradle)'; then
  memories_to_check="$memories_to_check project_overview"
fi

if [ -z "$memories_to_check" ]; then
  exit 0
fi

# Deduplicate
memories_to_check=$(echo "$memories_to_check" | tr ' ' '\n' | sort -u | tr '\n' ' ')

cat <<EOF
After this commit, check if these Serena memories need updating: $memories_to_check
Read each memory, compare against the committed changes, and update any that are stale or missing info about the new code. Only update if actually needed — don't rewrite memories that are already accurate.
EOF
exit 0
