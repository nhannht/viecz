package database

import (
	"context"
	"log"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// SeedData seeds the database with initial data (categories, test users, and tasks)
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

	// Seed wallets with balance for test users
	if err := seedWallets(ctx, db); err != nil {
		return err
	}

	// Seed tasks
	if err := seedTasks(ctx, db); err != nil {
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
	authService := auth.NewAuthService(userRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "seed-secret")

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

// seedWallets creates wallets with balance for test users
func seedWallets(ctx context.Context, db *gorm.DB) error {
	emails := []string{"nhan1@gmail.com", "nhan2@gmail.com"}
	for _, email := range emails {
		var user models.User
		if err := db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
			continue
		}

		var wallet models.Wallet
		result := db.WithContext(ctx).Where("user_id = ?", user.ID).First(&wallet)
		if result.Error == gorm.ErrRecordNotFound {
			wallet = models.Wallet{
				UserID:         user.ID,
				Balance:        10000000, // 10,000,000 đ
				TotalDeposited: 10000000,
			}
			if err := db.WithContext(ctx).Create(&wallet).Error; err != nil {
				return err
			}
			log.Printf("✓ Seeded wallet for %s: 10,000,000 đ", email)
		} else if result.Error == nil && wallet.Balance == 0 {
			wallet.Balance = 10000000
			wallet.TotalDeposited = 10000000
			if err := db.WithContext(ctx).Save(&wallet).Error; err != nil {
				return err
			}
			log.Printf("✓ Topped up wallet for %s: 10,000,000 đ", email)
		} else {
			log.Printf("✓ Wallet already exists for %s: %d đ", email, wallet.Balance)
		}
	}
	return nil
}

// seedTasks creates 10 sample tasks for development
func seedTasks(ctx context.Context, db *gorm.DB) error {
	// Check if tasks already exist
	var count int64
	if err := db.WithContext(ctx).Model(&models.Task{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		log.Printf("✓ Tasks already exist (%d), skipping seed", count)
		return nil
	}

	// Get first test user as requester
	var user models.User
	if err := db.WithContext(ctx).Where("email = ?", "nhan1@gmail.com").First(&user).Error; err != nil {
		log.Printf("Skipping task seed: test user not found")
		return nil
	}

	// Get categories for variety
	var categories []models.Category
	if err := db.WithContext(ctx).Find(&categories).Error; err != nil || len(categories) == 0 {
		log.Printf("Skipping task seed: no categories found")
		return nil
	}

	catID := func(i int) int64 { return int64(categories[i%len(categories)].ID) }

	tasks := []models.Task{
		{RequesterID: user.ID, CategoryID: catID(0), Title: "Chuyển đồ phòng trọ", Description: "Cần người giúp chuyển đồ từ quận 5 sang quận 10, khoảng 10 thùng", Price: 200000, Location: "Quận 5, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(1), Title: "Giao hàng gấp quận 1", Description: "Giao 1 gói hàng nhỏ từ Bến Thành đến Thảo Điền, cần trong 1 tiếng", Price: 50000, Location: "Quận 1, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(2), Title: "Lắp kệ sách IKEA", Description: "Lắp ráp 2 kệ sách KALLAX, có đủ dụng cụ", Price: 150000, Location: "Quận 7, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(3), Title: "Dọn dẹp nhà trước Tết", Description: "Dọn dẹp căn hộ 2 phòng ngủ, lau sàn, dọn bếp, phòng tắm", Price: 300000, Location: "Thủ Đức, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(4), Title: "Gia sư Toán lớp 12", Description: "Cần gia sư Toán ôn thi đại học, 3 buổi/tuần, mỗi buổi 2 tiếng", Price: 500000, Location: "Quận 3, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(5), Title: "Sửa laptop bị chậm", Description: "Laptop chạy chậm, cần cài lại Windows và tối ưu", Price: 100000, Location: "Quận Bình Thạnh, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(6), Title: "Hỗ trợ sự kiện sinh nhật", Description: "Cần 2 người phụ trang trí và phục vụ tiệc sinh nhật 30 khách", Price: 400000, Location: "Quận 2, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(7), Title: "Mua đồ ăn chợ Bến Thành", Description: "Mua list đồ ăn từ chợ Bến Thành và giao về nhà", Price: 80000, Location: "Quận 1, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(8), Title: "Trông mèo 3 ngày", Description: "Đi công tác 3 ngày, cần người đến cho mèo ăn và dọn cát mỗi ngày", Price: 250000, Location: "Quận 4, TP.HCM", Status: models.TaskStatusOpen},
		{RequesterID: user.ID, CategoryID: catID(9), Title: "Chụp ảnh sản phẩm", Description: "Chụp ảnh 20 sản phẩm handmade cho shop online, cần nền trắng", Price: 350000, Location: "Quận Phú Nhuận, TP.HCM", Status: models.TaskStatusOpen},
	}

	for _, task := range tasks {
		if err := db.WithContext(ctx).Create(&task).Error; err != nil {
			log.Printf("Failed to seed task '%s': %v", task.Title, err)
			return err
		}
		log.Printf("✓ Seeded task: %s (%d đ)", task.Title, task.Price)
	}

	return nil
}
