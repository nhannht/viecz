package services

import (
	"testing"

	"viecz.vieczserver/internal/models"
)

func TestCheckProfileForAction_PostTask(t *testing.T) {
	tests := []struct {
		name        string
		user        *models.User
		wantMissing []string
	}{
		{
			name:        "complete profile passes",
			user:        &models.User{Name: "Alice"},
			wantMissing: nil,
		},
		{
			name:        "empty name fails",
			user:        &models.User{Name: ""},
			wantMissing: []string{"name"},
		},
		{
			name:        "default 'User' name fails",
			user:        &models.User{Name: "User"},
			wantMissing: []string{"name"},
		},
		{
			name:        "whitespace-only name fails",
			user:        &models.User{Name: "   "},
			wantMissing: []string{"name"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckProfileForAction(tt.user, ProfileActionPostTask)
			if tt.wantMissing == nil {
				if err != nil {
					t.Errorf("expected nil, got %v", err)
				}
				return
			}
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if len(err.MissingFields) != len(tt.wantMissing) {
				t.Errorf("missing fields = %v, want %v", err.MissingFields, tt.wantMissing)
			}
			for i, f := range tt.wantMissing {
				if err.MissingFields[i] != f {
					t.Errorf("missing field[%d] = %q, want %q", i, err.MissingFields[i], f)
				}
			}
		})
	}
}

func TestCheckProfileForAction_ApplyTask(t *testing.T) {
	bio := "I'm a CS student"

	tests := []struct {
		name        string
		user        *models.User
		wantMissing []string
	}{
		{
			name:        "complete profile passes",
			user:        &models.User{Name: "Alice", Bio: &bio},
			wantMissing: nil,
		},
		{
			name:        "missing bio fails",
			user:        &models.User{Name: "Alice"},
			wantMissing: []string{"bio"},
		},
		{
			name:        "missing both fails",
			user:        &models.User{Name: ""},
			wantMissing: []string{"name", "bio"},
		},
		{
			name:        "empty bio string fails",
			user:        &models.User{Name: "Alice", Bio: profileStrPtr("")},
			wantMissing: []string{"bio"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckProfileForAction(tt.user, ProfileActionApplyTask)
			if tt.wantMissing == nil {
				if err != nil {
					t.Errorf("expected nil, got %v", err)
				}
				return
			}
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if len(err.MissingFields) != len(tt.wantMissing) {
				t.Errorf("missing fields = %v, want %v", err.MissingFields, tt.wantMissing)
			}
		})
	}
}

func TestCheckProfileForAction_SendMessage(t *testing.T) {
	err := CheckProfileForAction(&models.User{Name: "Alice"}, ProfileActionSendMessage)
	if err != nil {
		t.Errorf("expected nil, got %v", err)
	}

	err = CheckProfileForAction(&models.User{Name: ""}, ProfileActionSendMessage)
	if err == nil {
		t.Fatal("expected error for empty name")
	}
	if err.MissingFields[0] != "name" {
		t.Errorf("expected missing 'name', got %v", err.MissingFields)
	}
}

func TestProfileIncompleteError_Error(t *testing.T) {
	err := &ProfileIncompleteError{
		MissingFields: []string{"name", "bio"},
		Action:        ProfileActionApplyTask,
		Message:       "test",
	}
	got := err.Error()
	if got != "profile incomplete for apply_task: missing name, bio" {
		t.Errorf("unexpected error string: %s", got)
	}
}

func profileStrPtr(s string) *string {
	return &s
}
