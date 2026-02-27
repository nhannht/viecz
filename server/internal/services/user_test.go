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
					Email: strPtr("test@example.com"),
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
					Email: strPtr("test@example.com"),
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
					Email: strPtr("test@example.com"),
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
			name:   "update only bio",
			userID: 1,
			input: &UpdateProfileInput{
				Bio: strPtr("Hello, I'm a student looking for freelance work."),
			},
			setupRepo: func(repo *mockUserRepository) {
				repo.users[1] = &models.User{
					ID:    1,
					Email: strPtr("test@example.com"),
					Name:  "Test User",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Bio == nil || *user.Bio != "Hello, I'm a student looking for freelance work." {
					t.Errorf("Expected bio to be set, got %v", user.Bio)
				}
				if user.Name != "Test User" {
					t.Errorf("Expected name unchanged, got '%s'", user.Name)
				}
			},
		},
		{
			name:   "update bio with other fields",
			userID: 1,
			input: &UpdateProfileInput{
				Name: &name,
				Bio:  strPtr("My bio text"),
			},
			setupRepo: func(repo *mockUserRepository) {
				existingPhone := "+9876543210"
				repo.users[1] = &models.User{
					ID:    1,
					Email: strPtr("test@example.com"),
					Name:  "Old Name",
					Phone: &existingPhone,
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Name != name {
					t.Errorf("Expected name '%s', got '%s'", name, user.Name)
				}
				if user.Bio == nil || *user.Bio != "My bio text" {
					t.Errorf("Expected bio 'My bio text', got %v", user.Bio)
				}
				if user.Phone == nil || *user.Phone != "+9876543210" {
					t.Errorf("Expected phone unchanged, got %v", user.Phone)
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
					Email: strPtr("test@example.com"),
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

			service := NewUserService(repo, nil)
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
					ID:    1,
					Email: strPtr("test@example.com"),
					Name:  "Test User",
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.ID != 1 {
					t.Errorf("Expected ID 1, got %d", user.ID)
				}
				if user.Email == nil || *user.Email != "test@example.com" {
					t.Errorf("Expected email 'test@example.com', got '%v'", user.Email)
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

			service := NewUserService(repo, nil)
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

// --- Tests for populateTaskStats coverage (GetProfile with taskRepo) ---

func TestUserService_GetProfile_WithTaskStats(t *testing.T) {
	userRepo := newMockUserRepository()
	taskRepo := newMockTaskRepository()

	// Seed user
	userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@example.com"), Name: "Test User"}

	// Seed tasks for the user (some open, some completed)
	taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Status: models.TaskStatusOpen}
	taskRepo.tasks[2] = &models.Task{ID: 2, RequesterID: 1, Status: models.TaskStatusCompleted}

	service := NewUserService(userRepo, taskRepo)
	user, err := service.GetProfile(context.Background(), int64(1))
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// populateTaskStats should have been called.
	// The mock's CountByFilters returns len(tasks) for any filter, so both
	// TotalTasksPosted and TotalTasksCompleted will equal 2.
	// The important thing is that the code path is exercised.
	if user.TotalTasksPosted == 0 && user.TotalTasksCompleted == 0 {
		t.Error("Expected task stats to be populated when taskRepo is provided")
	}
	// Verify the mock returned len(tasks)==2 for both calls
	if user.TotalTasksPosted != 2 {
		t.Errorf("Expected TotalTasksPosted=2 (mock returns len(tasks)), got %d", user.TotalTasksPosted)
	}
	if user.TotalTasksCompleted != 2 {
		t.Errorf("Expected TotalTasksCompleted=2 (mock returns len(tasks)), got %d", user.TotalTasksCompleted)
	}
}

func TestUserService_GetProfile_WithTaskStats_NoTasks(t *testing.T) {
	userRepo := newMockUserRepository()
	taskRepo := newMockTaskRepository()

	// Seed user but no tasks
	userRepo.users[1] = &models.User{ID: 1, Email: strPtr("stats@example.com"), Name: "No Tasks User"}

	service := NewUserService(userRepo, taskRepo)
	user, err := service.GetProfile(context.Background(), int64(1))
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// With zero tasks in the mock, CountByFilters returns 0
	if user.TotalTasksPosted != 0 {
		t.Errorf("Expected TotalTasksPosted=0 for user with no tasks, got %d", user.TotalTasksPosted)
	}
	if user.TotalTasksCompleted != 0 {
		t.Errorf("Expected TotalTasksCompleted=0 for user with no tasks, got %d", user.TotalTasksCompleted)
	}
}

func TestUserService_GetProfile_WithTaskStats_UserNotFound(t *testing.T) {
	userRepo := newMockUserRepository()
	taskRepo := newMockTaskRepository()

	// No user seeded
	service := NewUserService(userRepo, taskRepo)
	_, err := service.GetProfile(context.Background(), int64(999))
	if err == nil {
		t.Fatal("Expected error for non-existent user, got nil")
	}
}
