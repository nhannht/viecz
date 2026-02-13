#!/usr/bin/env bash
#
# Full E2E Integration Test: Real Go Server + Android Client
#
# Prerequisites:
#   - Go 1.21+ with CGO_ENABLED=1 (for SQLite)
#   - Android SDK + Gradle wrapper
#
# Usage:
#   ./scripts/run-full-e2e.sh emulator    # Run using Android emulator
#   ./scripts/run-full-e2e.sh device      # Run using real USB-connected device
#   ./scripts/run-full-e2e.sh             # Interactive prompt to choose
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
ANDROID_DIR="$ROOT_DIR/android"
SERVER_PID=""
EMULATOR_PID=""
SERVER_PORT=9999
TESTSERVER_BIN="$SERVER_DIR/bin/testserver"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        echo "  Test server stopped (PID $SERVER_PID)"
    fi
    if [ -n "$EMULATOR_PID" ] && kill -0 "$EMULATOR_PID" 2>/dev/null; then
        echo "  Emulator is still running (PID $EMULATOR_PID). Stop it manually if needed."
    fi
}
trap cleanup EXIT

# ============================================================
# Parse mode from argument or prompt
# ============================================================
MODE="${1:-}"

if [ -z "$MODE" ]; then
    echo "=========================================="
    echo "  Viecz Full E2E Integration Test"
    echo "=========================================="
    echo ""
    echo "How do you want to run the test?"
    echo ""
    echo -e "  ${CYAN}1)${NC} ${BOLD}emulator${NC}  — Launch/use Android emulator (no physical device needed)"
    echo -e "  ${CYAN}2)${NC} ${BOLD}device${NC}    — Use a real Android device connected via USB"
    echo ""
    read -rp "Select [1/2]: " CHOICE
    case "$CHOICE" in
        1|emulator) MODE="emulator" ;;
        2|device)   MODE="device" ;;
        *)
            echo -e "${RED}Invalid choice. Use: ./scripts/run-full-e2e.sh [emulator|device]${NC}"
            exit 1
            ;;
    esac
fi

# Normalize
case "$MODE" in
    emulator|emu|1) MODE="emulator" ;;
    device|dev|2)   MODE="device" ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: ./scripts/run-full-e2e.sh [emulator|device]"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  Viecz Full E2E Integration Test"
echo "  Mode: $MODE"
echo "=========================================="
echo ""

# ============================================================
# Step 1: Ensure a target device/emulator is available
# ============================================================
echo -e "${YELLOW}[1/6] Setting up Android target ($MODE)...${NC}"

if [ "$MODE" = "emulator" ]; then
    # --- Emulator mode ---
    # Check if an emulator is already running
    RUNNING_EMU=$(adb devices 2>/dev/null | grep -E '^emulator-' | grep 'device$' | head -1 | awk '{print $1}' || true)

    if [ -n "$RUNNING_EMU" ]; then
        DEVICE_SERIAL="$RUNNING_EMU"
        echo -e "${GREEN}Emulator already running: $DEVICE_SERIAL${NC}"
    else
        # List available AVDs
        AVDS=$(emulator -list-avds 2>/dev/null || true)
        if [ -z "$AVDS" ]; then
            echo -e "${RED}ERROR: No Android Virtual Devices (AVDs) found!${NC}"
            echo ""
            echo "Create one first:"
            echo "  1. Open Android Studio -> Device Manager -> Create Device"
            echo "  2. Or use command line:"
            echo "     sdkmanager 'system-images;android-34;google_apis;x86_64'"
            echo "     avdmanager create avd -n test_device -k 'system-images;android-34;google_apis;x86_64'"
            exit 1
        fi

        # Pick the first AVD
        AVD_NAME=$(echo "$AVDS" | head -1)
        echo "Available AVDs:"
        echo "$AVDS" | while read -r avd; do echo "  - $avd"; done
        echo ""
        echo -e "Starting emulator: ${BOLD}$AVD_NAME${NC}"

        emulator -avd "$AVD_NAME" -no-snapshot-load -no-audio -no-window &
        EMULATOR_PID=$!
        echo "Emulator PID: $EMULATOR_PID"

        # Wait for emulator to boot
        echo -n "Waiting for emulator to boot"
        for i in $(seq 1 120); do
            BOOT_COMPLETE=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
            if [ "$BOOT_COMPLETE" = "1" ]; then
                echo ""
                echo -e "${GREEN}Emulator booted!${NC}"
                break
            fi
            echo -n "."
            sleep 2
            if [ "$i" -eq 120 ]; then
                echo ""
                echo -e "${RED}ERROR: Emulator did not boot within 4 minutes${NC}"
                exit 1
            fi
        done

        DEVICE_SERIAL=$(adb devices | grep -E '^emulator-' | grep 'device$' | head -1 | awk '{print $1}')
    fi

    HOST_IP="10.0.2.2"
    echo -e "Host IP for emulator: ${GREEN}$HOST_IP${NC} (Android emulator loopback)"

else
    # --- Real device mode ---
    DEVICE_SERIAL=$(adb devices 2>/dev/null | grep -v 'emulator-' | grep 'device$' | head -1 | awk '{print $1}' || true)

    if [ -z "$DEVICE_SERIAL" ]; then
        echo -e "${RED}ERROR: No real Android device found!${NC}"
        echo ""
        echo "Make sure your device is:"
        echo "  1. Connected via USB"
        echo "  2. USB debugging is enabled (Settings -> Developer options)"
        echo "  3. Authorized for this computer (check the prompt on the device)"
        echo ""
        echo "Verify with: adb devices"
        exit 1
    fi

    echo -e "${GREEN}Found device: $DEVICE_SERIAL${NC}"

    # Detect host LAN IP
    HOST_IP=$(ip route get 1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    if [ -z "$HOST_IP" ]; then
        echo -e "${RED}ERROR: Could not detect host LAN IP${NC}"
        echo "Set it manually: HOST_IP=192.168.x.x ./scripts/run-full-e2e.sh device"
        exit 1
    fi

    echo -e "Host LAN IP: ${GREEN}$HOST_IP${NC}"
    echo ""
    echo -e "${YELLOW}NOTE: Make sure your device is on the same network as this machine,${NC}"
    echo -e "${YELLOW}      or that your firewall allows incoming connections on port $SERVER_PORT.${NC}"
fi

# ============================================================
# Step 2: Build test server
# ============================================================
echo ""
echo -e "${YELLOW}[2/6] Building test server...${NC}"
cd "$SERVER_DIR"
mkdir -p bin
CGO_ENABLED=1 go build -o "$TESTSERVER_BIN" ./cmd/testserver
echo -e "${GREEN}Test server built: $TESTSERVER_BIN${NC}"

# ============================================================
# Step 3: Start test server
# ============================================================
echo -e "${YELLOW}[3/6] Starting test server on 0.0.0.0:$SERVER_PORT...${NC}"
"$TESTSERVER_BIN" &
SERVER_PID=$!
echo "Test server PID: $SERVER_PID"

echo -n "Waiting for server to be ready"
for i in $(seq 1 30); do
    if curl -sf "http://localhost:$SERVER_PORT/api/v1/health" > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}Server is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo ""
        echo -e "${RED}ERROR: Server did not start within 30 seconds${NC}"
        exit 1
    fi
done

echo "Server health: $(curl -s "http://localhost:$SERVER_PORT/api/v1/health")"

# ============================================================
# Step 4: Run Android instrumented test
# ============================================================
echo ""
echo -e "${YELLOW}[4/6] Running Full Job Lifecycle E2E test...${NC}"
echo "  Mode:   $MODE"
echo "  Server: http://$HOST_IP:$SERVER_PORT"
echo "  Device: $DEVICE_SERIAL"
echo ""

cd "$ANDROID_DIR"

TEST_RESULT=0
./gradlew connectedAndroidTest \
    -Pandroid.testInstrumentationRunnerArguments.testServerHost="$HOST_IP" \
    -Pandroid.testInstrumentationRunnerArguments.testServerPort="$SERVER_PORT" \
    -Pandroid.testInstrumentationRunnerArguments.class=com.viecz.vieczandroid.e2e.S13_FullJobLifecycleE2ETest \
    --info 2>&1 | tee /tmp/viecz-e2e-output.log || TEST_RESULT=$?

# ============================================================
# Step 5: Report result
# ============================================================
echo ""
echo "=========================================="
if [ "$TEST_RESULT" -eq 0 ]; then
    echo -e "  ${GREEN}FULL E2E TEST: PASSED${NC}"
else
    echo -e "  ${RED}FULL E2E TEST: FAILED (exit code: $TEST_RESULT)${NC}"
    echo ""
    echo "  Test output: /tmp/viecz-e2e-output.log"
    echo "  HTML report: $ANDROID_DIR/app/build/reports/androidTests/connected/index.html"
fi
echo "  Mode: $MODE | Device: $DEVICE_SERIAL"
echo "=========================================="

exit $TEST_RESULT
