#!/usr/bin/env bash
# PreToolUse hook: scan staged diff for weak secrets before git commit.
#
# Only triggers on `git commit` bash commands. Scans `git diff --cached`
# for secret-like KEY=VALUE assignments with weak values.
# If found, denies the commit with a debug report + suggested replacements.
#
# Exit 0 with no stdout = allow.
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -qE '^git commit|&& git commit|; git commit'; then
  exit 0
fi

# Get staged diff
DIFF=$(git diff --cached 2>/dev/null || true)
if [[ -z "$DIFF" ]]; then
  exit 0
fi

# ── Only scan added lines in config/env files ──

# Extract file names and added lines from diff
# Format: filename:+added_line
SCAN_INPUT=""
CURRENT_FILE=""
while IFS= read -r line; do
  if [[ "$line" =~ ^diff\ --git\ a/(.*)\ b/(.*) ]]; then
    CURRENT_FILE="${BASH_REMATCH[2]}"
  elif [[ "$line" =~ ^\+[^+] && -n "$CURRENT_FILE" ]]; then
    # Only scan config/env files, not source code
    case "${CURRENT_FILE,,}" in
      *.py|*.js|*.ts|*.tsx|*.jsx|*.go|*.java|*.kt|*.rs|*.rb|*.php|*.c|*.cpp|*.h|*.cs)
        continue ;;
      *.swift|*.dart|*.vue|*.svelte|*.html|*.css|*.scss|*.less|*.md|*.rst|*.txt)
        continue ;;
      *.sh|*.bash|*.zsh|*.fish|*.lua|*.pl|*.r|*.scala)
        continue ;;
    esac
    case "${CURRENT_FILE,,}" in
      *.env|*.env.*|*docker-compose*|*.cfg|*.conf|*.ini)
        SCAN_INPUT="${SCAN_INPUT}${CURRENT_FILE}:${line#+}"$'\n' ;;
      *config.yml|*config.yaml|*config.json|*config.toml)
        SCAN_INPUT="${SCAN_INPUT}${CURRENT_FILE}:${line#+}"$'\n' ;;
      *application.yml|*application.yaml|*settings.json|*settings.yml)
        SCAN_INPUT="${SCAN_INPUT}${CURRENT_FILE}:${line#+}"$'\n' ;;
      *credentials*|*secrets*)
        SCAN_INPUT="${SCAN_INPUT}${CURRENT_FILE}:${line#+}"$'\n' ;;
      *.npmrc|*.pypirc)
        SCAN_INPUT="${SCAN_INPUT}${CURRENT_FILE}:${line#+}"$'\n' ;;
    esac
  fi
done <<< "$DIFF"

if [[ -z "$SCAN_INPUT" ]]; then
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
  val="${val#\"}" ; val="${val%\"}"
  val="${val#\'}" ; val="${val%\'}"
  val="${val## }" ; val="${val%% }"
  local val_lower="${val,,}"
  local val_len=${#val}

  if [[ -z "$val" ]]; then
    WEAK_REASON="empty value"
    return 0
  fi

  for w in $WEAK_EXACT; do
    if [[ "$val_lower" == "$w" ]]; then
      WEAK_REASON="known weak value: '$val'"
      return 0
    fi
  done

  local unique_chars
  unique_chars=$(echo -n "$val" | fold -w1 | sort -u | wc -l)
  if [[ "$unique_chars" -le 2 && "$val_len" -gt 3 ]]; then
    WEAK_REASON="trivial pattern (only $unique_chars unique chars)"
    return 0
  fi

  if [[ "$val" =~ ^[0-9]+$ && "$val_len" -lt "$MIN_LEN" ]]; then
    WEAK_REASON="numeric-only and too short (${val_len} chars)"
    return 0
  fi

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

  local max_dict_len=$((MIN_LEN + 10))
  for dw in $DICT_WORDS; do
    if [[ "$val_lower" == *"$dw"* && "$val_len" -lt "$max_dict_len" ]]; then
      WEAK_REASON="contains dictionary word '$dw' (len=$val_len)"
      return 0
    fi
  done

  return 1
}

# ── Scan extracted lines ──

FINDINGS=""
FINDING_COUNT=0

while IFS= read -r entry; do
  [[ -z "$entry" ]] && continue
  file="${entry%%:*}"
  line="${entry#*:}"

  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_.-]*)[[:space:]]*[=:][[:space:]]*(.*) ]]; then
    key="${BASH_REMATCH[2]}"
    value="${BASH_REMATCH[3]}"
    value="${value%%#*}"
    value="${value%"${value##*[![:space:]]}"}"
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
  File:        ${file}
  Reason:      ${WEAK_REASON}
  Suggested:   ${SUGGESTED}
  Context:     ${CONTEXT}
"
      fi
    fi
  fi
done <<< "$SCAN_INPUT"

# ── Result ──

if [[ "$FINDING_COUNT" -eq 0 ]]; then
  exit 0
fi

REASON="WEAK SECRET IN STAGED DIFF - commit blocked

Findings: ${FINDING_COUNT} weak secret(s) in staged changes
${FINDINGS}
ACTION REQUIRED:
  Fix the weak secret(s) in the source file, re-stage, then retry the commit.
  Generate a strong secret with: openssl rand -base64 32"

jq -n --arg reason "$REASON" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $reason
  }
}'
