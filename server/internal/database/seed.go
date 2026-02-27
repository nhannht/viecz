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

// locations returns ~35 real Vietnamese locations with coordinates.
// Distribution: ~40% HCMC, ~25% Hanoi, ~10% Da Nang, ~25% other cities.
func locations() []location {
	return []location{
		// TP.HCM — 14 locations
		{"Quận 1, TP.HCM", 10.7769, 106.7009},
		{"Quận 2, TP.HCM", 10.7869, 106.7499},
		{"Quận 3, TP.HCM", 10.7840, 106.6919},
		{"Quận 4, TP.HCM", 10.7579, 106.7039},
		{"Quận 5, TP.HCM", 10.7559, 106.6689},
		{"Quận 7, TP.HCM", 10.7350, 106.7180},
		{"Quận 10, TP.HCM", 10.7749, 106.6680},
		{"Quận Bình Thạnh, TP.HCM", 10.8109, 106.7110},
		{"Quận Phú Nhuận, TP.HCM", 10.7999, 106.6800},
		{"Quận Gò Vấp, TP.HCM", 10.8380, 106.6500},
		{"Quận Tân Bình, TP.HCM", 10.8010, 106.6490},
		{"TP. Thủ Đức, TP.HCM", 10.8500, 106.7700},
		{"Quận 12, TP.HCM", 10.8671, 106.6413},
		{"Huyện Nhà Bè, TP.HCM", 10.6940, 106.7040},

		// Hà Nội — 9 locations
		{"Hoàn Kiếm, Hà Nội", 21.0285, 105.8542},
		{"Đống Đa, Hà Nội", 21.0152, 105.8324},
		{"Cầu Giấy, Hà Nội", 21.0313, 105.7998},
		{"Thanh Xuân, Hà Nội", 20.9933, 105.8094},
		{"Hai Bà Trưng, Hà Nội", 21.0110, 105.8563},
		{"Ba Đình, Hà Nội", 21.0340, 105.8194},
		{"Nam Từ Liêm, Hà Nội", 21.0183, 105.7623},
		{"Long Biên, Hà Nội", 21.0470, 105.8886},
		{"Hoàng Mai, Hà Nội", 20.9804, 105.8593},

		// Đà Nẵng — 4 locations
		{"Hải Châu, Đà Nẵng", 16.0678, 108.2208},
		{"Thanh Khê, Đà Nẵng", 16.0748, 108.1888},
		{"Sơn Trà, Đà Nẵng", 16.1030, 108.2500},
		{"Liên Chiểu, Đà Nẵng", 16.0720, 108.1500},

		// Other cities — 8 locations
		{"TP. Huế, Thừa Thiên Huế", 16.4637, 107.5909},
		{"Ninh Kiều, Cần Thơ", 10.0452, 105.7469},
		{"Nha Trang, Khánh Hòa", 12.2388, 109.1967},
		{"TP. Đà Lạt, Lâm Đồng", 11.9404, 108.4583},
		{"TP. Biên Hòa, Đồng Nai", 10.9574, 106.8426},
		{"TP. Vũng Tàu, Bà Rịa-Vũng Tàu", 10.3460, 107.0843},
		{"TP. Thái Nguyên, Thái Nguyên", 21.5928, 105.8442},
		{"TP. Vinh, Nghệ An", 18.6796, 105.6813},
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
		// 0: Moving & Transport
		{0, "Chuyển đồ phòng trọ ở %s", "Cần người giúp chuyển đồ từ phòng trọ, khoảng 8-10 thùng carton. Có thang máy.", 150_000, 300_000},
		{0, "Chuyển nhà nhỏ tại %s", "Dọn đồ căn phòng 20m2, cần 1-2 người khỏe. Tầng 3 không thang máy.", 200_000, 400_000},
		{0, "Vận chuyển bàn ghế %s", "Cần chở 1 bàn làm việc và 2 ghế từ cửa hàng về nhà, khoảng 3km.", 100_000, 200_000},
		{0, "Chuyển đồ ký túc xá %s", "Chuyển đồ từ KTX sang phòng trọ mới, khoảng 5 thùng và 1 xe đạp.", 120_000, 250_000},

		// 1: Delivery
		{1, "Giao hàng gấp tại %s", "Giao 1 gói hàng nhỏ (dưới 5kg) trong vòng 1 tiếng. Cần có xe máy.", 30_000, 80_000},
		{1, "Ship đồ ăn %s", "Mua và giao đồ ăn từ quán đến nhà, khoảng 2km. Cần giao nhanh.", 25_000, 50_000},
		{1, "Giao tài liệu tại %s", "Giao 1 phong bì tài liệu quan trọng, cần giao tận tay và xác nhận.", 40_000, 70_000},
		{1, "Giao hàng online %s", "Giao 3 đơn hàng cho shop, mỗi đơn dưới 2kg. Khu vực nội thành.", 50_000, 120_000},

		// 2: Assembly & Installation
		{2, "Lắp kệ sách IKEA tại %s", "Lắp ráp 2 kệ sách KALLAX, có đầy đủ dụng cụ và hướng dẫn.", 120_000, 200_000},
		{2, "Lắp giường ngủ mới %s", "Lắp giường gỗ kích thước 1m6, đã có hướng dẫn. Cần mang theo cờ lê.", 150_000, 250_000},
		{2, "Lắp đặt rèm cửa %s", "Lắp 3 bộ rèm cửa sổ, cần khoan tường. Đã có rèm và phụ kiện.", 100_000, 180_000},
		{2, "Sửa khóa cửa tại %s", "Khóa cửa phòng bị kẹt, cần thợ đến kiểm tra và sửa hoặc thay mới.", 80_000, 150_000},

		// 3: Cleaning
		{3, "Dọn dẹp căn hộ tại %s", "Dọn dẹp căn hộ 2 phòng ngủ: lau sàn, dọn bếp, phòng tắm. Khoảng 3 tiếng.", 200_000, 350_000},
		{3, "Vệ sinh máy lạnh %s", "Vệ sinh 2 máy lạnh treo tường, đã lâu chưa bảo trì.", 150_000, 250_000},
		{3, "Dọn nhà sau sửa chữa %s", "Dọn dẹp bụi bẩn và rác thải xây dựng sau khi sửa nhà. Cần 2 người.", 300_000, 500_000},
		{3, "Giặt sofa vải tại %s", "Giặt 1 bộ sofa vải 3 chỗ ngồi, cần mang thiết bị giặt chuyên dụng.", 250_000, 400_000},

		// 4: Tutoring & Teaching
		{4, "Gia sư Toán lớp 12 tại %s", "Cần gia sư ôn thi đại học môn Toán, 3 buổi/tuần, mỗi buổi 2 tiếng.", 300_000, 500_000},
		{4, "Dạy tiếng Anh giao tiếp %s", "Cần người dạy tiếng Anh giao tiếp cơ bản, 2 buổi/tuần. Trình độ A2.", 200_000, 400_000},
		{4, "Gia sư Lý-Hóa cấp 3 %s", "Cần gia sư dạy kèm Lý và Hóa cho học sinh lớp 11, chuẩn bị thi cuối kỳ.", 250_000, 450_000},
		{4, "Dạy guitar cơ bản tại %s", "Muốn học guitar acoustic từ đầu, 1 buổi/tuần, mỗi buổi 1.5 tiếng.", 150_000, 300_000},

		// 5: Tech Support
		{5, "Sửa laptop bị chậm tại %s", "Laptop chạy chậm, cần cài lại Windows, diệt virus và tối ưu hệ thống.", 100_000, 200_000},
		{5, "Cài đặt máy in %s", "Cài đặt và kết nối máy in mới với laptop qua WiFi. Máy in Canon.", 50_000, 100_000},
		{5, "Sửa WiFi không vào được %s", "Router WiFi bị lỗi, đèn nhấp nháy liên tục. Cần người đến kiểm tra.", 80_000, 150_000},
		{5, "Khôi phục dữ liệu USB %s", "USB 32GB bị lỗi, không đọc được dữ liệu. Cần khôi phục file quan trọng.", 100_000, 250_000},

		// 6: Event Help
		{6, "Phụ trang trí sinh nhật %s", "Cần 1-2 người phụ trang trí và phục vụ tiệc sinh nhật 20 khách.", 200_000, 400_000},
		{6, "Hỗ trợ sự kiện CLB %s", "Cần người phụ setup bàn ghế, âm thanh và dọn dẹp sau sự kiện CLB.", 150_000, 300_000},
		{6, "MC dẫn chương trình %s", "Cần MC cho buổi giao lưu sinh viên, khoảng 50 người, thời lượng 2 tiếng.", 300_000, 600_000},
		{6, "Quay video sự kiện tại %s", "Quay và chỉnh sửa video highlight cho sự kiện từ thiện, 3 tiếng quay.", 400_000, 800_000},

		// 7: Shopping & Errands
		{7, "Mua đồ ăn chợ %s", "Mua danh sách đồ ăn từ chợ (rau, thịt, gia vị) và giao về nhà.", 50_000, 100_000},
		{7, "Xếp hàng mua vé tại %s", "Cần người xếp hàng mua 2 vé concert, dự kiến chờ 2-3 tiếng.", 100_000, 200_000},
		{7, "Đi chợ hoa Tết %s", "Mua 1 cành đào/mai và 3 chậu hoa nhỏ từ chợ hoa, giao về nhà.", 80_000, 150_000},
		{7, "Mua thuốc và đồ dùng %s", "Mua thuốc theo đơn bác sĩ và vài món đồ dùng cá nhân, giao tận nơi.", 40_000, 80_000},

		// 8: Pet Care
		{8, "Trông mèo 3 ngày tại %s", "Đi công tác 3 ngày, cần người đến cho mèo ăn và dọn khay cát mỗi ngày.", 200_000, 350_000},
		{8, "Dắt chó đi dạo %s", "Cần người dắt chó Golden đi dạo buổi sáng, 30 phút/lần, 5 ngày/tuần.", 150_000, 300_000},
		{8, "Tắm và cắt lông chó %s", "Tắm và cắt tỉa lông cho chó Poodle, cần mang dụng cụ.", 100_000, 200_000},
		{8, "Chăm cá cảnh khi đi vắng %s", "Đi du lịch 5 ngày, cần người cho cá ăn và kiểm tra bể cá mỗi ngày.", 100_000, 180_000},

		// 9: Photography
		{9, "Chụp ảnh sản phẩm tại %s", "Chụp 20 sản phẩm handmade cho shop online, cần nền trắng chuyên nghiệp.", 250_000, 500_000},
		{9, "Chụp ảnh chân dung %s", "Chụp ảnh profile cá nhân ngoài trời, khoảng 30 tấm, có chỉnh sửa.", 200_000, 400_000},
		{9, "Chụp ảnh đồ ăn %s", "Chụp ảnh menu 15 món cho quán cà phê mới mở. Cần setup ánh sáng.", 300_000, 600_000},
		{9, "Chụp ảnh kỷ yếu nhóm %s", "Chụp ảnh kỷ yếu nhóm 10 người, ngoại cảnh, khoảng 2 tiếng.", 400_000, 700_000},

		// 10: Other
		{10, "Viết CV tiếng Anh %s", "Cần người giúp viết lại CV bằng tiếng Anh, chuyên ngành IT.", 100_000, 200_000},
		{10, "Dịch tài liệu Anh-Việt %s", "Dịch 10 trang tài liệu kỹ thuật từ tiếng Anh sang tiếng Việt.", 150_000, 300_000},
		{10, "Thiết kế poster sự kiện %s", "Thiết kế 1 poster A3 cho sự kiện CLB, có sẵn nội dung và hình ảnh.", 100_000, 250_000},
		{10, "Nhập liệu Excel %s", "Nhập khoảng 500 dòng dữ liệu từ ảnh chụp vào file Excel.", 80_000, 150_000},
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
