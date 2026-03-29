#!/bin/bash
# PreToolUse hook: Remind to use Context7 before writing code that uses external libraries
# Triggers on Write and Edit tools for code files

TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
INPUT="${CLAUDE_TOOL_INPUT:-}"

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only check code files (go, ts, py, kt, java)
if [[ ! "$FILE_PATH" =~ \.(go|ts|tsx|py|kt|java)$ ]]; then
  exit 0
fi

# Check if the new content adds external imports
CONTENT=""
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(echo "$INPUT" | jq -r '.content // empty' 2>/dev/null)
elif [[ "$TOOL_NAME" == "Edit" ]]; then
  CONTENT=$(echo "$INPUT" | jq -r '.new_string // empty' 2>/dev/null)
fi

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# Detect new external library imports
HAS_NEW_IMPORT=false

# Go: github.com/ imports
if [[ "$FILE_PATH" =~ \.go$ ]] && echo "$CONTENT" | grep -qE '"github\.com/|"golang\.org/'; then
  HAS_NEW_IMPORT=true
fi

# TypeScript: non-relative imports (not starting with . or @angular)
if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]] && echo "$CONTENT" | grep -qE "from '[^./]" | grep -vE "from '@angular"; then
  HAS_NEW_IMPORT=true
fi

# Python: pip package imports
if [[ "$FILE_PATH" =~ \.py$ ]] && echo "$CONTENT" | grep -qE '^import |^from ' | grep -vE 'import os|import sys|import json|import re|import time|import logging|from pathlib|from typing|from dataclasses|from enum|from collections'; then
  HAS_NEW_IMPORT=true
fi

if [[ "$HAS_NEW_IMPORT" == "true" ]]; then
  echo "REMINDER: External library usage detected. Did you check Context7 docs first? Use mcp__context7__resolve-library-id + mcp__context7__query-docs before writing code with external libraries."
fi

exit 0
