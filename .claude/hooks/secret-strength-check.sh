#!/usr/bin/env bash
# PreToolUse hook: detect and block weak secrets, passwords, API tokens.
#
# Fires on Write, Edit, and Bash tool calls. Scans content for secret-like
# assignments with weak values. If found, denies with debug report + suggested replacement.
#
# Exit 0 with no stdout = allow. JSON deny output = block.
set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=""
CONTENT=""

# ── Extract content to scan based on tool type ──

case "$TOOL_NAME" in
  Write)
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')
    ;;
  Edit)
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // ""')
    ;;
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
    # Only scan bash if it redirects into an env/config file
    if echo "$COMMAND" | grep -qE '(>|>>|tee\s+)\s*\S*\.(env|cfg|conf|ini)'; then
      FILE_PATH="(bash redirect to config)"
      # Extract heredoc content if present
      if echo "$COMMAND" | grep -qE '<<'; then
        CONTENT=$(echo "$COMMAND" | sed -n '/<<.*$/,/^[A-Z]*$/p')
      else
        CONTENT="$COMMAND"
      fi
    else
      exit 0
    fi
    ;;
  *)
    exit 0
    ;;
esac

# ── Check if file should be scanned ──

should_scan() {
  local fp="$1"
  [[ "$fp" == "(bash redirect to config)" ]] && return 0
  [[ -z "$fp" ]] && return 1

  local lower="${fp,,}"
  local basename="${lower##*/}"

  # Never scan source code
  case "$lower" in
    *.py|*.js|*.ts|*.tsx|*.jsx|*.go|*.java|*.kt|*.rs|*.rb|*.php) return 1 ;;
    *.c|*.cpp|*.h|*.hpp|*.cs|*.swift|*.dart|*.vue|*.svelte) return 1 ;;
    *.sh|*.bash|*.zsh|*.fish|*.lua|*.pl|*.r|*.scala) return 1 ;;
    *.html|*.css|*.scss|*.less|*.md|*.rst|*.txt) return 1 ;;
  esac

  # Always scan .env files
  case "$basename" in
    .env|.env.*) return 0 ;;
    credentials.*|secrets.*) return 0 ;;
  esac

  # Scan config extensions
  case "$lower" in
    *.env|*.cfg|*.conf|*.ini) return 0 ;;
  esac

  # Scan config-like YAML/JSON/TOML with config hints
  case "$lower" in
    *docker-compose*) return 0 ;;
    *config.yml|*config.yaml|*config.json|*config.toml) return 0 ;;
    *application.yml|*application.yaml) return 0 ;;
    *settings.json|*settings.yml) return 0 ;;
    *.npmrc|*.pypirc) return 0 ;;
  esac

  return 1
}

if ! should_scan "$FILE_PATH"; then
  exit 0
fi

# ── Secret key detection ──

is_secret_key() {
  local key="${1,,}"
  [[ "$key" =~ (password|passwd|_pass$|_pass_) ]] && return 0
  [[ "$key" =~ (secret|_secret$|_secret_) ]] && return 0
  [[ "$key" =~ (token|api.?key|auth.?key|private.?key|access.?key) ]] && return 0
  [[ "$key" =~ (encryption.?key|signing.?key|jwt.?secret|session.?secret) ]] && return 0
  [[ "$key" =~ (client.?secret|app.?secret|cookie.?secret|webhook.?secret) ]] && return 0
  [[ "$key" =~ (db.?pass|database.?pass|mysql.?pass|postgres.?pass|redis.?pass|smtp.?pass) ]] && return 0
  return 1
}

# ── Weak value detection ──

MIN_LEN=20

WEAK_EXACT="password password1 password123 pass pass123 \
admin admin123 root root123 \
secret secret123 mysecret test test123 \
changeme changeit default example placeholder \
12345 123456 1234567890 \
qwerty abc123 letmein welcome \
token apikey nopassword nopass \
none null undefined todo fixme"

DICT_WORDS="password secret admin token test change default example"

is_weak_value() {
  local val="$1"
  # Strip quotes
  val="${val#\"}" ; val="${val%\"}"
  val="${val#\'}" ; val="${val%\'}"
  val="${val## }" ; val="${val%% }"
  local val_lower="${val,,}"
  local val_len=${#val}

  if [[ -z "$val" ]]; then
    WEAK_REASON="empty value"
    return 0
  fi

  # Known weak exact match
  for w in $WEAK_EXACT; do
    if [[ "$val_lower" == "$w" ]]; then
      WEAK_REASON="known weak value: '$val'"
      return 0
    fi
  done

  # All same character
  local unique_chars
  unique_chars=$(echo -n "$val" | fold -w1 | sort -u | wc -l)
  if [[ "$unique_chars" -le 2 && "$val_len" -gt 3 ]]; then
    WEAK_REASON="trivial pattern (only $unique_chars unique chars)"
    return 0
  fi

  # Numeric-only and short
  if [[ "$val" =~ ^[0-9]+$ && "$val_len" -lt "$MIN_LEN" ]]; then
    WEAK_REASON="numeric-only and too short (${val_len} chars)"
    return 0
  fi

  # Too short + mostly alphabetic (human-readable)
  if [[ "$val_len" -lt "$MIN_LEN" ]]; then
    local alpha_only="${val//[^a-zA-Z]/}"
    local alpha_len=${#alpha_only}
    if [[ "$alpha_len" -gt 0 && "$val_len" -gt 0 ]]; then
      local ratio=$((alpha_len * 100 / val_len))
      if [[ "$ratio" -gt 70 ]]; then
        WEAK_REASON="too short (${val_len} chars, min $MIN_LEN) and low entropy"
        return 0
      fi
    fi
  fi

  # Contains dictionary words + short
  local max_dict_len=$((MIN_LEN + 10))
  for dw in $DICT_WORDS; do
    if [[ "$val_lower" == *"$dw"* && "$val_len" -lt "$max_dict_len" ]]; then
      WEAK_REASON="contains dictionary word '$dw' (len=$val_len)"
      return 0
    fi
  done

  return 1
}

# ── Scan content ──

FINDINGS=""
FINDING_COUNT=0

while IFS= read -r line; do
  # Skip comments and blanks
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # Match KEY=VALUE or KEY: VALUE (config style)
  if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_.-]*)[[:space:]]*[=:][[:space:]]*(.*) ]]; then
    key="${BASH_REMATCH[2]}"
    value="${BASH_REMATCH[3]}"
    # Strip trailing comment and whitespace
    value="${value%%#*}"
    value="${value%"${value##*[![:space:]]}"}"
    # Strip quotes
    if [[ "$value" =~ ^\"(.*)\"$ ]]; then
      value="${BASH_REMATCH[1]}"
    elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi

    if is_secret_key "$key"; then
      WEAK_REASON=""
      if is_weak_value "$value"; then
        FINDING_COUNT=$((FINDING_COUNT + 1))
        SUGGESTED=$(openssl rand -base64 32 | tr -d '\n')
        DISPLAY_VAL="${value:0:30}"
        [[ ${#value} -gt 30 ]] && DISPLAY_VAL="${DISPLAY_VAL}..."
        CONTEXT="${line:0:80}"

        FINDINGS="${FINDINGS}
-- Finding #${FINDING_COUNT} --
  Key:         ${key}
  Value:       ${DISPLAY_VAL}
  File:        ${FILE_PATH}
  Reason:      ${WEAK_REASON}
  Suggested:   ${SUGGESTED}
  Context:     ${CONTEXT}
"
      fi
    fi
  fi
done <<< "$CONTENT"

# ── Result ──

if [[ "$FINDING_COUNT" -eq 0 ]]; then
  exit 0
fi

REASON="WEAK SECRET DETECTED - tool call blocked

Tool: ${TOOL_NAME}
Findings: ${FINDING_COUNT} weak secret(s)
${FINDINGS}
ACTION REQUIRED:
  Replace each weak secret with the suggested value (or generate your own
  with openssl rand -base64 32), then retry the tool call."

jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'
