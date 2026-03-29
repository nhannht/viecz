---
theme: default
title: "Viecz — Nền tảng kết nối việc vặt cho sinh viên"
info: |
  Cuộc thi Sáng tạo – Khởi nghiệp HCMUS I&E 2025
  Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

<div class="frost-cover">
  <div class="cover-accent"></div>
  <h1>Viecz</h1>
  <p class="cover-subtitle">Nền tảng kết nối việc vặt dựa trên vị trí cho sinh viên</p>
  <br>
  <p class="cover-info">Cuộc thi Sáng tạo – Khởi nghiệp HCMUS I&E 2025</p>
  <p class="cover-info">Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM</p>
</div>

---

# Vấn đề

<div class="grid grid-cols-2 gap-8">
<div class="glass-card">

### Thực trạng sinh viên

- **2,15 triệu** sinh viên đại học tại Việt Nam
- Chi phí sinh hoạt TP.HCM: **5 triệu VND/tháng**
- Thu nhập part-time trung bình: **1,2–1,8 triệu VND/tháng**
- Chỉ **22,1%** sinh viên tham gia làm thêm

</div>
<div class="glass-card">

### Nhu cầu vi mô chưa được phục vụ

- Khiêng đồ KTX — 30 phút, 50k
- Luyện speaking trước thi — 30 phút
- Mua hộ đồ ăn đêm
- Thiết kế slide gấp

Những việc xảy ra hàng ngày, nhưng **chưa có nền tảng nào** giải quyết.

</div>
</div>

---

# Giải pháp hiện tại — không hiệu quả

<div class="glass-card">

| Cách | Hạn chế |
|---|---|
| **Nhóm Zalo/Facebook** | Không thanh toán, không đánh giá, tin bị trôi |
| **Nhờ bạn bè** | Phạm vi hẹp, phụ thuộc quen biết |
| **Dịch vụ bên ngoài** | Giá gấp 2–3 lần |
| **Grab/Gojek** | Chỉ vận chuyển, cần phương tiện |
| **TaskRabbit** | Không có ở VN, phí 22,5% |

</div>

<br>

<p class="accent-text">Chưa có nền tảng nào tại Việt Nam hay Đông Nam Á phục vụ micro-task sinh viên.</p>

---

# Viecz — Cách hoạt động

<div class="flow-steps">
  <div class="flow-step">
    <div class="flow-number">1</div>
    <div class="flow-title">Đăng việc</div>
    <div class="flow-desc">30 giây, mô tả + vị trí + mức trả</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-number">2</div>
    <div class="flow-title">Bản đồ</div>
    <div class="flow-desc">Người gần đó thấy ngay trên bản đồ thời gian thực</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-number">3</div>
    <div class="flow-title">Nhận việc</div>
    <div class="flow-desc">Chat trực tiếp, thỏa thuận và bắt đầu</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-number">4</div>
    <div class="flow-title">Thanh toán</div>
    <div class="flow-desc">Escrow qua PayOS, tiền giữ đến khi hoàn thành</div>
  </div>
</div>

---

# Sản phẩm — đang hoạt động

<div class="grid grid-cols-2 gap-6 items-center">

<div class="glass-card">

**[https://viecz.fishcmus.io.vn](https://viecz.fishcmus.io.vn)**

| Chỉ số | Giá trị |
|---|---|
| Trạng thái | Deployed, 24/7 |
| Tính năng | 7/7 cốt lõi |
| Test coverage | >70% |
| Phát triển | ~5 tháng |
| Nền tảng | Web + Android |

</div>

<div>
<img src="/marketplace-desktop.png" class="screenshot-large" />
</div>

</div>

---

# Marketplace — bản đồ thời gian thực

<div class="screenshot-hero">
<img src="/marketplace-desktop.png" class="screenshot-full" />
</div>

<p class="caption">Giao diện chính: bản đồ hiển thị việc gần nhất, bộ lọc theo danh mục, tìm kiếm</p>

---

# Trải nghiệm mobile-first

<div class="grid grid-cols-3 gap-6 items-center">

<div class="text-center">
<img src="/marketplace-mobile.png" class="screenshot-mobile" />
<p class="caption">Marketplace</p>
</div>

<div class="text-center">
<img src="/task-detail-mobile.png" class="screenshot-mobile" />
<p class="caption">Chi tiết việc</p>
</div>

<div class="text-center">
<img src="/wallet-mobile.png" class="screenshot-mobile" />
<p class="caption">Vi / Thanh toán</p>
</div>

</div>

---

# Luồng sử dụng

<div class="grid grid-cols-4 gap-4 items-start">

<div class="glass-card mini">
<img src="/login.png" class="screenshot-card" />
<p class="caption">Đăng nhập OTP</p>
</div>

<div class="glass-card mini">
<img src="/task-create.png" class="screenshot-card" />
<p class="caption">Tạo việc</p>
</div>

<div class="glass-card mini">
<img src="/messages.png" class="screenshot-card" />
<p class="caption">Chat real-time</p>
</div>

<div class="glass-card mini">
<img src="/wallet.png" class="screenshot-card" />
<p class="caption">Thanh toán escrow</p>
</div>

</div>

---

# Khác biệt

<div class="grid grid-cols-3 gap-6">

<div class="glass-card highlight">
<h3>Bản đồ là giao diện chính</h3>
<p>Không phải danh sách. Việc gần nhất hiển thị trước. "Cần gấp, cần gần."</p>
</div>

<div class="glass-card highlight">
<h3>Escrow cho giao dịch siêu nhỏ</h3>
<p>PayOS + chuyển khoản ngân hàng VN. Giao dịch từ 5.000 VND. Không cần thẻ quốc tế.</p>
</div>

<div class="glass-card highlight">
<h3>Mô hình hai chiều</h3>
<p>Mỗi người dùng mới = tăng cả cung lẫn cầu. Hiệu ứng mạng lưới mạnh hơn mô hình một chiều.</p>
</div>

</div>

---

# Khả thi

<div class="grid grid-cols-2 gap-6">

<div class="glass-card">

### Chi phí vận hành

| Hạng mục | Chi phí/tháng |
|---|---|
| VPS | ~150.000 VND |
| Cloudflare, MapTiler | Miễn phí |
| PayOS | Miễn phí |
| **Tổng** | **~200.000 VND** |

Hoa hồng 10–15% mỗi giao dịch. Hòa vốn: ~40 giao dịch/tháng.

</div>

<div class="glass-card">

### Lộ trình

| Giai đoạn | Thời gian | Trạng thái |
|---|---|---|
| MVP bắt đầu | 10/2025 | Xong |
| 7/7 tính năng | 02/2026 | Xong |
| Pilot ĐHKHTN | 06/2026 | Tiếp theo |
| Đánh giá | 08/2026 | Kế hoạch |
| Mở rộng TP.HCM | HK1/2027 | Kế hoạch |

</div>

</div>

---

# Đội ngũ

<div class="grid grid-cols-4 gap-4">

<div class="glass-card team-lead">
<h3>Nguyễn Hữu Thiện Nhân</h3>
<p class="team-role-lead">Trưởng nhóm</p>
<p class="team-detail">Kiến trúc sư phần mềm</p>
</div>

<div class="glass-card team-member">
<h3>Trương Hoài Đức</h3>
<p class="team-role">Kiểm thử</p>
<p class="team-detail">Đảm bảo chất lượng</p>
</div>

<div class="glass-card team-member">
<h3>Thái Kha Bảo</h3>
<p class="team-role">Kiểm thử</p>
<p class="team-detail">Đảm bảo chất lượng</p>
</div>

<div class="glass-card team-member">
<h3>Trần Gia Sang</h3>
<p class="team-role">Kiểm thử</p>
<p class="team-detail">Đảm bảo chất lượng</p>
</div>

</div>

<br>

<p class="text-center opacity-60">Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM</p>

---
layout: center
class: text-center
---

<div class="frost-cover closing">
  <h1>Cảm ơn</h1>
  <br>
  <h3><a href="https://viecz.fishcmus.io.vn">https://viecz.fishcmus.io.vn</a></h3>
  <br>
  <p class="cover-info">Dự án Viecz — HCMUS I&E 2025</p>
  <p class="cover-info">Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM</p>
  <p class="cover-info">Tháng 3/2026</p>
</div>

