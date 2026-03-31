package logger

import (
	"fmt"
	"testing"
	"time"
)

func TestInit_AllLevels(t *testing.T) {
	levels := []string{"debug", "info", "warn", "error", "unknown"}
	for _, level := range levels {
		t.Run(level, func(t *testing.T) {
			// Should not panic for any level
			Init(level)
		})
	}
}

func TestNew_ReturnsLogger(t *testing.T) {
	l := New("test-tag")
	if l == nil {
		t.Fatal("expected non-nil logger")
	}
	if l.tag != "test-tag" {
		t.Errorf("expected tag test-tag, got %q", l.tag)
	}
}

func TestNew_EmptyTag(t *testing.T) {
	l := New("")
	if l == nil {
		t.Fatal("expected non-nil logger")
	}
}

func TestLogger_D(t *testing.T) {
	Init("debug")
	l := New("test")
	l.D("debug message", "key", "value")
}

func TestLogger_I(t *testing.T) {
	Init("info")
	l := New("test")
	l.I("info message", "count", 42)
}

func TestLogger_W(t *testing.T) {
	Init("warn")
	l := New("test")
	l.W("warn message", "flag", true)
}

func TestLogger_E(t *testing.T) {
	Init("error")
	l := New("test")
	l.E("error message", nil, "duration", time.Second)
}

func TestLogger_E_WithError(t *testing.T) {
	Init("error")
	l := New("test")
	l.E("error message", fmt.Errorf("something broke"))
}

func TestLogger_FieldTypes(t *testing.T) {
	Init("debug")
	l := New("test")
	// Test all field type branches in addFields
	l.D("all types",
		"string_field", "hello",
		"int_field", 42,
		"int64_field", int64(999),
		"bool_field", true,
		"duration_field", time.Millisecond*500,
		"other_field", struct{ X int }{X: 1},
	)
}

func TestLogger_OddFieldCount(t *testing.T) {
	Init("debug")
	l := New("test")
	// Odd number of fields — last one has no value, should not panic
	l.D("odd fields", "key1", "val1", "orphan")
}

func TestLogger_NonStringKey(t *testing.T) {
	Init("debug")
	l := New("test")
	// Non-string key — should skip gracefully
	l.D("bad key", 123, "value")
}
