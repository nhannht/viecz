#!/bin/bash
# Development server with auto-reload using Air

echo "Starting Viecz server with Air (auto-reload)..."
echo "Press Ctrl+C to stop"
echo ""

# Check if Air is installed
if ! command -v air &> /dev/null; then
    echo "Air is not installed. Installing..."
    go install github.com/air-verse/air@latest
fi

# Start Air
air
