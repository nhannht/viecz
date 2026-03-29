#!/usr/bin/env bash
# Wrapper around `git-bug bug label new` with validation against .git-bug-labels.yml
# Usage: scripts/git-bug-label.sh <bug-id> <label> [<label> ...]
# Also:  scripts/git-bug-label.sh --list          # show all allowed labels
#        scripts/git-bug-label.sh --check <label>  # validate without applying

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
LABELS_FILE="$REPO_ROOT/.git-bug-labels.yml"

if [[ ! -f "$LABELS_FILE" ]]; then
  echo "Error: $LABELS_FILE not found" >&2
  exit 1
fi

# Parse allowed labels from YAML (simple grep, no external deps)
get_allowed_labels() {
  grep -E '^\s+- ' "$LABELS_FILE" | sed 's/^\s*- //' | sort
}

# --list: print all allowed labels
if [[ "${1:-}" == "--list" ]]; then
  echo "Allowed labels:"
  get_allowed_labels | sed 's/^/  /'
  exit 0
fi

# --check: validate a label without applying
if [[ "${1:-}" == "--check" ]]; then
  shift
  label="${1:?Usage: git-bug-label.sh --check <label>}"
  if get_allowed_labels | grep -qxF "$label"; then
    echo "✓ '$label' is valid"
    exit 0
  else
    echo "✗ '$label' is not an allowed label" >&2
    echo "Run: scripts/git-bug-label.sh --list" >&2
    exit 1
  fi
fi

# Main: validate and apply labels
bug_id="${1:?Usage: git-bug-label.sh <bug-id> <label> [<label> ...]}"
shift

if [[ $# -eq 0 ]]; then
  echo "Error: no labels provided" >&2
  echo "Usage: git-bug-label.sh <bug-id> <label> [<label> ...]" >&2
  exit 1
fi

allowed=$(get_allowed_labels)
invalid=()
valid=()

for label in "$@"; do
  if echo "$allowed" | grep -qxF "$label"; then
    valid+=("$label")
  else
    invalid+=("$label")
  fi
done

if [[ ${#invalid[@]} -gt 0 ]]; then
  echo "Error: invalid label(s): ${invalid[*]}" >&2
  echo "" >&2
  echo "Allowed labels:" >&2
  echo "$allowed" | sed 's/^/  /' >&2
  exit 1
fi

for label in "${valid[@]}"; do
  git-bug bug label new "$bug_id" "$label"
  echo "✓ $label → $bug_id"
done
