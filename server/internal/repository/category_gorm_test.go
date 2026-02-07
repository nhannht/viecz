package repository

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupCategoryTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.Category{}); err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return db, cleanup
}

func TestCategoryGormRepository_Create(t *testing.T) {
	tests := []struct {
		name     string
		category *models.Category
		wantErr  bool
	}{
		{
			name: "create category successfully",
			category: &models.Category{
				Name:     "Programming",
				NameVi:   "Lập trình",
				IsActive: true,
			},
			wantErr: false,
		},
		{
			name: "create category with icon",
			category: &models.Category{
				Name:     "Design",
				NameVi:   "Thiết kế",
				Icon:     stringPtr("design_icon"),
				IsActive: true,
			},
			wantErr: false,
		},
		{
			name: "create inactive category",
			category: &models.Category{
				Name:     "Old Category",
				NameVi:   "Danh mục cũ",
				IsActive: false,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupCategoryTestDB(t)
			defer cleanup()

			repo := NewCategoryGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.category)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.category.ID == 0 {
					t.Error("Expected category ID to be set")
				}
			}
		})
	}
}

func TestCategoryGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		categoryID  int64
		wantNil     bool
		wantErr     bool
		checkResult func(*testing.T, *models.Category)
	}{
		{
			name: "category exists",
			setup: func(db *gorm.DB) int64 {
				cat := &models.Category{
					Name:     "Programming",
					NameVi:   "Lập trình",
					IsActive: true,
				}
				db.Create(cat)
				return int64(cat.ID)
			},
			wantNil: false,
			wantErr: false,
			checkResult: func(t *testing.T, cat *models.Category) {
				if cat.Name != "Programming" {
					t.Errorf("Expected name 'Programming', got '%s'", cat.Name)
				}
				if !cat.IsActive {
					t.Error("Expected category to be active")
				}
			},
		},
		{
			name: "category not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			categoryID: 999,
			wantNil:    true,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupCategoryTestDB(t)
			defer cleanup()

			var categoryID int64
			if tt.setup != nil {
				categoryID = tt.setup(db)
			}
			if tt.categoryID != 0 {
				categoryID = tt.categoryID
			}

			repo := NewCategoryGormRepository(db)
			ctx := context.Background()

			cat, err := repo.GetByID(ctx, categoryID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}

			if tt.wantNil {
				if cat != nil {
					t.Error("Expected nil category")
				}
			} else {
				if cat == nil {
					t.Fatal("Expected category to be returned")
				}
				if tt.checkResult != nil {
					tt.checkResult(t, cat)
				}
			}
		})
	}
}

func TestCategoryGormRepository_GetAll(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB)
		wantCount   int
		wantErr     bool
		checkResult func(*testing.T, []*models.Category)
	}{
		{
			name: "get all active categories",
			setup: func(db *gorm.DB) {
				db.Create(&models.Category{Name: "Programming", NameVi: "Lập trình", IsActive: true})
				db.Create(&models.Category{Name: "Design", NameVi: "Thiết kế", IsActive: true})
				db.Create(&models.Category{Name: "Writing", NameVi: "Viết lách", IsActive: true})
			},
			wantCount: 3,
			wantErr:   false,
		},
		{
			name: "filter out inactive categories",
			setup: func(db *gorm.DB) {
				// Create active categories
				cat1 := &models.Category{Name: "Active1", NameVi: "Hoạt động 1", IsActive: true}
				cat2 := &models.Category{Name: "Inactive", NameVi: "Không hoạt động", IsActive: true}
				cat3 := &models.Category{Name: "Active2", NameVi: "Hoạt động 2", IsActive: true}
				db.Create(cat1)
				db.Create(cat2)
				db.Create(cat3)
				// Update one to be inactive (workaround for GORM default:true behavior)
				db.Model(cat2).Update("is_active", false)
			},
			wantCount: 2,
			wantErr:   false,
			checkResult: func(t *testing.T, cats []*models.Category) {
				if len(cats) != 2 {
					t.Errorf("Expected 2 active categories, but repository returned %d", len(cats))
					for i, cat := range cats {
						t.Logf("Category %d: Name=%s, IsActive=%v", i, cat.Name, cat.IsActive)
					}
				}
				for _, cat := range cats {
					if !cat.IsActive {
						t.Errorf("Expected only active categories, got inactive: %s (is_active=%v)", cat.Name, cat.IsActive)
					}
				}
			},
		},
		{
			name: "categories ordered by name ASC",
			setup: func(db *gorm.DB) {
				db.Create(&models.Category{Name: "Zebra", NameVi: "Ngựa vằn", IsActive: true})
				db.Create(&models.Category{Name: "Apple", NameVi: "Táo", IsActive: true})
				db.Create(&models.Category{Name: "Banana", NameVi: "Chuối", IsActive: true})
			},
			wantCount: 3,
			wantErr:   false,
			checkResult: func(t *testing.T, cats []*models.Category) {
				if len(cats) != 3 {
					t.Fatalf("Expected 3 categories, got %d", len(cats))
				}
				if cats[0].Name != "Apple" {
					t.Errorf("Expected first category 'Apple', got '%s'", cats[0].Name)
				}
				if cats[1].Name != "Banana" {
					t.Errorf("Expected second category 'Banana', got '%s'", cats[1].Name)
				}
				if cats[2].Name != "Zebra" {
					t.Errorf("Expected third category 'Zebra', got '%s'", cats[2].Name)
				}
			},
		},
		{
			name:      "no categories",
			setup:     func(db *gorm.DB) {},
			wantCount: 0,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupCategoryTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewCategoryGormRepository(db)
			ctx := context.Background()

			cats, err := repo.GetAll(ctx)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(cats) != tt.wantCount {
					t.Errorf("Expected %d categories, got %d", tt.wantCount, len(cats))
				}
				if tt.checkResult != nil {
					tt.checkResult(t, cats)
				}
			}
		})
	}
}

func TestCategoryGormRepository_Update(t *testing.T) {
	tests := []struct {
		name     string
		setup    func(*gorm.DB) int64
		update   func(int64) *models.Category
		wantErr  bool
		checkDB  func(*testing.T, *gorm.DB, int64)
	}{
		{
			name: "update category successfully",
			setup: func(db *gorm.DB) int64 {
				cat := &models.Category{
					Name:     "Programming",
					NameVi:   "Lập trình",
					IsActive: true,
				}
				db.Create(cat)
				return int64(cat.ID)
			},
			update: func(id int64) *models.Category {
				return &models.Category{
					ID:       int(id),
					Name:     "Software Development",
					NameVi:   "Phát triển phần mềm",
					IsActive: true,
				}
			},
			wantErr: false,
			checkDB: func(t *testing.T, db *gorm.DB, id int64) {
				var cat models.Category
				if err := db.First(&cat, id).Error; err != nil {
					t.Fatalf("Failed to fetch updated category: %v", err)
				}
				if cat.Name != "Software Development" {
					t.Errorf("Expected name 'Software Development', got '%s'", cat.Name)
				}
				if cat.NameVi != "Phát triển phần mềm" {
					t.Errorf("Expected name_vi 'Phát triển phần mềm', got '%s'", cat.NameVi)
				}
			},
		},
		{
			name: "deactivate category",
			setup: func(db *gorm.DB) int64 {
				cat := &models.Category{
					Name:     "Old Category",
					NameVi:   "Danh mục cũ",
					IsActive: true,
				}
				db.Create(cat)
				return int64(cat.ID)
			},
			update: func(id int64) *models.Category {
				return &models.Category{
					ID:       int(id),
					Name:     "Old Category",
					NameVi:   "Danh mục cũ",
					IsActive: false,
				}
			},
			wantErr: false,
			checkDB: func(t *testing.T, db *gorm.DB, id int64) {
				var cat models.Category
				if err := db.First(&cat, id).Error; err != nil {
					t.Fatalf("Failed to fetch updated category: %v", err)
				}
				if cat.IsActive {
					t.Error("Expected category to be inactive")
				}
			},
		},
		{
			name: "update creates new category if not exists (upsert behavior)",
			setup: func(db *gorm.DB) int64 {
				return 999 // Non-existent ID
			},
			update: func(id int64) *models.Category {
				return &models.Category{
					ID:       999,
					Name:     "New Category",
					NameVi:   "Danh mục mới",
					IsActive: true,
				}
			},
			wantErr: false, // GORM Save() creates if not exists
			checkDB: func(t *testing.T, db *gorm.DB, id int64) {
				var cat models.Category
				if err := db.First(&cat, id).Error; err != nil {
					t.Errorf("Expected category to be created, got error: %v", err)
				}
				if cat.Name != "New Category" {
					t.Errorf("Expected name 'New Category', got '%s'", cat.Name)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupCategoryTestDB(t)
			defer cleanup()

			var categoryID int64
			if tt.setup != nil {
				categoryID = tt.setup(db)
			}

			repo := NewCategoryGormRepository(db)
			ctx := context.Background()

			category := tt.update(categoryID)
			err := repo.Update(ctx, category)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.checkDB != nil {
					tt.checkDB(t, db, categoryID)
				}
			}
		})
	}
}

func TestCategoryGormRepository_Delete(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB) int64
		categoryID int64
		wantErr    bool
		checkDB    func(*testing.T, *gorm.DB, int64)
	}{
		{
			name: "delete category successfully",
			setup: func(db *gorm.DB) int64 {
				cat := &models.Category{
					Name:     "To Delete",
					NameVi:   "Để xóa",
					IsActive: true,
				}
				db.Create(cat)
				return int64(cat.ID)
			},
			wantErr: false,
			checkDB: func(t *testing.T, db *gorm.DB, id int64) {
				var cat models.Category
				err := db.First(&cat, id).Error
				if err == nil {
					t.Error("Expected category to be deleted (not found)")
				}
			},
		},
		{
			name: "delete non-existent category",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			categoryID: 999,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupCategoryTestDB(t)
			defer cleanup()

			var categoryID int64
			if tt.setup != nil {
				categoryID = tt.setup(db)
			}
			if tt.categoryID != 0 {
				categoryID = tt.categoryID
			}

			repo := NewCategoryGormRepository(db)
			ctx := context.Background()

			err := repo.Delete(ctx, categoryID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.checkDB != nil {
					tt.checkDB(t, db, categoryID)
				}
			}
		})
	}
}
