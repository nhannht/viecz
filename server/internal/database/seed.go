package database

import (
	"context"
	"log"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// SeedData seeds the database with initial data (categories and test user)
func SeedData(db *gorm.DB) error {
	ctx := context.Background()

	// Seed categories
	if err := seedCategories(ctx, db); err != nil {
		return err
	}

	// Seed test user
	if err := seedTestUser(ctx, db); err != nil {
		return err
	}

	return nil
}

// seedCategories inserts initial categories
func seedCategories(ctx context.Context, db *gorm.DB) error {
	categories := []models.Category{
		{Name: "Moving & Transport", NameVi: "Vận chuyển & Di chuyển"},
		{Name: "Delivery", NameVi: "Giao hàng"},
		{Name: "Assembly & Installation", NameVi: "Lắp ráp & Cài đặt"},
		{Name: "Cleaning", NameVi: "Dọn dẹp"},
		{Name: "Tutoring & Teaching", NameVi: "Gia sư & Giảng dạy"},
		{Name: "Tech Support", NameVi: "Hỗ trợ kỹ thuật"},
		{Name: "Event Help", NameVi: "Hỗ trợ sự kiện"},
		{Name: "Shopping & Errands", NameVi: "Mua sắm & Việc vặt"},
		{Name: "Pet Care", NameVi: "Chăm sóc thú cưng"},
		{Name: "Photography", NameVi: "Chụp ảnh"},
		{Name: "Other", NameVi: "Khác"},
	}

	for _, category := range categories {
		// Check if category already exists
		var existing models.Category
		result := db.WithContext(ctx).Where("name = ?", category.Name).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			// Category doesn't exist, create it
			if err := db.WithContext(ctx).Create(&category).Error; err != nil {
				log.Printf("Failed to seed category %s: %v", category.Name, err)
				return err
			}
			log.Printf("✓ Seeded category: %s", category.Name)
		} else if result.Error != nil {
			return result.Error
		} else {
			log.Printf("✓ Category already exists: %s", category.Name)
		}
	}

	return nil
}

// seedTestUser creates test users for development
func seedTestUser(ctx context.Context, db *gorm.DB) error {
	userRepo := repository.NewUserGormRepository(db)
	authService := auth.NewAuthService(userRepo)

	testUsers := []struct {
		email    string
		password string
		name     string
	}{
		{"nhan1@gmail.com", "Password123", "nhan1"},
		{"nhan2@gmail.com", "Password123", "nhan2"},
	}

	for _, tu := range testUsers {
		existing, err := userRepo.GetByEmail(ctx, tu.email)
		if err == nil && existing != nil {
			log.Printf("✓ Test user already exists: %s (%s)", tu.name, tu.email)
			if !existing.IsTasker {
				existing.IsTasker = true
				if err := userRepo.Update(ctx, existing); err != nil {
					log.Printf("Failed to make existing test user a tasker: %v", err)
					return err
				}
				log.Printf("✓ Updated existing test user to be a tasker")
			}
			continue
		}

		user, err := authService.Register(ctx, tu.email, tu.password, tu.name)
		if err != nil {
			log.Printf("Failed to seed test user %s: %v", tu.email, err)
			return err
		}

		user.IsTasker = true
		if err := userRepo.Update(ctx, user); err != nil {
			log.Printf("Failed to make test user a tasker: %v", err)
			return err
		}

		log.Printf("✓ Seeded test user: %s (%s) [TASKER]", user.Name, user.Email)
		log.Printf("  Login credentials: email=%s, password=%s", tu.email, tu.password)
	}

	return nil
}
