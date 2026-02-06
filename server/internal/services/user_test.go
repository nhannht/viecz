package services

import (
	"context"
	"testing"

	"viecz.vieczserver/internal/models"
)

func TestUserService_UpdateProfile(t *testing.T) {
	name := "Updated Name"
	avatarURL := "https://example.com/avatar.jpg"
	phone := "+1234567890"

	tests := []struct {
		name        string
		userID      int64
		input       *UpdateProfileInput
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		errContains string
		checkUser   func(*testing.T, *models.User)
	}{
		{
			name:   "update all fields",
			userID: 1,
			input: &UpdateProfileInput{
				Name:      &name,
				AvatarURL: &avatarURL,
				Phone:     &phone,
			},
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Old Name",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Name != name {
					t.Errorf("Expected name '%s', got '%s'", name, user.Name)
				}
				if user.AvatarURL == nil || *user.AvatarURL != avatarURL {
					t.Errorf("Expected avatar URL '%s', got %v", avatarURL, user.AvatarURL)
				}
				if user.Phone == nil || *user.Phone != phone {
					t.Errorf("Expected phone '%s', got %v", phone, user.Phone)
				}
			},
		},
		{
			name:   "update only name",
			userID: 1,
			input: &UpdateProfileInput{
				Name: &name,
			},
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Old Name",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Name != name {
					t.Errorf("Expected name '%s', got '%s'", name, user.Name)
				}
			},
		},
		{
			name:   "update only avatar URL",
			userID: 1,
			input: &UpdateProfileInput{
				AvatarURL: &avatarURL,
			},
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Test User",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.AvatarURL == nil || *user.AvatarURL != avatarURL {
					t.Errorf("Expected avatar URL '%s', got %v", avatarURL, user.AvatarURL)
				}
			},
		},
		{
			name:        "user not found",
			userID:      999,
			input:       &UpdateProfileInput{Name: &name},
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "user not found",
		},
		{
			name:   "empty input - no changes",
			userID: 1,
			input:  &UpdateProfileInput{},
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Test User",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Name != "Test User" {
					t.Errorf("Expected name unchanged, got '%s'", user.Name)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			service := NewUserService(repo)
			ctx := context.Background()

			user, err := service.UpdateProfile(ctx, tt.userID, tt.input)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be returned, got nil")
				}
				if tt.checkUser != nil {
					tt.checkUser(t, user)
				}
			}
		})
	}
}

func TestUserService_BecomeTasker(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:   "become tasker successfully",
			userID: 1,
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:       1,
					Email:    "test@example.com",
					Name:     "Test User",
					IsTasker: false,
				}
			},
			wantErr: false,
		},
		{
			name:   "already a tasker",
			userID: 1,
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:       1,
					Email:    "test@example.com",
					Name:     "Test User",
					IsTasker: true,
				}
			},
			wantErr:     true,
			errContains: "already a tasker",
		},
		{
			name:        "user not found",
			userID:      999,
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "user not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			service := NewUserService(repo)
			ctx := context.Background()

			user, err := service.BecomeTasker(ctx, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be returned, got nil")
				}
				if !user.IsTasker {
					t.Error("Expected user to be a tasker")
				}
			}
		})
	}
}

func TestUserService_GetProfile(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		errContains string
		checkUser   func(*testing.T, *models.User)
	}{
		{
			name:   "get profile successfully",
			userID: 1,
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:       1,
					Email:    "test@example.com",
					Name:     "Test User",
					IsTasker: false,
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.ID != 1 {
					t.Errorf("Expected ID 1, got %d", user.ID)
				}
				if user.Email != "test@example.com" {
					t.Errorf("Expected email 'test@example.com', got '%s'", user.Email)
				}
			},
		},
		{
			name:        "user not found",
			userID:      999,
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "user not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			service := NewUserService(repo)
			ctx := context.Background()

			user, err := service.GetProfile(ctx, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be returned, got nil")
				}
				if tt.checkUser != nil {
					tt.checkUser(t, user)
				}
			}
		})
	}
}
