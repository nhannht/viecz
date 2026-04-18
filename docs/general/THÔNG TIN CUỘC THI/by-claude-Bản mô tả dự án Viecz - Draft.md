# BẢN MÔ TẢ DỰ ÁN

## Cuộc thi Sáng tạo – Khởi nghiệp HCMUS I&E 2025

---

## 1. Tên dự án

**Viecz — Nền tảng kết nối việc vặt dựa trên vị trí cho sinh viên**

---

## 2. Lĩnh vực

Công nghệ thông tin — AI — Chuyển đổi số

---

## 3. Vấn đề — nhu cầu mà dự án hướng tới

### 3.1. Bối cảnh và quy mô vấn đề

Việt Nam hiện có hơn 2,15 triệu sinh viên đại học, phân bổ tại 243 trường trên cả nước [1][4]. Con số này dự kiến vượt 3 triệu vào năm 2030, với mục tiêu tỷ lệ nhập học đạt 33% độ tuổi 18–22 [7]. Riêng TP. Hồ Chí Minh tập trung khoảng 500.000 sinh viên — mật độ cao nhất cả nước.

Phần lớn sinh viên Việt Nam có nhu cầu kiếm thêm thu nhập. Theo số liệu của Tổng cục Thống kê (GSO), khoảng 22,1% sinh viên đại học và cao đẳng tham gia làm thêm [3], với mức lương phổ biến từ 20.000–60.000 VND/giờ (lương tối thiểu vùng I từ 01/01/2026 theo Nghị định 293/2025/NĐ-CP là 25.500 VND/giờ) [12]. Chi phí sinh hoạt trung bình của sinh viên tại TP.HCM khoảng 5 triệu VND/tháng (chưa tính học phí) [13] — tạo ra áp lực tài chính đáng kể. Các cơ hội làm thêm truyền thống — quán cà phê, gia sư, giao hàng — đều đòi hỏi cam kết thời gian dài hoặc phương tiện cá nhân, khó kết hợp linh hoạt với lịch học.

Trong khi đó, xung quanh sinh viên luôn tồn tại một lượng lớn **nhu cầu vi mô chưa được phục vụ**: những việc chỉ mất 15 phút đến vài giờ, không cần bằng cấp, chỉ cần sự sẵn lòng và sự gần gũi về mặt địa lý. Hai ví dụ cụ thể:

- Một sinh viên cần giúp khiêng đồ từ xe lên ký túc xá — việc 30 phút, sẵn lòng trả 50.000 VND, nhưng không có cách nào tìm người ngay lúc đó.
- Một sinh viên cần luyện nói tiếng Anh trước kỳ thi — không cần gia sư chuyên nghiệp (200.000 VND/giờ), chỉ cần một bạn cùng trường nói chuyện 30 phút với phí tượng trưng.

Những nhu cầu này không phải cá biệt — chúng lặp lại hàng ngày trong đời sống sinh viên, nhưng hiện tại chưa có công cụ nào giải quyết chúng một cách có hệ thống.

### 3.2. Phân tích khoảng trống thị trường

Hiện tại, sinh viên Việt Nam chỉ có ba cách xử lý khi cần người giúp việc nhỏ, và cả ba đều có hạn chế cơ bản:

| Cách hiện tại | Ưu điểm | Hạn chế |
|---|---|---|
| Nhóm Zalo/Facebook | Miễn phí, phổ biến (Zalo có 78,3 triệu người dùng [2]) | Không có cơ chế thanh toán, không đánh giá uy tín, tin nhắn bị trôi trong dòng chat, không thể lọc theo vị trí |
| Nhờ bạn bè trực tiếp | Nhanh, tin tưởng | Phạm vi hẹp, phụ thuộc quan hệ cá nhân, tạo áp lực xã hội ("ngại nhờ") |
| Thuê dịch vụ bên ngoài | Chuyên nghiệp | Chi phí gấp 2–3 lần so với giá sinh viên, không linh hoạt về thời gian |

Các nền tảng gig economy toàn cầu cũng không phục vụ được phân khúc này:

- **Grab/Gojek**: Yêu cầu phương tiện, chỉ phục vụ vận chuyển và giao đồ ăn — không hỗ trợ micro-task đa dạng.
- **Fiverr/Upwork**: Chỉ dịch vụ online, thanh toán USD, không có yếu tố vị trí địa lý.
- **TaskRabbit** (Mỹ): Mô hình gần nhất, nhưng không hoạt động tại Việt Nam, yêu cầu thẻ tín dụng quốc tế, phí giao dịch lên đến 22,5% [9][10].

Nghiên cứu của Tian và cộng sự (IEEE, 2022) về ứng dụng AoAoRun tại Đại học Bách khoa Macau đã chỉ ra rằng mô hình errand service trong khuôn viên đại học là khả thi và có nhu cầu thực [11]. Gần đây hơn, nền tảng Connect Sphere (Mỹ, 2025) đã được công bố trong nghiên cứu học thuật như một giải pháp peer-to-peer hyperlocal cho sinh viên đại học [14]. Tại Đông Nam Á, GoGetter (Malaysia) là nền tảng gig nhắm vào sinh viên đáng chú ý nhất — đoạt giải Best Recruitment Portal 2024 [15]. Tuy nhiên, **chưa có nền tảng nào tại Việt Nam, Indonesia, Thái Lan, hay Philippines** phục vụ nhu cầu micro-task trong khuôn viên đại học.

**Khoảng trống thị trường rõ ràng**: chưa có nền tảng nào tại Việt Nam kết hợp được ba yếu tố — (1) kết nối theo vị trí thời gian thực, (2) thanh toán escrow bằng phương thức nội địa, và (3) trải nghiệm tối ưu cho điện thoại — để phục vụ nhu cầu micro-task trong cộng đồng sinh viên. Đây là cơ hội first-mover thực sự trong khu vực.

---

## 4. Giải pháp — sản phẩm — công nghệ

### 4.1. Mô hình giải pháp

Viecz là nền tảng hai chiều (two-sided marketplace) kết nối sinh viên cần giúp đỡ với sinh viên sẵn sàng nhận việc, dựa trên vị trí địa lý thời gian thực. Đặc điểm quan trọng của mô hình: mỗi người dùng đồng thời là cả "cung" lẫn "cầu" — hôm nay đăng việc, ngày mai nhận việc — nên mạng lưới phát triển nhanh hơn so với marketplace một chiều.

Nền tảng hỗ trợ cả việc có trả công và không trả công, phục vụ phổ rộng nhu cầu từ giúp đỡ thuần túy đến dịch vụ micro-freelance.

### 4.2. Luồng hoạt động chính

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Đăng việc   │───▶│  Hiển thị    │───▶│  Ứng tuyển   │───▶│  Thanh toán  │
│  (30 giây)   │    │  trên bản đồ │    │  + Chat      │    │  escrow      │
│              │    │  theo vị trí │    │  trực tiếp   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
 Mô tả, vị trí,     Sinh viên gần      Xem hồ sơ,          Tiền giữ hộ
 thời gian, giá      đây thấy ngay      chốt chi tiết       đến khi xong
```

1. **Đăng việc**: Người dùng mô tả công việc, chọn vị trí trên bản đồ, đặt mức trả công (hoặc không). Thời gian trung bình: dưới 30 giây.

2. **Khám phá theo vị trí**: Công việc hiển thị trên bản đồ thời gian thực. Sinh viên xung quanh thấy ngay việc gần mình — không cần lướt feed hay chờ admin duyệt. Đây là điểm khác biệt cốt lõi so với mô hình danh sách (Zalo, Facebook).

3. **Ứng tuyển và kết nối**: Người quan tâm gửi đơn ứng tuyển, người đăng xem hồ sơ và chọn. Hai bên trao đổi chi tiết qua hệ thống chat real-time tích hợp (WebSocket).

4. **Thanh toán escrow**: Với giao dịch có trả công, tiền được nền tảng giữ hộ cho đến khi người đăng xác nhận hoàn thành. Cơ chế này loại bỏ rủi ro cho cả hai bên — người thuê không mất tiền nếu việc không xong, người nhận không bị quỵt công.

### 4.3. Danh mục dịch vụ

| Nhóm | Ví dụ cụ thể | Khoảng giá tham khảo |
|---|---|---|
| Việc vặt | In ấn, giao đồ, mua hộ, giữ chỗ thư viện | 5.000–30.000 VND |
| Học thuật | Luyện speaking, thiết kế slide, review CV, dịch tài liệu | 30.000–200.000 VND |
| Kỹ năng | Chụp ảnh, edit video, thiết kế đồ họa, hỗ trợ IT | 50.000–500.000 VND |
| Đời sống | Dọn phòng KTX, giao đồ ăn đêm, sửa xe đạp | 20.000–100.000 VND |

Mức giá hoàn toàn do người đăng quyết định — nền tảng chỉ cung cấp khoảng tham khảo để hỗ trợ thỏa thuận.

### 4.4. Kiến trúc kỹ thuật

Toàn bộ hệ thống được xây dựng bằng công nghệ mã nguồn mở, giúp tiết kiệm chi phí bản quyền và tận dụng cộng đồng hỗ trợ rộng lớn — yếu tố then chốt cho một dự án sinh viên tự chủ tài chính.

```
┌─────────────────────────────────────────────────┐
│                   Cloudflare                     │
│            (CDN, DDoS protection)                │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Angular 21    │    │   Android App   │
│   (SSR, Web)    │    │   (Kotlin,      │
│                 │    │   Jetpack       │
│                 │    │   Compose)      │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌─────────────────┐
         │   Go API (Gin)  │◄──── WebSocket (chat)
         │   REST + WS     │
         └──┬──────┬───┬───┘
            │      │   │
            ▼      ▼   ▼
     ┌──────┐ ┌────┐ ┌──────┐
     │Postgr│ │Meil│ │PayOS │
     │eSQL  │ │i-  │ │(thanh│
     │      │ │search│ │toán) │
     └──────┘ └────┘ └──────┘
```

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Backend API | Go (Gin framework) | Xử lý logic nghiệp vụ, API RESTful. Go có hiệu năng cao — một server đơn phục vụ hàng nghìn kết nối đồng thời, giảm chi phí hạ tầng. |
| Cơ sở dữ liệu | PostgreSQL | Lưu trữ dữ liệu giao dịch, người dùng, tin nhắn với tính nhất quán cao (ACID). |
| Tìm kiếm | Meilisearch | Full-text search với khả năng chịu lỗi chính tả (typo tolerance) — quan trọng khi sinh viên tìm việc nhanh trên điện thoại. |
| Web frontend | Angular 21 (SSR) | Server-Side Rendering giúp tải trang nhanh và hỗ trợ SEO. Responsive cho cả desktop và mobile. |
| Android | Kotlin + Jetpack Compose | Ứng dụng native theo chuẩn Material Design 3, tối ưu cho thiết bị Android (chiếm 65,7% thị phần tại Việt Nam [6]). |
| Thanh toán | PayOS | Cổng thanh toán Việt Nam, hỗ trợ chuyển khoản ngân hàng nội địa — sinh viên không cần thẻ quốc tế. |
| Chat real-time | WebSocket | Tin nhắn tức thì giữa hai bên, không cần refresh trang. |
| Bản đồ | MapLibre + MapTiler | Bản đồ thời gian thực, miễn phí cho dự án quy mô nhỏ. |

Hệ thống giám sát và vận hành:
- **GlitchTip**: Theo dõi lỗi tự động — phát hiện và cảnh báo sự cố trước khi ảnh hưởng người dùng.
- **Prometheus**: Thu thập metrics hiệu năng hệ thống (CPU, RAM, latency, số kết nối).
- **Tự phục hồi**: Dịch vụ được cấu hình tự khởi động lại khi gặp sự cố (systemd), giảm thời gian gián đoạn.
- **Kiểm thử tự động**: Test coverage trên 70%, đảm bảo chất lượng khi cập nhật tính năng mới.

### 4.5. Tính sáng tạo và đổi mới

Viecz không phát minh lại từng thành phần riêng lẻ — bản đồ, escrow, marketplace đều đã tồn tại. **Điểm sáng tạo nằm ở sự kết hợp có chủ đích** của các yếu tố này vào một giải pháp thống nhất, nhắm vào phân khúc mà chưa ai phục vụ:

1. **Location-first marketplace cho micro-task**: Trong khi TaskRabbit (Mỹ) dùng danh sách theo khu vực, Viecz đặt bản đồ thời gian thực làm giao diện chính. Người dùng thấy ngay việc nào gần mình, bao xa — phù hợp với bản chất "cần gấp, cần gần" của micro-task sinh viên.

2. **Escrow nội địa cho giao dịch siêu nhỏ**: Các cổng thanh toán quốc tế không hỗ trợ giao dịch giá trị thấp (5.000–50.000 VND) một cách hiệu quả. Viecz tích hợp PayOS — cho phép escrow qua chuyển khoản ngân hàng nội địa, phù hợp với mức chi tiêu và thói quen thanh toán của sinh viên Việt Nam.

3. **Mô hình hai chiều đối xứng**: Khác với Grab (tài xế vs khách) hay Fiverr (freelancer vs client), mọi người dùng Viecz đều có thể đăng việc lẫn nhận việc. Điều này tạo ra hiệu ứng mạng lưới mạnh hơn: mỗi người dùng mới đồng thời tăng cả cung và cầu.

---

## 5. Khách hàng — thị trường mục tiêu

### 5.1. Phân khúc khách hàng

Đối tượng chính là sinh viên đại học tại TP. Hồ Chí Minh, với ba nhóm nhu cầu khác nhau:

| Nhóm | Nhu cầu chính | Hành vi trên nền tảng |
|---|---|---|
| Sinh viên năm 3–4 | Bận thực tập/đồ án, cần người giúp việc lặt vặt nhanh | Chủ yếu đăng việc (phía cầu) |
| Sinh viên năm 1–2 | Có thời gian rảnh, muốn kiếm thêm thu nhập linh hoạt | Chủ yếu nhận việc (phía cung) |
| Sinh viên có kỹ năng chuyên biệt | Thiết kế, ngoại ngữ, lập trình, chụp ảnh | Nhận việc chuyên môn cao, giá cao hơn |

Về lâu dài, nền tảng có thể mở rộng phục vụ giảng viên, cán bộ trường, và cộng đồng cư dân xung quanh khu đại học.

### 5.2. Quy mô thị trường

- **TAM (tổng thị trường)**: 2,15 triệu sinh viên đại học toàn quốc [1], dự kiến vượt 3 triệu vào 2030 [7].
- **SAM (thị trường khả dụng)**: ~500.000 sinh viên tại TP.HCM — các trường có mật độ sinh viên cao, tập trung về mặt địa lý.
- **SOM (thị trường mục tiêu ban đầu)**: Sinh viên ĐHKHTN ĐHQG-HCM và các trường lân cận trong khu vực Thủ Đức/Linh Trung.

Nhóm không ước tính doanh thu bằng cách nhân số sinh viên với một mức chi tiêu giả định. Mục tiêu cụ thể và đo lường được: pilot tại ĐHKHTN trong HK2/2026, đạt 200–500 người dùng đăng ký và ít nhất 50 giao dịch hoàn thành trong 3 tháng đầu.

### 5.3. Lợi thế cạnh tranh so sánh

| Tiêu chí | Zalo/Facebook | Grab/Gojek | TaskRabbit (Mỹ) | GoGetter (MY) | AoAoRun (Macau) | **Viecz** |
|---|---|---|---|---|---|---|
| Kết nối theo vị trí | Không | Có (chỉ vận chuyển) | Có (theo khu vực) | Không | Không | **Có (thời gian thực)** |
| Thanh toán escrow | Không | Chỉ nội bộ | Có (thẻ quốc tế) | Có | Không | **Có (ngân hàng VN)** |
| Micro-task đa dạng | Không cấu trúc | Không | Có | Có (hạn chế) | Có | **Có** |
| Nhắm sinh viên | Không chuyên | Không | Không | Một phần | Có | **Có** |
| Phí giao dịch | 0% | N/A | 22,5% | N/A | 0% | **10–15%** |
| Hoạt động tại VN | Có | Có | Không | Không | Không | **Có** |
| Mô hình hai chiều | N/A | Không | Không | Không | Có | **Có** |

---

## 6. Thuyết minh tính khả thi

### 6.1. Tính khả thi kỹ thuật

**Viecz không phải ý tưởng trên giấy.** Sản phẩm đang vận hành thực tế tại địa chỉ https://viecz.fishcmus.io.vn. Toàn bộ tính năng đã mô tả ở Mục 4 đều hoạt động: đăng việc, ứng tuyển, thanh toán escrow, chat real-time, tìm kiếm full-text, bản đồ thời gian thực. Ứng dụng Android đang trong giai đoạn thử nghiệm nội bộ.

Trạng thái kỹ thuật hiện tại:

| Chỉ số | Giá trị |
|---|---|
| Trạng thái sản phẩm | Sản phẩm thử nghiệm (deployed, hoạt động 24/7) |
| Test coverage | >70% |
| Số tính năng cốt lõi hoàn thành | 7/7 (đăng việc, ứng tuyển, thanh toán, chat, tìm kiếm, bản đồ, hồ sơ người dùng) |
| Thời gian phát triển | ~5 tháng (10/2025 – 02/2026) |
| Nền tảng hỗ trợ | Web (responsive) + Android (beta) |

Việc sản phẩm đã chạy thật là bằng chứng trực tiếp nhất cho tính khả thi kỹ thuật — không cần giả định hay mô phỏng.

### 6.2. Tính khả thi kinh tế

**Mô hình doanh thu:**

Nguồn thu chính là phí hoa hồng từ mỗi giao dịch có trả công — dự kiến **10–15%** giá trị việc. Ví dụ cụ thể: một việc 50.000 VND, nền tảng giữ lại 7.500 VND, người nhận việc được 42.500 VND. Mức phí này thấp hơn đáng kể so với TaskRabbit (22,5% bao gồm trust fee) [9] — phù hợp hơn với khả năng chi trả của sinh viên.

Hiện tại, Viecz chưa thu phí — giai đoạn pilot ưu tiên thu hút người dùng và thu thập phản hồi. Mô hình doanh thu sẽ kích hoạt khi đạt lượng giao dịch ổn định.

**Nguồn thu bổ sung tiềm năng** (giai đoạn mở rộng):
- Đẩy bài ưu tiên (promoted listings) cho việc cần người gấp
- Gói nâng cấp hồ sơ cho sinh viên muốn nổi bật khi ứng tuyển

**Chi phí vận hành:**

| Hạng mục | Chi phí/tháng |
|---|---|
| VPS (server duy nhất) | ~150.000 VND |
| Domain + DNS | ~15.000 VND |
| Cloudflare CDN + bảo mật | Miễn phí |
| PayOS (thanh toán) | Miễn phí giai đoạn đầu |
| MapTiler (bản đồ) | Miễn phí (tier miễn phí) |
| **Tổng** | **~200.000 VND/tháng** |

Dự kiến năm đầu tiên, bao gồm hạ tầng, domain, và chi phí marketing tại trường (poster, sự kiện): khoảng **10 triệu VND**. Con số này hoàn toàn nằm trong khả năng tự chủ của đội ngũ sinh viên — không cần vốn đầu tư bên ngoài để bắt đầu.

**Điểm hòa vốn sơ bộ**: Với phí 10% trên giao dịch trung bình 50.000 VND (hoa hồng 5.000 VND/giao dịch), cần khoảng 40 giao dịch/tháng để bù chi phí vận hành — một con số khiêm tốn và khả thi khi đã có vài trăm người dùng thường xuyên.

### 6.3. Nhân lực

| Thành viên | Vai trò | Năng lực chính |
|---|---|---|
| **Nguyễn Hữu Thiện Nhân** | Trưởng nhóm — Kiến trúc sư phần mềm | Thiết kế và phát triển toàn bộ hệ thống (backend, frontend, mobile, hạ tầng). Quản lý kỹ thuật và vận hành sản phẩm. |
| **Trương Hoài Đức** | Nghiên cứu thị trường — Phát triển kinh doanh | Khảo sát nhu cầu sinh viên, xây dựng chiến lược tiếp cận người dùng, liên kết với Đoàn trường và các CLB. |
| **Thái Kha Bảo** | Thiết kế UX/UI — Nhận diện thương hiệu | Thiết kế giao diện, trải nghiệm người dùng, và hệ thống nhận diện thương hiệu Viecz. |
| **Trần Gia Sang** | Kiểm thử — Đảm bảo chất lượng | Kiểm thử tính năng, thu thập phản hồi người dùng, đảm bảo chất lượng sản phẩm trước và sau ra mắt. |

Cấu trúc đội ngũ theo đúng mô hình startup gọn: kỹ thuật + kinh doanh + thiết kế + chất lượng. Với chi phí vận hành thấp và sản phẩm đã hoạt động, quy mô đội ngũ 4 người là phù hợp cho giai đoạn pilot.

### 6.4. Lộ trình

| Giai đoạn | Thời gian | Nội dung | Trạng thái |
|---|---|---|---|
| **MVP** | 10/2025 – 02/2026 | Xây dựng toàn bộ tính năng cốt lõi: đăng việc, ứng tuyển, thanh toán escrow, chat, tìm kiếm, bản đồ | ✅ Hoàn thành |
| **Pilot tại ĐHKHTN** | HK2/2026 (03–06/2026) | Cho sinh viên thật sử dụng, thu thập phản hồi, đo lường KPI, cải thiện sản phẩm | 🔄 Đang chuẩn bị |
| **Đánh giá và điều chỉnh** | 07–08/2026 | Phân tích dữ liệu pilot, điều chỉnh sản phẩm và mô hình doanh thu | Kế hoạch |
| **Mở rộng** | HK1/2027 (nếu pilot thành công) | Triển khai sang các trường lân cận tại TP.HCM | Kế hoạch |

Lộ trình được giữ ngắn và cụ thể. Nếu pilot không đạt mục tiêu, nhóm sẽ ưu tiên điều chỉnh sản phẩm dựa trên dữ liệu thực thay vì mở rộng bằng mọi giá.

### 6.5. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
|---|---|---|
| Không đủ người dùng ban đầu (cold start) | Cao | Triển khai theo từng trường (bắt đầu ĐHKHTN), kết hợp với Đoàn trường và CLB. Hỗ trợ việc miễn phí để giảm rào cản tham gia. |
| Phân loại lao động (Bộ luật Lao động 2019, Điều 3) | Trung bình | Tasker trên Viecz tự quyết định nhận việc, tự đặt giá, không chịu sự quản lý/giám sát của nền tảng — thuộc diện "người làm việc không có quan hệ lao động", không phải người lao động theo định nghĩa luật [16]. |
| Giấy phép trung gian thanh toán (Thông tư 40/2024/TT-NHNN) | Trung bình | Viecz không trực tiếp giữ tiền — thanh toán escrow được xử lý qua PayOS (đơn vị đã có giấy phép trung gian thanh toán từ NHNN). Viecz là bên sử dụng dịch vụ, không phải bên cung cấp dịch vụ thanh toán [17]. |
| Bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) | Trung bình | Viecz thu thập dữ liệu vị trí — cần biểu mẫu đồng ý riêng, rõ ràng (không gộp vào Điều khoản sử dụng). Đã lên kế hoạch triển khai consent management trước khi pilot [18]. |
| Nghĩa vụ khấu trừ thuế (Nghị định 117/2025/NĐ-CP) | Thấp | Từ 2026, chỉ khấu trừ thuế với người bán có doanh thu ≥200 triệu VND/năm. Gần như toàn bộ tasker sinh viên sẽ dưới ngưỡng này — không phát sinh nghĩa vụ khấu trừ [19]. |
| Cạnh tranh từ nền tảng lớn | Thấp | Phân khúc micro-task sinh viên quá nhỏ để Grab/Gojek quan tâm. Viecz xây dựng lợi thế mạng lưới cục bộ (theo trường) — khó sao chép bằng quy mô. |
| Lạm dụng nền tảng (spam, lừa đảo) | Trung bình | Hệ thống escrow bảo vệ tài chính. Đánh giá uy tín sau giao dịch. Báo cáo vi phạm. Giai đoạn pilot kiểm duyệt thủ công. |

---

## 7. Ước tính tác động và lợi ích

### 7.1. Tác động kinh tế

- **Phía người nhận việc**: Sinh viên có thêm nguồn thu nhập linh hoạt, không yêu cầu cam kết dài hạn hay phương tiện cá nhân. Với 2–3 việc nhỏ mỗi tuần (trung bình 50.000 VND/việc), sinh viên có thể kiếm thêm 400.000–600.000 VND/tháng — không thay thế việc làm chính, nhưng đáng kể so với mức chi tiêu hàng ngày.

- **Phía người đăng việc**: Giảm chi phí so với dịch vụ thương mại. Ví dụ: thiết kế poster tại tiệm thường tốn 200.000–500.000 VND, trong khi sinh viên thiết kế qua Viecz chỉ 50.000–150.000 VND — và bên thiết kế vẫn được trả công xứng đáng vì không có chi phí trung gian.

- **Hiệu quả kinh tế vĩ mô**: Khai thác nguồn lực nhàn rỗi (thời gian rảnh, kỹ năng chưa dùng đến) trong cộng đồng sinh viên — tạo ra giá trị kinh tế từ tài nguyên hiện có mà không cần đầu tư thêm hạ tầng.

### 7.2. Tác động xã hội

- **Kỹ năng mềm qua thực hành**: Khi sử dụng Viecz, sinh viên tự nhiên rèn luyện giao tiếp, thương lượng, quản lý thời gian, và tinh thần trách nhiệm — những kỹ năng mà giảng đường ít dạy nhưng nhà tuyển dụng luôn đánh giá.

- **Xây dựng văn hóa tương trợ có tổ chức**: Viecz tạo ra một cơ chế giúp đỡ khác với "nhờ vả" truyền thống — không dựa trên quan hệ cá nhân hay nể nang, mà dựa trên cam kết rõ ràng và hệ thống bảo đảm. Bất kỳ sinh viên nào cũng có thể giúp và được giúp, bất kể khoa, khóa, hay mối quan hệ.

- **Kết nối liên ngành**: Nền tảng tạo cơ hội để sinh viên các khoa khác nhau tương tác — sinh viên CNTT hỗ trợ IT cho sinh viên Văn, sinh viên Ngoại ngữ luyện speaking cho sinh viên Hóa — phá vỡ rào cản ngành học trong cùng một trường.

### 7.3. Chỉ số đo lường thành công (KPI cho giai đoạn pilot)

| Chỉ số | Mục tiêu (3 tháng đầu) |
|---|---|
| Số người dùng đăng ký | 200–500 |
| Số giao dịch hoàn thành | ≥ 50 |
| Tỷ lệ hoàn thành việc (completion rate) | ≥ 80% |
| Đánh giá trung bình sau giao dịch | ≥ 4.0/5.0 |
| Tỷ lệ người dùng quay lại (retention) | ≥ 30% trong tháng thứ 2 |

Nếu đạt các chỉ số trên, đó là cơ sở dữ liệu thực tế để quyết định mở rộng — không phải giả định.

---

## Tài liệu tham khảo

[1] Statista, "Number of university students in Vietnam from 2013 to 2021," tháng 2/2024.

[2] VietnamNet, "Zalo's number of users hits 78.3 million," tháng 8/2025.

[3] Tổng cục Thống kê (GSO), Khảo sát lao động việc làm. Tỷ lệ sinh viên làm thêm: 22,1% (2018).

[4] Global Angle, "Vietnam's Education Sector 2025," tháng 7/2025. 243 trường đại học (176 công lập, 67 tư thục).

[5] Edtech Agency, "Vietnam aiming for 100% smartphone used by the end of 2024," tháng 3/2024. Tỷ lệ sở hữu smartphone toàn quốc: >84%.

[6] StatCounter, "Market share of mobile operating systems in Vietnam 2024." Android: 65,7%; iOS: 33,7%.

[7] Sài Gòn Giải Phóng, "Mục tiêu vượt 3 triệu sinh viên đại học vào năm 2030," tháng 3/2025. Tỷ lệ nhập học mục tiêu: 33% độ tuổi 18–22.

[8] Vietnam Briefing, "Vietnam's Gig Economy for Foreign Firms," tháng 10/2023.

[9] InfoStride, "TaskRabbit Business and Revenue Model," tháng 5/2025. Phí hoa hồng: 15%; Trust & Support Fee: 7,5%.

[10] Appscrip, "TaskRabbit Business Model and Revenue," tháng 12/2024. Doanh thu 2023: $117,5 triệu.

[11] C. Tian, X. Fang, X. Yang, và Y. Wang, "A Cross-platform Errand Service Application for Campus," IEEE 13th International Conference on Software Engineering and Service Science (ICSESS), 2022.

[12] Chính phủ Việt Nam, Nghị định 293/2025/NĐ-CP. Lương tối thiểu vùng I từ 01/01/2026: 25.500 VND/giờ.

[13] Vietnam.vn, "Chi phí một năm của sinh viên tại TP.HCM là bao nhiêu," 2024. Chi phí sinh hoạt trung bình: 5 triệu VND/tháng (chưa tính học phí).

[14] IJFMR, "Connect Sphere: A Hyperlocal Peer-to-Peer Platform for University Students," 2025. Mô hình zero-commission, xác thực bằng email .edu.

[15] GoGetter Malaysia (goget.my). Best Recruitment Portal 2024, Best Gig Workforce Management Platforms 2024 (Runner Up).

[16] Bộ luật Lao động số 45/2019/QH14, Điều 3 và Điều 5. Định nghĩa "người lao động" và "người làm việc không có quan hệ lao động."

[17] Thông tư 40/2024/TT-NHNN (Ngân hàng Nhà nước). Quy định về dịch vụ trung gian thanh toán, vốn điều lệ tối thiểu 50 tỷ VND cho đơn vị cung cấp ví điện tử.

[18] Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Yêu cầu đồng ý riêng, rõ ràng cho thu thập dữ liệu vị trí. Có hiệu lực từ 01/07/2023.

[19] Nghị định 117/2025/NĐ-CP về quản lý thuế trên nền tảng thương mại điện tử. Ngưỡng khấu trừ thuế từ 2026: doanh thu ≥200 triệu VND/năm.

[20] GSO, Khảo sát mức sống hộ gia đình Việt Nam (VHLSS) 2024. Chi đầu tư giáo dục đạt 9,5 triệu VND/sinh viên/năm, tăng 36,3% so với 2022.

---

*Dự án Viecz — Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM*

*Tháng 3/2026*
