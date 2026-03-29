#!/bin/bash
# YouTrack compliance hook — fires on UserPromptSubmit
# Injects a reminder into Claude's context when the prompt looks like task work
# but doesn't mention a YouTrack issue ID (e.g., KNS-123)

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

# If prompt is empty or very short, skip
if [ ${#PROMPT} -lt 10 ]; then
  exit 0
fi

# If already mentions a YouTrack issue ID (KNS-xxx, PM-xxx), allow silently
if echo "$PROMPT" | grep -iqP '(KNS|PM)-\d+'; then
  exit 0
fi

# If it's just a question/greeting/analysis (not actionable work), skip
if echo "$PROMPT" | grep -iqP '^\s*(what|how|why|where|when|who|can you|does|is |are |show|explain|hello|hi |hey|good)'; then
  exit 0
fi

# If it looks like task/feature/bug work without a YouTrack reference, inject reminder
if echo "$PROMPT" | grep -iqP '(fix|bug|feature|implement|refactor|add|create|build|deploy|update|change|remove|delete|migrate|upgrade|write.*test|set up|configure)'; then
  # Output JSON with additionalContext — this gets injected into Claude's context
  jq -n '{
    decision: "allow",
    hookSpecificOutput: {
      additionalContext: "YOUTRACK REMINDER: Before starting this work, ensure a YouTrack issue exists in KNS project (https://youtrack.fishcmus.io.vn). Create one if needed, move to In Progress, reference the issue ID in your work. After completion: comment results, mark Done, log time."
    }
  }'
  exit 0
fi

exit 0
