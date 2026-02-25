package models

import (
	"testing"
)

func TestUser_Validate(t *testing.T) {
	tests := []struct {
		name    string
		user    *User
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid user",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				Rating:       4.5,
			},
			wantErr: false,
		},
		{
			name: "missing email",
			user: &User{
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
			},
			wantErr: true,
			errMsg:  "at least one of email or phone is required",
		},
		{
			name: "invalid email format",
			user: &User{
				Email:        stringPtr("notanemail"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
			},
			wantErr: true,
			errMsg:  "invalid email format",
		},
		{
			name: "missing name",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "",
			},
			wantErr: true,
			errMsg:  "name is required",
		},
		{
			name: "name too long",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         string(make([]byte, 101)), // 101 characters
			},
			wantErr: true,
			errMsg:  "name must be less than 100 characters",
		},
		{
			name: "missing password hash",
			user: &User{
				Email:        stringPtr("test@example.com"),
				Name:         "Test User",
				AuthProvider: "email",
			},
			wantErr: true,
			errMsg:  "password hash is required for email authentication",
		},
		{
			name: "invalid rating - negative",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				Rating:       -1.0,
			},
			wantErr: true,
			errMsg:  "rating must be between 0 and 5",
		},
		{
			name: "invalid rating - too high",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				Rating:       6.0,
			},
			wantErr: true,
			errMsg:  "rating must be between 0 and 5",
		},
		{
			name: "negative total tasks completed",
			user: &User{
				Email:               stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:                "Test User",
				TotalTasksCompleted: -1,
			},
			wantErr: true,
			errMsg:  "total tasks completed cannot be negative",
		},
		{
			name: "negative total tasks posted",
			user: &User{
				Email:            stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:             "Test User",
				TotalTasksPosted: -1,
			},
			wantErr: true,
			errMsg:  "total tasks posted cannot be negative",
		},
		{
			name: "negative total earnings",
			user: &User{
				Email:         stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:          "Test User",
				TotalEarnings: -1,
			},
			wantErr: true,
			errMsg:  "total earnings cannot be negative",
		},
		{
			name: "tasker with bio too long",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				IsTasker:     true,
				TaskerBio:    stringPtr(string(make([]byte, 501))), // 501 characters
			},
			wantErr: true,
			errMsg:  "tasker bio must be less than 500 characters",
		},
		{
			name: "tasker with too many skills",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				IsTasker:     true,
				TaskerSkills: []string{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"}, // 11 skills
			},
			wantErr: true,
			errMsg:  "tasker skills cannot exceed 10 items",
		},
		{
			name: "valid tasker",
			user: &User{
				Email:        stringPtr("test@example.com"),
				PasswordHash: func() *string { s := "hashedpassword123"; return &s }(),
				AuthProvider: "email",
				Name:         "Test User",
				IsTasker:     true,
				TaskerBio:    stringPtr("Experienced developer"),
				TaskerSkills: []string{"Go", "Python", "JavaScript"},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error '%s', got nil", tt.errMsg)
				} else if err.Error() != tt.errMsg {
					t.Errorf("Expected error '%s', got '%s'", tt.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}
		})
	}
}

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		{
			name:  "valid email",
			email: "test@example.com",
			want:  true,
		},
		{
			name:  "valid email with subdomain",
			email: "user@mail.example.com",
			want:  true,
		},
		{
			name:  "valid email with plus",
			email: "test+tag@example.com",
			want:  true,
		},
		{
			name:  "valid email with dash",
			email: "test-user@example.com",
			want:  true,
		},
		{
			name:  "invalid - no @",
			email: "testexample.com",
			want:  false,
		},
		{
			name:  "invalid - no domain",
			email: "test@",
			want:  false,
		},
		{
			name:  "invalid - no local part",
			email: "@example.com",
			want:  false,
		},
		{
			name:  "invalid - no TLD",
			email: "test@example",
			want:  false,
		},
		{
			name:  "invalid - spaces",
			email: "test @example.com",
			want:  false,
		},
		{
			name:  "empty string",
			email: "",
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidEmail(tt.email)
			if got != tt.want {
				t.Errorf("IsValidEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}

func TestIsStrongPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{
			name:     "strong password",
			password: "Password123",
			want:     true,
		},
		{
			name:     "strong password with special chars",
			password: "Pass@word123",
			want:     true,
		},
		{
			name:     "too short",
			password: "Pass1",
			want:     false,
		},
		{
			name:     "no uppercase",
			password: "password123",
			want:     false,
		},
		{
			name:     "no lowercase",
			password: "PASSWORD123",
			want:     false,
		},
		{
			name:     "no digit",
			password: "Password",
			want:     false,
		},
		{
			name:     "exactly 8 characters - valid",
			password: "Pass1234",
			want:     true,
		},
		{
			name:     "empty string",
			password: "",
			want:     false,
		},
		{
			name:     "only special characters",
			password: "!@#$%^&*()",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsStrongPassword(tt.password)
			if got != tt.want {
				t.Errorf("IsStrongPassword(%q) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}
