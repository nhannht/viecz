#!/usr/bin/env bash
# CPU profiling with simpleperf on Android device.
#
# Usage:
#   simpleperf-profile.sh record [seconds]  # Record CPU profile (default 10s)
#   simpleperf-profile.sh report            # Text report from last recording
#   simpleperf-profile.sh callgraph         # Call graph from last recording
#   simpleperf-profile.sh hotspots [n]      # Top N CPU-heavy functions (default 20)
#   simpleperf-profile.sh help

set -euo pipefail

PACKAGE="com.viecz.vieczandroid.dev"
PERF_DATA="/data/local/tmp/perf.data"
LOCAL_DATA="/tmp/simpleperf-perf.data"

case "${1:-help}" in
    record)
        DURATION="${2:-10}"
        PID=$(adb shell pidof "$PACKAGE" 2>/dev/null || echo "")
        if [ -z "$PID" ]; then
            echo "Error: $PACKAGE not running. Launch the app first."
            exit 1
        fi
        echo "Recording CPU profile for ${DURATION}s (PID: $PID)..."
        adb shell simpleperf record \
            -p "$PID" \
            --duration "$DURATION" \
            -o "$PERF_DATA" \
            --call-graph fp
        echo "Pulling perf data..."
        adb pull "$PERF_DATA" "$LOCAL_DATA"
        echo "Saved to $LOCAL_DATA ($(du -h "$LOCAL_DATA" | cut -f1))"
        echo "Run: simpleperf-profile.sh report"
        ;;
    report)
        echo "=== CPU Profile Report ==="
        adb shell simpleperf report -i "$PERF_DATA" --sort comm,dso,symbol 2>&1 | head -60
        ;;
    callgraph)
        echo "=== Call Graph ==="
        adb shell simpleperf report -i "$PERF_DATA" -g 2>&1 | head -80
        ;;
    hotspots)
        N="${2:-20}"
        echo "=== Top $N CPU Hotspots ==="
        adb shell simpleperf report -i "$PERF_DATA" --sort symbol -n "$N" 2>&1
        ;;
    help|*)
        head -8 "$0" | tail -7
        ;;
esac
