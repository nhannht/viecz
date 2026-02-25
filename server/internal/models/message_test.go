package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestMessage_TableName(t *testing.T) {
	m := Message{}
	if m.TableName() != "messages" {
		t.Errorf("Expected table name 'messages', got '%s'", m.TableName())
	}
}

func TestConversation_TableName(t *testing.T) {
	c := Conversation{}
	if c.TableName() != "conversations" {
		t.Errorf("Expected table name 'conversations', got '%s'", c.TableName())
	}
}

func TestFlexTime_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantZero bool
		wantErr  bool
	}{
		{
			name:     "empty string",
			input:    `""`,
			wantZero: true,
			wantErr:  false,
		},
		{
			name:     "null",
			input:    `null`,
			wantZero: true,
			wantErr:  false,
		},
		{
			name:     "valid RFC3339 time",
			input:    `"2024-06-15T10:30:00Z"`,
			wantZero: false,
			wantErr:  false,
		},
		{
			name:     "invalid time string",
			input:    `"not-a-time"`,
			wantZero: true,
			wantErr:  false, // FlexTime silently accepts unparseable time
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var ft FlexTime
			err := json.Unmarshal([]byte(tt.input), &ft)

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

			if tt.wantZero && !ft.Time.IsZero() {
				t.Errorf("Expected zero time, got %v", ft.Time)
			}

			if !tt.wantZero && ft.Time.IsZero() {
				t.Error("Expected non-zero time, got zero")
			}
		})
	}
}

func TestFlexTime_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		ft       FlexTime
		wantNull bool
	}{
		{
			name:     "zero time returns null",
			ft:       FlexTime{},
			wantNull: true,
		},
		{
			name:     "non-zero time returns JSON time",
			ft:       FlexTime{Time: time.Date(2024, 6, 15, 10, 30, 0, 0, time.UTC)},
			wantNull: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.ft)
			if err != nil {
				t.Errorf("MarshalJSON() returned error: %v", err)
				return
			}

			if tt.wantNull {
				if string(data) != "null" {
					t.Errorf("Expected 'null', got %s", string(data))
				}
			} else {
				if string(data) == "null" {
					t.Error("Expected non-null JSON time, got 'null'")
				}
				// Verify it can be unmarshaled back
				var parsed time.Time
				if err := json.Unmarshal(data, &parsed); err != nil {
					t.Errorf("MarshalJSON() output cannot be unmarshaled: %v", err)
				}
				if !parsed.Equal(tt.ft.Time) {
					t.Errorf("Roundtrip failed: expected %v, got %v", tt.ft.Time, parsed)
				}
			}
		})
	}
}

func TestFlexTime_UnmarshalJSON_InStruct(t *testing.T) {
	// Test FlexTime as part of WebSocketMessage (realistic usage)
	type testMsg struct {
		CreatedAt FlexTime `json:"created_at"`
	}

	tests := []struct {
		name     string
		json     string
		wantZero bool
	}{
		{
			name:     "empty created_at from Android client",
			json:     `{"created_at":""}`,
			wantZero: true,
		},
		{
			name:     "null created_at",
			json:     `{"created_at":null}`,
			wantZero: true,
		},
		{
			name:     "valid created_at",
			json:     `{"created_at":"2024-06-15T10:30:00Z"}`,
			wantZero: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var msg testMsg
			err := json.Unmarshal([]byte(tt.json), &msg)
			if err != nil {
				t.Errorf("Unmarshal error: %v", err)
				return
			}

			if tt.wantZero && !msg.CreatedAt.Time.IsZero() {
				t.Errorf("Expected zero time, got %v", msg.CreatedAt.Time)
			}

			if !tt.wantZero && msg.CreatedAt.Time.IsZero() {
				t.Error("Expected non-zero time, got zero")
			}
		})
	}
}
