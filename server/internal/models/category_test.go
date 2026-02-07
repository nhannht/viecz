package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestCategory_Validate(t *testing.T) {
	tests := []struct {
		name     string
		category *Category
		wantErr  bool
		errMsg   string
	}{
		{
			name: "valid category",
			category: &Category{
				Name:   "Programming",
				NameVi: "Lập trình",
			},
			wantErr: false,
		},
		{
			name: "valid category with icon",
			category: &Category{
				Name:   "Design",
				NameVi: "Thiết kế",
				Icon:   stringPtr("design_icon"),
			},
			wantErr: false,
		},
		{
			name: "missing name",
			category: &Category{
				Name:   "",
				NameVi: "Lập trình",
			},
			wantErr: true,
			errMsg:  "name is required",
		},
		{
			name: "name too long",
			category: &Category{
				Name:   string(make([]byte, 51)), // 51 characters
				NameVi: "Lập trình",
			},
			wantErr: true,
			errMsg:  "name must be less than 50 characters",
		},
		{
			name: "missing name_vi",
			category: &Category{
				Name:   "Programming",
				NameVi: "",
			},
			wantErr: true,
			errMsg:  "name_vi is required",
		},
		{
			name: "name_vi too long",
			category: &Category{
				Name:   "Programming",
				NameVi: string(make([]byte, 51)), // 51 characters
			},
			wantErr: true,
			errMsg:  "name_vi must be less than 50 characters",
		},
		{
			name: "exactly 50 characters - valid",
			category: &Category{
				Name:   string(make([]byte, 50)),
				NameVi: string(make([]byte, 50)),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.category.Validate()

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

// Test GORM hooks using actual database operations
func TestCategory_BeforeCreate(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(&Category{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name     string
		category *Category
		wantErr  bool
	}{
		{
			name: "valid category - hook passes",
			category: &Category{
				Name:   "Programming",
				NameVi: "Lập trình",
			},
			wantErr: false,
		},
		{
			name: "invalid category - hook fails (missing name)",
			category: &Category{
				Name:   "",
				NameVi: "Lập trình",
			},
			wantErr: true,
		},
		{
			name: "invalid category - hook fails (missing name_vi)",
			category: &Category{
				Name:   "Programming",
				NameVi: "",
			},
			wantErr: true,
		},
		{
			name: "invalid category - hook fails (name too long)",
			category: &Category{
				Name:   string(make([]byte, 51)),
				NameVi: "Lập trình",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.category).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.category.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}

func TestCategory_BeforeUpdate(t *testing.T) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(&Category{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	// Create a valid category first
	validCategory := &Category{
		Name:   "Programming",
		NameVi: "Lập trình",
	}
	if err := db.Create(validCategory).Error; err != nil {
		t.Fatalf("Failed to create initial category: %v", err)
	}

	tests := []struct {
		name     string
		update   func(*Category)
		wantErr  bool
	}{
		{
			name: "valid update - hook passes",
			update: func(c *Category) {
				c.Name = "Software Development"
				c.NameVi = "Phát triển phần mềm"
			},
			wantErr: false,
		},
		{
			name: "invalid update - empty name",
			update: func(c *Category) {
				c.Name = ""
			},
			wantErr: true,
		},
		{
			name: "invalid update - empty name_vi",
			update: func(c *Category) {
				c.NameVi = ""
			},
			wantErr: true,
		},
		{
			name: "invalid update - name too long",
			update: func(c *Category) {
				c.Name = string(make([]byte, 51))
			},
			wantErr: true,
		},
		{
			name: "invalid update - name_vi too long",
			update: func(c *Category) {
				c.NameVi = string(make([]byte, 51))
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a fresh copy for each test
			testCategory := &Category{
				Name:   "Test Category",
				NameVi: "Danh mục kiểm tra",
			}
			if err := db.Create(testCategory).Error; err != nil {
				t.Fatalf("Failed to create test category: %v", err)
			}

			// Apply the update
			tt.update(testCategory)

			// Try to save
			err := db.Save(testCategory).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeUpdate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeUpdate hook to pass, got error: %v", err)
				}
			}
		})
	}
}
