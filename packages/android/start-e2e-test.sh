#!/bin/bash
# E2E Test Setup Script for Viecz Android App

set -e

echo "========================================="
echo "Viecz E2E Test Setup"
echo "========================================="
echo ""

# Check if device is connected
echo "1. Checking Android device..."
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected!"
    echo "   Please connect a device and enable USB debugging."
    exit 1
fi
DEVICE=$(adb devices | grep "device$" | awk '{print $1}')
echo "✓ Device connected: $DEVICE"
echo ""

# Check backend server
echo "2. Checking backend server..."
if ! curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "❌ Backend server not responding on port 8080!"
    echo "   Please start the server:"
    echo "   cd packages/server && go run cmd/server/main.go"
    exit 1
fi
echo "✓ Backend server running"
echo ""

# Setup port forwarding
echo "3. Setting up port forwarding..."
adb reverse tcp:8080 tcp:8080
echo "✓ Port forwarding configured: Device 8080 → Host 8080"
echo ""

# Install app
echo "4. Building and installing app..."
./gradlew installDebug
echo "✓ App installed"
echo ""

# Start logcat monitoring
echo "5. Starting logcat monitoring..."
echo "   Press Ctrl+C to stop"
echo ""
echo "========================================="
echo "Ready for E2E Testing!"
echo "========================================="
echo ""
echo "Test Credentials:"
echo "  Email: nhannht.alpha@gmail.com"
echo "  Password: Password123"
echo ""
echo "Categories available: 11"
echo "  - Moving & Transport, Delivery, Assembly & Installation"
echo "  - Cleaning, Tutoring & Teaching, Tech Support"
echo "  - Event Help, Shopping & Errands, Pet Care"
echo "  - Photography, Other"
echo ""
echo "Follow the guide in E2E_TESTING_GUIDE.md"
echo "========================================="
echo ""
sleep 2

# Clear logs and start monitoring
adb logcat -c
exec adb logcat -s AuthViewModel:D TaskListViewModel:D CategoryViewModel:D ProfileViewModel:D CreateTaskViewModel:D ApplyTaskViewModel:D TaskDetailViewModel:D AuthInterceptor:D OkHttp:D AndroidRuntime:E *:E
