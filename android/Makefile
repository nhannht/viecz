# Makefile for Viecz Android App

# Package and activity info
PACKAGE_NAME=com.viecz.vieczandroid
MAIN_ACTIVITY=$(PACKAGE_NAME)/.MainActivity

# Gradle wrapper
GRADLEW=./gradlew

.PHONY: help build install run install-run clean test lint port-forward

# Default target
help:
	@echo "Available targets:"
	@echo "  make build        - Build debug APK"
	@echo "  make install      - Build and install debug APK"
	@echo "  make run          - Launch the app (must be installed)"
	@echo "  make install-run  - Build, install, and launch app"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make test         - Run unit tests"
	@echo "  make lint         - Run lint checks"
	@echo "  make port-forward - Set up ADB reverse port forwarding"
	@echo "  make dev          - Full dev setup: port forward + install + run"

# Build debug APK
build:
	@echo "Building debug APK..."
	$(GRADLEW) assembleDebug

# Install debug APK
install:
	@echo "Installing debug APK..."
	$(GRADLEW) installDebug

# Launch the app
run:
	@echo "Launching app..."
	adb shell am start -n $(MAIN_ACTIVITY)

# Install and launch
install-run: install
	@echo "App installed, launching..."
	@sleep 1
	adb shell am start -n $(MAIN_ACTIVITY)

# Set up ADB reverse port forwarding
port-forward:
	@echo "Setting up ADB reverse port forwarding..."
	adb reverse tcp:8080 tcp:8080
	@echo "Port forwarding active: device:8080 -> host:8080"

# Full dev workflow: port forward + install + run
dev: port-forward install-run
	@echo "Development setup complete!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	$(GRADLEW) clean

# Run unit tests
test:
	@echo "Running unit tests..."
	$(GRADLEW) testDebugUnitTest

# Run lint checks
lint:
	@echo "Running lint checks..."
	$(GRADLEW) lint

# Stop the app
stop:
	@echo "Stopping app..."
	adb shell am force-stop $(PACKAGE_NAME)

# Restart the app
restart: stop run

# View logcat for the app
logs:
	@echo "Showing logs for $(PACKAGE_NAME)..."
	adb logcat | grep $(PACKAGE_NAME)

# Clear app data
clear-data:
	@echo "Clearing app data..."
	adb shell pm clear $(PACKAGE_NAME)
