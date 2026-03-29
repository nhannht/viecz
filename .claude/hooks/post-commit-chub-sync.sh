#!/bin/bash
# PostToolUse hook: after a git commit, check if chub annotations have accumulated
# and prompt Claude to fold them into the DOC.md source files + rebuild registry.
set -e

input=$(cat)

# Only act on git commit commands
command=$(echo "$input" | jq -r '.tool_input.command // empty')
if ! echo "$command" | grep -qE 'git commit'; then
  exit 0
fi

# Check if the tool succeeded (commit actually happened)
stdout=$(echo "$input" | jq -r '.tool_response.stdout // empty')
if ! echo "$stdout" | grep -qE '^\[.+ [a-f0-9]+\]'; then
  exit 0
fi

CHUB="$HOME/.bun/bin/chub"
REGISTRY_DIR="$CLAUDE_PROJECT_DIR/docs/chub-registry"

# Check if chub and registry exist
if [ ! -x "$CHUB" ] || [ ! -d "$REGISTRY_DIR" ]; then
  exit 0
fi

# List all annotations — plain text format: "id (timestamp)\n  note"
annotations=$("$CHUB" annotate --list 2>/dev/null || true)

# Check if there are any viecz annotations
if ! echo "$annotations" | grep -q 'viecz/'; then
  exit 0
fi

# Check which docs have annotations
doc_ids=""
for id in server-api data-models payment-flow web-services frostglass-design; do
  note=$("$CHUB" annotate "viecz/$id" 2>/dev/null || true)
  # Output format: "viecz/id (timestamp)\n  note text" — if it has a timestamp line, there's an annotation
  if echo "$note" | grep -qE "^viecz/$id \("; then
    doc_ids="$doc_ids viecz/$id"
  fi
done

doc_ids=$(echo "$doc_ids" | xargs)

if [ -z "$doc_ids" ]; then
  exit 0
fi

cat <<EOF
CHUB REGISTRY UPDATE NEEDED: Annotations exist for: $doc_ids

For each annotated doc:
1. Read the annotation: ~/.bun/bin/chub annotate <id>
2. Read the current DOC.md in docs/chub-registry/
3. Fold the annotation content into the DOC.md (add the info where it belongs)
4. Clear the annotation: ~/.bun/bin/chub annotate <id> --clear
5. After all docs updated, rebuild: ~/.bun/bin/chub build docs/chub-registry/ -o docs/chub-registry/dist

This keeps the source docs evergreen and prevents annotation pile-up.
EOF
exit 0
