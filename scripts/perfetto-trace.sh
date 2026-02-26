#!/usr/bin/env bash
# Capture and analyze Perfetto traces from an Android device.
#
# Usage:
#   perfetto-trace.sh capture [seconds]     # Capture trace (default 10s)
#   perfetto-trace.sh slow-frames           # Query slow frames from last trace
#   perfetto-trace.sh top-slices [n]        # Top N longest slices (default 20)
#   perfetto-trace.sh memory                # Memory counters summary
#   perfetto-trace.sh query "SQL"           # Run custom SQL on last trace
#   perfetto-trace.sh help

set -euo pipefail

TRACE_DIR="/tmp/perfetto-traces"
TRACE_FILE="$TRACE_DIR/trace.perfetto-trace"
PACKAGE="com.viecz.vieczandroid.dev"

mkdir -p "$TRACE_DIR"

case "${1:-help}" in
    capture)
        DURATION="${2:-10}"
        echo "Capturing ${DURATION}s trace on device..."
        adb shell perfetto \
            -o /data/misc/perfetto-traces/trace.perfetto-trace \
            -t "${DURATION}s" \
            sched freq idle am wm gfx view binder_driver hal dalvik camera input res memory
        echo "Pulling trace..."
        adb pull /data/misc/perfetto-traces/trace.perfetto-trace "$TRACE_FILE"
        echo "Trace saved to $TRACE_FILE ($(du -h "$TRACE_FILE" | cut -f1))"
        echo "Run: perfetto-trace.sh slow-frames"
        ;;
    slow-frames)
        echo "=== Slow Frames (>16ms) ==="
        trace_processor_shell "$TRACE_FILE" --query "
            SELECT
                ts / 1000000 AS timestamp_ms,
                dur / 1000000 AS duration_ms,
                name
            FROM slice
            WHERE dur > 16000000
            AND name LIKE '%Choreographer%' OR name LIKE '%doFrame%' OR name LIKE '%DrawFrame%'
            ORDER BY dur DESC
            LIMIT 30
        "
        ;;
    top-slices)
        N="${2:-20}"
        echo "=== Top $N Longest Slices ==="
        trace_processor_shell "$TRACE_FILE" --query "
            SELECT
                name,
                COUNT(*) AS count,
                CAST(SUM(dur) / 1000000 AS INTEGER) AS total_ms,
                CAST(MAX(dur) / 1000000 AS INTEGER) AS max_ms,
                CAST(AVG(dur) / 1000000 AS INTEGER) AS avg_ms
            FROM slice
            WHERE dur > 1000000
            GROUP BY name
            ORDER BY total_ms DESC
            LIMIT $N
        "
        ;;
    memory)
        echo "=== Memory Counters ==="
        trace_processor_shell "$TRACE_FILE" --query "
            SELECT
                name,
                CAST(MAX(value) / 1024 / 1024 AS INTEGER) AS max_mb,
                CAST(MIN(value) / 1024 / 1024 AS INTEGER) AS min_mb,
                CAST(AVG(value) / 1024 / 1024 AS INTEGER) AS avg_mb
            FROM counter
            WHERE name LIKE '%mem%' OR name LIKE '%RSS%' OR name LIKE '%heap%'
            GROUP BY name
            ORDER BY max_mb DESC
            LIMIT 20
        "
        ;;
    query)
        [ -z "${2:-}" ] && echo "Usage: perfetto-trace.sh query \"SQL\"" && exit 1
        trace_processor_shell "$TRACE_FILE" --query "$2"
        ;;
    help|*)
        head -8 "$0" | tail -7
        ;;
esac
