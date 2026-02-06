# Makefile for Viecz Server

# Binary name
BINARY_NAME=viecz-server
BUILD_DIR=build

# Go commands
GOCMD=go
GOBUILD=$(GOCMD) build
GORUN=$(GOCMD) run
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Main package path
MAIN_PATH=./cmd/server

.PHONY: all build run dev clean test deps help

# Default target
all: deps build

# Install dependencies
deps:
	@echo "Installing dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy

# Build the server binary
build:
	@echo "Building server..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Build for production (with optimizations)
build-prod:
	@echo "Building for production..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 $(GOBUILD) -ldflags="-s -w" -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Production build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the server without building (development mode)
dev:
	@echo "Running server in development mode..."
	$(GORUN) $(MAIN_PATH)/main.go

# Run the built binary
run: build
	@echo "Running built server..."
	./$(BUILD_DIR)/$(BINARY_NAME)

# Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Format code
fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

# Run linter (requires golangci-lint)
lint:
	@echo "Running linter..."
	@which golangci-lint > /dev/null || (echo "golangci-lint not installed. Run: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest" && exit 1)
	golangci-lint run

# Hot reload (requires air: go install github.com/air-verse/air@latest)
watch:
	@echo "Starting hot reload..."
	@which air > /dev/null || (echo "air not installed. Run: go install github.com/air-verse/air@latest" && exit 1)
	air

# Display help
help:
	@echo "Available targets:"
	@echo "  make deps          - Install/update dependencies"
	@echo "  make dev           - Run server in development mode (no build)"
	@echo "  make build         - Build server binary"
	@echo "  make build-prod    - Build optimized production binary"
	@echo "  make run           - Build and run server"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make test          - Run tests"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make fmt           - Format code"
	@echo "  make lint          - Run linter (requires golangci-lint)"
	@echo "  make watch         - Run with hot reload (requires air)"
	@echo "  make help          - Show this help message"
