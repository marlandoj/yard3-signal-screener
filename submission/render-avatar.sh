#!/bin/bash
export PATH="$PATH:/root/.local/bin"
PROJ=/home/workspace/Projects/yard3-signal-screener-live
LOG=$PROJ/submission/heygen-session.json
SCRIPT=$(cat "$PROJ/submission/heygen-narration.txt")

echo "Submitting to HeyGen at $(date -u)..."
heygen video-agent create \
  --prompt "$SCRIPT" \
  --avatar-id "462d6d363a9e47a481720faa9bcf17d0" \
  --voice-id "Zw5q5zB8V9pFbEo962uO" \
  --orientation landscape \
  --wait \
  --timeout 40m \
  > "$LOG" 2>&1
echo "Exit: $? at $(date -u)"
