#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

CLIPS_DIR="output/clips"
OUTPUT="output/demo-final.mp4"
MUSIC="assets/music.mp3"
SUBS="subtitles/subs.srt"

echo "=== Stitch Demo Video ==="

# Step 1: Convert webm clips to mp4
echo "Converting clips to MP4..."
CONCAT_FILE="output/concat.txt"
> "$CONCAT_FILE"

for webm in "$CLIPS_DIR"/*.webm; do
  base=$(basename "$webm" .webm)
  mp4="$CLIPS_DIR/${base}.mp4"
  echo "  $base.webm → $base.mp4"
  ffmpeg -y -i "$webm" \
    -c:v libx264 -preset fast -crf 18 \
    -r 30 -s 1920x1080 \
    -an \
    "$mp4" 2>/dev/null
  echo "file '$(realpath "$mp4")'" >> "$CONCAT_FILE"
done

# Step 2: Concatenate
echo "Concatenating clips..."
CONCAT_MP4="output/demo-raw.mp4"
ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" \
  -c:v libx264 -preset fast -crf 18 \
  "$CONCAT_MP4" 2>/dev/null

# Step 3: Add subtitles (and music if available)
echo "Adding subtitles..."
if [ -f "$MUSIC" ]; then
  ffmpeg -y -i "$CONCAT_MP4" -i "$MUSIC" \
    -vf "subtitles=${SUBS}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,MarginV=40'" \
    -c:v libx264 -preset slow -crf 18 \
    -filter_complex "[1:a]volume=0.15[music]" \
    -map 0:v -map "[music]" \
    -c:a aac -b:a 128k \
    -shortest -r 30 \
    "$OUTPUT" 2>/dev/null
else
  echo "  (no music file, subtitles only)"
  ffmpeg -y -i "$CONCAT_MP4" \
    -vf "subtitles=${SUBS}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,MarginV=40'" \
    -c:v libx264 -preset slow -crf 18 \
    -an -r 30 \
    "$OUTPUT" 2>/dev/null
fi

rm -f "$CONCAT_MP4"

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null)
SIZE=$(du -h "$OUTPUT" | cut -f1)

echo ""
echo "=== Done ==="
echo "Output: $OUTPUT"
echo "Duration: ${DURATION}s"
echo "Size: $SIZE"
