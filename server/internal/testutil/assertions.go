package testutil

import (
	"strings"
	"testing"
)

// AssertError checks if an error occurred when expected
func AssertError(t *testing.T, err error, wantErr bool, errContains string) {
	t.Helper()
	if wantErr {
		if err == nil {
			t.Errorf("Expected error containing '%s', got nil", errContains)
		} else if errContains != "" && !strings.Contains(err.Error(), errContains) {
			t.Errorf("Expected error containing '%s', got '%s'", errContains, err.Error())
		}
	} else {
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
	}
}

// AssertNoError checks that no error occurred
func AssertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

// AssertEqual checks if two values are equal
func AssertEqual(t *testing.T, got, want interface{}, message string) {
	t.Helper()
	if got != want {
		t.Errorf("%s: got %v, want %v", message, got, want)
	}
}

// AssertNotNil checks if a value is not nil
func AssertNotNil(t *testing.T, val interface{}, message string) {
	t.Helper()
	if val == nil {
		t.Fatalf("%s: expected non-nil value, got nil", message)
	}
}

// AssertNil checks if a value is nil
func AssertNil(t *testing.T, val interface{}, message string) {
	t.Helper()
	if val != nil {
		t.Errorf("%s: expected nil, got %v", message, val)
	}
}

// AssertTrue checks if a condition is true
func AssertTrue(t *testing.T, condition bool, message string) {
	t.Helper()
	if !condition {
		t.Errorf("%s: expected true, got false", message)
	}
}

// AssertFalse checks if a condition is false
func AssertFalse(t *testing.T, condition bool, message string) {
	t.Helper()
	if condition {
		t.Errorf("%s: expected false, got true", message)
	}
}
