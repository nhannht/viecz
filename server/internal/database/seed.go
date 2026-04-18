package database

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

// SeedData seeds the database with initial data (categories, users, wallets, and tasks).
func SeedData(db *gorm.DB) error {
	ctx := context.Background()

	if err := seedCategories(ctx, db); err != nil {
		return err
	}
	if err := seedUsers(ctx, db); err != nil {
		return err
	}
	if err := seedWallets(ctx, db); err != nil {
		return err
	}
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
		var existing models.Category
		result := db.WithContext(ctx).Where("name = ?", category.Name).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
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

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

type seedUser struct {
	phone      string
	name       string
	bio        *string
	university string
}

// phoneUsers returns the 20 seed users: 3 known Firebase test phones + 17 background.
func phoneUsers() []seedUser {
	return []seedUser{
		// Known test accounts (configured in Firebase test phone list)
		{"+84371234561", "Nguyễn Văn Tester", strPtr("Sinh viên năm 3 ĐHQG-HCM, chuyên nhận việc vặt quanh khu Thủ Đức. Có xe máy, nhiệt tình và đúng giờ."), "ĐHQG-HCM"},
		{"+84371234562", "User", nil, "ĐHQG-HCM"},
		{"+84371234563", "User", nil, "ĐHQG-HCM"},

		// Background users — diverse names, universities, regions
		{"+84371234564", "Trần Minh Đức", strPtr("Sinh viên Bách Khoa năm 4, nhận sửa máy tính và cài đặt phần mềm. Có kinh nghiệm 2 năm làm freelance IT."), "ĐH Bách Khoa TP.HCM"},
		{"+84371234565", "Lê Thị Ngọc Anh", strPtr("Mình là sinh viên Sư phạm, nhận dạy kèm Toán-Lý-Hóa cho học sinh cấp 2 và cấp 3. Kiên nhẫn, tận tâm."), "ĐH Sư phạm TP.HCM"},
		{"+84371234566", "Phạm Quốc Bảo", strPtr("Sinh viên Kinh tế, có xe máy, nhận giao hàng và chạy việc vặt quanh nội thành TP.HCM."), "ĐH Kinh tế TP.HCM"},
		{"+84371234567", "Võ Thị Kim Chi", strPtr("Chuyên nhận dọn dẹp nhà cửa, vệ sinh căn hộ. Cẩn thận, sạch sẽ. Khu vực Quận 7 và Nhà Bè."), "ĐH Tôn Đức Thắng"},
		{"+84371234568", "Hoàng Anh Tuấn", strPtr("Sinh viên CNTT, nhận thiết kế đồ họa, chỉnh sửa ảnh và video ngắn cho shop online."), "ĐHQG-HCM"},
		{"+84371234569", "Ngô Thị Bích Ngọc", strPtr("Mình nhận chăm sóc thú cưng (chó, mèo), có kinh nghiệm nuôi thú 5 năm. Khu vực Bình Thạnh, Phú Nhuận."), "ĐH Nông Lâm TP.HCM"},
		{"+84371234570", "Bùi Đức Huy", strPtr("Sinh viên năm 2, khỏe mạnh, nhận việc chuyển đồ, khuân vác, dọn nhà. Có bạn hỗ trợ khi cần."), "ĐHQG-HCM"},
		{"+84371234571", "Đặng Thị Hồng Nhung", strPtr("Chụp ảnh sản phẩm, chân dung, sự kiện nhỏ. Có máy ảnh Canon và bộ đèn studio mini."), "ĐH Kiến trúc TP.HCM"},
		{"+84371234572", "Phan Văn Thành", strPtr("Sinh viên Bách Khoa Hà Nội, nhận lắp ráp nội thất, sửa chữa điện nước đơn giản."), "ĐH Bách Khoa Hà Nội"},
		{"+84371234573", "Trần Mai Hương", strPtr("Sinh viên Ngoại thương, nhận dịch thuật Anh-Việt, viết content marketing, chạy việc vặt khu Cầu Giấy."), "ĐH Ngoại thương Hà Nội"},
		{"+84371234574", "Lê Hoàng Nam", strPtr("Mình ở Đà Nẵng, nhận giao hàng và hỗ trợ sự kiện. Có xe máy, quen đường khu vực Hải Châu, Thanh Khê."), "ĐH Đà Nẵng"},
		{"+84371234575", "Nguyễn Thị Lan", strPtr("Sinh viên ĐH Huế, nhận gia sư tiếng Anh và dạy kèm cho học sinh tiểu học. IELTS 7.0."), "ĐH Huế"},
		{"+84371234576", "Phạm Tấn Phát", strPtr("Sinh viên Cần Thơ, nhận sửa xe máy, bảo trì xe đạp. Có đồ nghề đầy đủ."), "ĐH Cần Thơ"},
		{"+84371234577", "Lý Thị Thu Hà", strPtr("Mình nhận nấu ăn theo yêu cầu, chuẩn bị tiệc nhỏ, đồ ăn healthy cho gymer."), "ĐH Công nghiệp TP.HCM"},
		{"+84371234578", "Đỗ Minh Khôi", strPtr("Sinh viên FPT, nhận dựng website, fix bug, hỗ trợ IT. Biết React, Go, Python."), "ĐH FPT TP.HCM"},
		{"+84371234579", "Huỳnh Thị Mỹ Duyên", strPtr("Mình ở Nha Trang, nhận mua sắm hộ, ship đồ nội thành, và hỗ trợ chụp ảnh du lịch."), "ĐH Nha Trang"},
		{"+84371234580", "Võ Thanh Tùng", strPtr("Sinh viên năm cuối ĐH Đà Lạt, nhận hỗ trợ tổ chức event, chạy việc vặt, chuyển đồ khu vực Đà Lạt."), "ĐH Đà Lạt"},
	}
}

// seedUsers creates all phone-based seed users.
func seedUsers(ctx context.Context, db *gorm.DB) error {
	for _, pu := range phoneUsers() {
		var existing models.User
		if err := db.WithContext(ctx).Where("phone = ?", pu.phone).First(&existing).Error; err == nil {
			log.Printf("✓ User already exists: %s (%s)", existing.Name, pu.phone)
			continue
		}

		phone := pu.phone
		user := models.User{
			Phone:         &phone,
			Name:          pu.name,
			Bio:           pu.bio,
			AuthProvider:  "phone",
			PhoneVerified: true,
			University:    pu.university,
		}
		if err := db.WithContext(ctx).Create(&user).Error; err != nil {
			log.Printf("Failed to seed user %s: %v", pu.phone, err)
			return err
		}
		log.Printf("✓ Seeded user: %s (%s)", user.Name, pu.phone)
	}

	return nil
}

// seedWallets creates wallets with balance for all seed users.
func seedWallets(ctx context.Context, db *gorm.DB) error {
	for _, pu := range phoneUsers() {
		var user models.User
		if err := db.WithContext(ctx).Where("phone = ?", pu.phone).First(&user).Error; err != nil {
			continue
		}
		seedWalletForUser(ctx, db, user.ID, pu.phone)
	}
	return nil
}

// seedWalletForUser creates or tops up a wallet for the given user.
func seedWalletForUser(ctx context.Context, db *gorm.DB, userID int64, label string) {
	var wallet models.Wallet
	result := db.WithContext(ctx).Where("user_id = ?", userID).First(&wallet)
	if result.Error == gorm.ErrRecordNotFound {
		wallet = models.Wallet{
			UserID:         userID,
			Balance:        10_000_000,
			TotalDeposited: 10_000_000,
		}
		if err := db.WithContext(ctx).Create(&wallet).Error; err != nil {
			log.Printf("Failed to seed wallet for %s: %v", label, err)
			return
		}
		log.Printf("✓ Seeded wallet for %s: 10,000,000 đ", label)
	} else if result.Error == nil && wallet.Balance == 0 {
		wallet.Balance = 10_000_000
		wallet.TotalDeposited = 10_000_000
		if err := db.WithContext(ctx).Save(&wallet).Error; err != nil {
			log.Printf("Failed to top up wallet for %s: %v", label, err)
			return
		}
		log.Printf("✓ Topped up wallet for %s: 10,000,000 đ", label)
	} else {
		log.Printf("✓ Wallet already exists for %s: %d đ", label, wallet.Balance)
	}
}

// ---------------------------------------------------------------------------
// Tasks — combinatorial generation
// ---------------------------------------------------------------------------

type location struct {
	name string
	lat  float64
	lng  float64
}

// locations returns ~20 locations focused on HCMUS campus and Làng Đại học Thủ Đức.
func locations() []location {
	return []location{
		// ĐHKHTN (HCMUS) campus — Linh Trung, Thủ Đức
		{"Cổng trước ĐHKHTN, Thủ Đức", 10.8628, 106.7590},
		{"Thư viện ĐHKHTN, Thủ Đức", 10.8621, 106.7601},
		{"Nhà A ĐHKHTN, Thủ Đức", 10.8635, 106.7605},
		{"Căn tin ĐHKHTN, Thủ Đức", 10.8618, 106.7612},
		{"Sân bóng ĐHKHTN, Thủ Đức", 10.8642, 106.7618},

		// KTX Khu A & B — ĐHQG-HCM
		{"KTX Khu A ĐHQG, Thủ Đức", 10.8789, 106.8064},
		{"KTX Khu B ĐHQG, Thủ Đức", 10.8752, 106.8010},

		// Làng Đại học Thủ Đức — neighboring universities
		{"ĐH Bách Khoa, Thủ Đức", 10.8804, 106.8057},
		{"ĐH KHXH&NV, Thủ Đức", 10.8776, 106.8020},
		{"ĐH Quốc tế, Thủ Đức", 10.8787, 106.8003},
		{"ĐH Kinh tế-Luật, Thủ Đức", 10.8715, 106.7834},
		{"ĐH Công nghệ Thông tin, Thủ Đức", 10.8700, 106.8030},
		{"ĐH Nông Lâm, Thủ Đức", 10.8718, 106.7930},

		// Khu vực xung quanh — nhà trọ, quán ăn
		{"Đường Tô Vĩnh Diện, Thủ Đức", 10.8560, 106.7560},
		{"Đường Lê Văn Chí, Thủ Đức", 10.8490, 106.7660},
		{"Chợ Thủ Đức, Thủ Đức", 10.8480, 106.7530},
		{"Gigamall Thủ Đức", 10.8430, 106.7720},
		{"Phòng trọ Linh Trung, Thủ Đức", 10.8580, 106.7640},
		{"Phòng trọ Linh Chiểu, Thủ Đức", 10.8520, 106.7580},
	}
}

// taskTemplate holds a title pattern and description pattern per category.
// %s in the title is replaced with the location name.
type taskTemplate struct {
	catIndex int // index into category list
	title    string
	desc     string
	minPrice int64
	maxPrice int64
}

func taskTemplates() []taskTemplate {
	return []taskTemplate{
		// 0: Moving & Transport — student KTX scenarios
		{0, "Khiêng kệ sách lên tầng 5 KTX %s", "Kệ sách ở tầng trệt, phòng ở tầng 5. Không thang máy. Cần 1 người khỏe phụ.", 30_000, 60_000},
		{0, "Chuyển đồ từ KTX sang trọ %s", "Hết hạn KTX, cần chuyển 4 thùng carton và 1 xe đạp sang phòng trọ gần đó.", 80_000, 150_000},
		{0, "Phụ khiêng tủ quần áo %s", "Mới mua tủ nhựa lắp ghép, cần 1 bạn phụ khiêng từ xe lên phòng tầng 3.", 30_000, 50_000},
		{0, "Chở đồ từ nhà lên KTX %s", "Đầu học kỳ, cần bạn có xe máy chở 2 thùng đồ từ bến xe lên KTX.", 50_000, 100_000},

		// 1: Delivery — food & campus errands
		{1, "Mua cơm hộp mang lên thư viện %s", "Đang ôn thi không muốn mất chỗ, cần bạn mua 1 phần cơm gà từ căn tin.", 15_000, 25_000},
		{1, "Ship trà sữa từ Highlands %s", "Nhóm 4 đứa ôn bài, cần 1 bạn chạy mua 4 ly trà sữa Highlands gần cổng.", 20_000, 30_000},
		{1, "Mua bánh mì sáng %s", "Sáng mai thi sớm, cần bạn mua 2 ổ bánh mì trước 6:30 giao phòng KTX.", 10_000, 20_000},
		{1, "Giao tài liệu in cho bạn %s", "Vừa in xong 50 trang tiểu luận ở tiệm, cần bạn giao tận phòng KTX B.", 15_000, 25_000},

		// 2: Assembly & Installation
		{2, "Lắp kệ sách nhựa phòng KTX %s", "Mới mua kệ sách nhựa lắp ghép, 5 tầng. Có hướng dẫn nhưng mình vụng tay.", 30_000, 50_000},
		{2, "Lắp quạt trần phòng trọ %s", "Phòng trọ nóng quá, mua quạt trần rồi nhưng không biết lắp.", 40_000, 70_000},
		{2, "Sửa ổ khóa cửa phòng %s", "Ổ khóa phòng trọ bị kẹt, xoay không được. Cần bạn biết sửa.", 30_000, 50_000},
		{2, "Lắp giá phơi đồ ban công %s", "Mua giá phơi đồ inox, cần khoan tường lắp. Ai có máy khoan cho mượn+lắp.", 40_000, 60_000},

		// 3: Cleaning
		{3, "Dọn phòng KTX cuối kỳ %s", "Sắp trả phòng KTX, cần dọn sạch sẽ để nộp lại. Khoảng 2 tiếng.", 50_000, 80_000},
		{3, "Giặt chăn mền lớn %s", "Chăn mền KTX to quá máy giặt không vào, cần bạn phụ mang ra tiệm giặt.", 20_000, 40_000},
		{3, "Dọn dẹp phòng trọ %s", "Dọn phòng trọ 15m2 trước khi bạn mới dọn vào: lau sàn, rửa toilet.", 40_000, 70_000},
		{3, "Lau dọn sau tiệc liên hoan %s", "Tối qua tiệc cuối kỳ, phòng bừa bộn. Cần 1 bạn phụ dọn.", 30_000, 50_000},

		// 4: Tutoring & Teaching
		{4, "Kèm Giải tích 1 trước thi %s", "Thi Giải tích 1 tuần sau, cần bạn giỏi Toán kèm 2-3 buổi tối.", 50_000, 100_000},
		{4, "Hướng dẫn làm báo cáo thí nghiệm %s", "Chưa biết format báo cáo TN Vật lý, cần bạn khóa trên chỉ.", 30_000, 50_000},
		{4, "Dạy kèm lập trình C++ %s", "Mới học lập trình, bài tập pointer không hiểu. Cần bạn giải thích 1-2 tiếng.", 50_000, 80_000},
		{4, "Luyện IELTS Speaking %s", "Cần partner luyện Speaking, mình đang 5.5 muốn lên 6.5. 1 buổi/tuần.", 40_000, 70_000},

		// 5: Tech Support
		{5, "Cài lại laptop bị chậm %s", "Laptop lag quá, cần cài lại Windows và backup dữ liệu. Mình đang bận ôn thi.", 50_000, 80_000},
		{5, "Fix lỗi code bài tập lớn %s", "Bài tập lớn OOP bị lỗi segfault, deadline ngày mai. Cần bạn rành C++ giúp.", 50_000, 100_000},
		{5, "Sửa WiFi phòng trọ %s", "Router phòng trọ bị reset, không biết cài lại. Cần bạn biết mạng.", 30_000, 50_000},
		{5, "Dán kính cường lực điện thoại %s", "Mới mua miếng dán, dán bị bọt khí. Bạn nào dán giỏi giúp mình.", 10_000, 20_000},

		// 6: Event Help
		{6, "Phụ setup sự kiện CLB %s", "CLB tổ chức workshop, cần 2 bạn phụ kê bàn ghế và treo banner.", 40_000, 70_000},
		{6, "Phụ trang trí sinh nhật %s", "Tổ chức sinh nhật bạn ở phòng KTX, cần 1 bạn phụ thổi bóng, dán chữ.", 30_000, 50_000},
		{6, "Quay video TikTok cho CLB %s", "CLB cần quay 1 video ngắn giới thiệu sự kiện, ai có điện thoại quay ổn.", 50_000, 80_000},
		{6, "Phụ bán sticker ngày hội %s", "Ngày hội CLB cần 1 bạn phụ bán sticker và giữ booth 3 tiếng.", 40_000, 60_000},

		// 7: Shopping & Errands
		{7, "In tiểu luận gấp %s", "Deadline sáng mai, cần bạn in 30 trang tiểu luận và đóng bìa giúp.", 15_000, 30_000},
		{7, "Mua đồ ăn vặt từ chợ %s", "Thèm bánh tráng trộn và trái cây, ai đi ngang chợ mua giúp.", 15_000, 25_000},
		{7, "Mua pin dự phòng gấp %s", "Điện thoại sắp hết pin mà đang ở thư viện, ai có bán/cho mượn.", 10_000, 20_000},
		{7, "Nộp hồ sơ ở phòng đào tạo %s", "Bận đi làm, cần bạn nộp giúp 1 tờ đơn ở phòng đào tạo trước 16h.", 20_000, 40_000},

		// 8: Pet Care
		{8, "Trông mèo cuối tuần %s", "Về quê 2 ngày, cần bạn qua phòng trọ cho mèo ăn và dọn khay.", 50_000, 80_000},
		{8, "Dắt chó đi dạo buổi sáng %s", "Mình có tiết sáng, cần bạn dắt chó corgi đi dạo 30 phút quanh KTX.", 20_000, 40_000},
		{8, "Tắm chó nhỏ %s", "Chó Pomeranian cần tắm, mình không có chỗ rộng. Bạn nào rành giúp.", 30_000, 50_000},
		{8, "Cho cá ăn khi đi vắng %s", "Đi thực tập 1 tuần, cần bạn qua phòng cho cá ăn mỗi tối.", 30_000, 50_000},

		// 9: Photography
		{9, "Chụp ảnh thẻ xin việc %s", "Cần chụp ảnh thẻ 3x4 nền trắng gấp, ai có máy ảnh giúp.", 20_000, 40_000},
		{9, "Chụp ảnh kỷ yếu nhóm %s", "Nhóm 6 bạn muốn chụp ảnh kỷ yếu trong khuôn viên trường.", 80_000, 150_000},
		{9, "Chụp ảnh sản phẩm cho shop %s", "Bán hàng online, cần chụp 10 sản phẩm handmade nền sạch.", 50_000, 100_000},
		{9, "Quay video giới thiệu bản thân %s", "Cần quay 1 video 2 phút để nộp hồ sơ thực tập.", 40_000, 70_000},

		// 10: Other
		{10, "Viết CV xin thực tập %s", "Cần bạn giỏi tiếng Anh giúp viết lại CV cho đẹp, chuyên ngành CNTT.", 30_000, 60_000},
		{10, "Thiết kế poster CLB %s", "CLB cần 1 poster A4 cho sự kiện tuần sau, có sẵn nội dung.", 40_000, 80_000},
		{10, "Giúp điền form đăng ký học bổng %s", "Form học bổng dài 5 trang, nhiều câu hỏi tiếng Anh. Cần bạn giúp dịch+điền.", 30_000, 50_000},
		{10, "Đổi tiền lẻ gấp %s", "Cần đổi 200k thành tiền lẻ 10k, 20k để trả phí photo. Ai có đổi giúp.", 5_000, 10_000},
	}
}

// seedTasks generates tasks combinatorially from templates × locations × users.
// Count is controlled by SEED_TASK_COUNT env var (default 200).
func seedTasks(ctx context.Context, db *gorm.DB) error {
	var count int64
	if err := db.WithContext(ctx).Model(&models.Task{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		log.Printf("✓ Tasks already exist (%d), skipping seed", count)
		return nil
	}

	// Determine how many tasks to generate
	taskCount := 200
	if v := os.Getenv("SEED_TASK_COUNT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			taskCount = n
		}
	}

	// Load all seed users from DB
	var users []models.User
	if err := db.WithContext(ctx).Where("auth_provider = ?", "phone").Find(&users).Error; err != nil || len(users) == 0 {
		log.Printf("Skipping task seed: no users found")
		return nil
	}

	// Load categories
	var categories []models.Category
	if err := db.WithContext(ctx).Find(&categories).Error; err != nil || len(categories) == 0 {
		log.Printf("Skipping task seed: no categories found")
		return nil
	}

	templates := taskTemplates()
	locs := locations()

	// Deterministic seed for reproducible data
	rng := rand.New(rand.NewSource(42))

	// Status distribution: 70% open, 15% in_progress, 10% completed, 5% cancelled
	statusDist := []models.TaskStatus{
		models.TaskStatusOpen, models.TaskStatusOpen, models.TaskStatusOpen, models.TaskStatusOpen,
		models.TaskStatusOpen, models.TaskStatusOpen, models.TaskStatusOpen, // 70%
		models.TaskStatusInProgress, models.TaskStatusInProgress, models.TaskStatusInProgress, // 15% (rounds)
		models.TaskStatusCompleted, models.TaskStatusCompleted, // 10%
		models.TaskStatusCancelled, // 5%
	}

	// Pre-build deadline base: tasks created over the past 30 days
	now := time.Now()

	tasks := make([]models.Task, 0, taskCount)
	for i := 0; i < taskCount; i++ {
		tmpl := templates[rng.Intn(len(templates))]
		loc := locs[rng.Intn(len(locs))]
		user := users[rng.Intn(len(users))]

		// Price within template range, rounded to 10,000đ
		price := tmpl.minPrice + rng.Int63n(tmpl.maxPrice-tmpl.minPrice+1)
		price = (price / 10_000) * 10_000
		if price < tmpl.minPrice {
			price = tmpl.minPrice
		}

		title := fmt.Sprintf(tmpl.title, loc.name)
		// Truncate title to 200 chars (model limit)
		if len(title) > 200 {
			title = title[:197] + "..."
		}

		status := statusDist[rng.Intn(len(statusDist))]

		// Random creation date within past 30 days
		createdAt := now.Add(-time.Duration(rng.Intn(30*24)) * time.Hour)

		// Deadline: 3-14 days after creation
		deadlineDays := 3 + rng.Intn(12)
		deadline := createdAt.Add(time.Duration(deadlineDays*24) * time.Hour)

		// Add small jitter to coordinates (±0.005 degrees ≈ ±500m)
		lat := loc.lat + (rng.Float64()-0.5)*0.01
		lng := loc.lng + (rng.Float64()-0.5)*0.01

		// For completed tasks, set CompletedAt
		var completedAt *time.Time
		var taskerID *int64
		if status == models.TaskStatusCompleted || status == models.TaskStatusInProgress {
			// Assign a different user as tasker
			for {
				candidate := users[rng.Intn(len(users))]
				if candidate.ID != user.ID {
					taskerID = &candidate.ID
					break
				}
				// If only 1 user, skip tasker assignment
				if len(users) == 1 {
					break
				}
			}
		}
		if status == models.TaskStatusCompleted {
			ct := createdAt.Add(time.Duration(1+rng.Intn(deadlineDays)) * 24 * time.Hour)
			completedAt = &ct
		}

		catID := int64(categories[tmpl.catIndex%len(categories)].ID)

		task := models.Task{
			RequesterID: user.ID,
			TaskerID:    taskerID,
			CategoryID:  catID,
			Title:       title,
			Description: tmpl.desc,
			Price:       price,
			Location:    loc.name,
			Latitude:    &lat,
			Longitude:   &lng,
			Status:      status,
			Deadline:    &deadline,
			CompletedAt: completedAt,
			CreatedAt:   createdAt,
			UpdatedAt:   createdAt,
		}
		tasks = append(tasks, task)
	}

	// Batch insert for performance
	if err := db.WithContext(ctx).CreateInBatches(tasks, 100).Error; err != nil {
		log.Printf("Failed to seed tasks: %v", err)
		return err
	}

	log.Printf("✓ Seeded %d tasks across %d locations with %d users", len(tasks), len(locs), len(users))
	return nil
}

func strPtr(s string) *string {
	return &s
}
