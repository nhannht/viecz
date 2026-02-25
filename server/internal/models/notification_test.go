package models

import (
	"encoding/json"
	"testing"
)

func TestStringMap_Value(t *testing.T) {
	tests := []struct {
		name    string
		m       StringMap
		wantNil bool
	}{
		{
			name:    "nil map returns nil",
			m:       nil,
			wantNil: true,
		},
		{
			name:    "non-nil map returns JSON bytes",
			m:       StringMap{"key": "value", "foo": "bar"},
			wantNil: false,
		},
		{
			name:    "empty map returns JSON",
			m:       StringMap{},
			wantNil: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.m.Value()
			if err != nil {
				t.Errorf("Value() returned error: %v", err)
			}

			if tt.wantNil {
				if val != nil {
					t.Errorf("Expected nil, got %v", val)
				}
			} else {
				if val == nil {
					t.Error("Expected non-nil value, got nil")
					return
				}
				// Verify it's valid JSON
				bytes, ok := val.([]byte)
				if !ok {
					t.Errorf("Expected []byte, got %T", val)
					return
				}
				var parsed map[string]string
				if err := json.Unmarshal(bytes, &parsed); err != nil {
					t.Errorf("Value() returned invalid JSON: %v", err)
				}
				// Verify roundtrip
				for k, v := range tt.m {
					if parsed[k] != v {
						t.Errorf("Key %q: expected %q, got %q", k, v, parsed[k])
					}
				}
			}
		})
	}
}

func TestStringMap_Scan(t *testing.T) {
	tests := []struct {
		name    string
		src     interface{}
		wantErr bool
		wantNil bool
		wantMap StringMap
	}{
		{
			name:    "nil src",
			src:     nil,
			wantErr: false,
			wantNil: true,
		},
		{
			name:    "[]byte src",
			src:     []byte(`{"key":"value","foo":"bar"}`),
			wantErr: false,
			wantMap: StringMap{"key": "value", "foo": "bar"},
		},
		{
			name:    "string src",
			src:     `{"hello":"world"}`,
			wantErr: false,
			wantMap: StringMap{"hello": "world"},
		},
		{
			name:    "empty JSON object",
			src:     []byte(`{}`),
			wantErr: false,
			wantMap: StringMap{},
		},
		{
			name:    "unsupported type - int",
			src:     123,
			wantErr: true,
		},
		{
			name:    "unsupported type - bool",
			src:     true,
			wantErr: true,
		},
		{
			name:    "invalid JSON bytes",
			src:     []byte(`not json`),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var m StringMap
			err := m.Scan(tt.src)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("Expected no error, got %v", err)
				return
			}

			if tt.wantNil {
				if m != nil {
					t.Errorf("Expected nil map, got %v", m)
				}
				return
			}

			if len(m) != len(tt.wantMap) {
				t.Errorf("Expected map length %d, got %d", len(tt.wantMap), len(m))
				return
			}

			for k, v := range tt.wantMap {
				if m[k] != v {
					t.Errorf("Key %q: expected %q, got %q", k, v, m[k])
				}
			}
		})
	}
}
