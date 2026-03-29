import { TableColumn } from '../shared/components/viecz-table.component';

// ── Section 3.2: Market gap comparison ──

export const MARKET_GAP_COLUMNS: TableColumn[] = [
  { key: 'method', label: 'Cách hiện tại' },
  { key: 'pros', label: 'Ưu điểm' },
  { key: 'cons', label: 'Hạn chế' },
];

export const MARKET_GAP_ROWS = [
  { method: '<strong>Nhóm Zalo/Facebook</strong>', pros: 'Miễn phí, phổ biến (Zalo có 78,3 triệu người dùng <a href="#ref-2" class="cite">[2]</a>)', cons: 'Không có cơ chế thanh toán, không đánh giá uy tín, tin nhắn bị trôi, không lọc theo vị trí' },
  { method: '<strong>Nhờ bạn bè trực tiếp</strong>', pros: 'Nhanh, tin tưởng', cons: 'Phạm vi hẹp, phụ thuộc quan hệ cá nhân, tạo áp lực xã hội ("ngại nhờ")' },
  { method: '<strong>Thuê dịch vụ bên ngoài</strong>', pros: 'Chuyên nghiệp', cons: 'Chi phí gấp 2–3 lần so với giá sinh viên, không linh hoạt về thời gian' },
];

// ── Section 4.3: Service categories ──

export const SERVICE_COLUMNS: TableColumn[] = [
  { key: 'group', label: 'Nhóm' },
  { key: 'example', label: 'Ví dụ cụ thể' },
  { key: 'price', label: 'Khoảng giá tham khảo' },
];

export const SERVICE_ROWS = [
  { group: '<strong>Việc vặt</strong>', example: 'In ấn, giao đồ, mua hộ, giữ chỗ thư viện', price: '<span class="stat">5.000–30.000 VND</span>' },
  { group: '<strong>Học thuật</strong>', example: 'Luyện speaking, thiết kế slide, review CV, dịch tài liệu', price: '<span class="stat">30.000–200.000 VND</span>' },
  { group: '<strong>Kỹ năng</strong>', example: 'Chụp ảnh, edit video, thiết kế đồ họa, hỗ trợ IT', price: '<span class="stat">50.000–500.000 VND</span>' },
  { group: '<strong>Đời sống</strong>', example: 'Dọn phòng KTX, giao đồ ăn đêm, sửa xe đạp', price: '<span class="stat">20.000–100.000 VND</span>' },
];

// ── Section 4.4: Tech stack (expanded) ──

export const TECH_COLUMNS: TableColumn[] = [
  { key: 'component', label: 'Thành phần' },
  { key: 'tech', label: 'Công nghệ' },
  { key: 'reason', label: 'Vai trò' },
];

export const TECH_ROWS = [
  { component: '<strong>Backend API</strong>', tech: 'Go (Gin)', reason: 'Xử lý logic nghiệp vụ, API RESTful. Hiệu năng cao — một server phục vụ hàng nghìn kết nối đồng thời.' },
  { component: '<strong>Cơ sở dữ liệu</strong>', tech: 'PostgreSQL', reason: 'Lưu trữ dữ liệu giao dịch, người dùng, tin nhắn với tính nhất quán cao (ACID).' },
  { component: '<strong>Tìm kiếm</strong>', tech: 'Meilisearch', reason: 'Full-text search với khả năng chịu lỗi chính tả — quan trọng khi tìm việc nhanh trên điện thoại.' },
  { component: '<strong>Web frontend</strong>', tech: 'Angular 21 (SSR)', reason: 'Server-Side Rendering giúp tải trang nhanh và hỗ trợ SEO. Responsive cho desktop và mobile.' },
  { component: '<strong>Android</strong>', tech: 'Kotlin + Jetpack Compose', reason: 'Ứng dụng native theo chuẩn Material Design 3 (Android chiếm 65,7% thị phần tại VN <a href="#ref-6" class="cite">[6]</a>).' },
  { component: '<strong>Thanh toán</strong>', tech: 'PayOS', reason: 'Cổng thanh toán Việt Nam — chuyển khoản ngân hàng nội địa, không cần thẻ quốc tế.' },
  { component: '<strong>Chat real-time</strong>', tech: 'WebSocket', reason: 'Tin nhắn tức thì giữa hai bên, không cần refresh trang.' },
  { component: '<strong>Bản đồ</strong>', tech: 'MapLibre + MapTiler', reason: 'Bản đồ thời gian thực, miễn phí cho dự án quy mô nhỏ.' },
];

// ── Section 5.1: Customer segments ──

export const CUSTOMER_SEGMENT_COLUMNS: TableColumn[] = [
  { key: 'group', label: 'Nhóm' },
  { key: 'need', label: 'Nhu cầu chính' },
  { key: 'behavior', label: 'Hành vi trên nền tảng' },
];

export const CUSTOMER_SEGMENT_ROWS = [
  { group: '<strong>SV năm 3–4</strong>', need: 'Bận thực tập/đồ án, cần người giúp nhanh', behavior: 'Chủ yếu đăng việc (phía cầu)' },
  { group: '<strong>SV năm 1–2</strong>', need: 'Có thời gian rảnh, muốn kiếm thêm thu nhập', behavior: 'Chủ yếu nhận việc (phía cung)' },
  { group: '<strong>SV có kỹ năng</strong>', need: 'Thiết kế, ngoại ngữ, lập trình, chụp ảnh', behavior: 'Nhận việc chuyên môn cao, giá cao hơn' },
];

// ── Section 5.3: Competitor comparison (7-column) ──

export const COMPETITOR_COLUMNS: TableColumn[] = [
  { key: 'criteria', label: 'Tiêu chí' },
  { key: 'zalo', label: 'Zalo/FB' },
  { key: 'grab', label: 'Grab' },
  { key: 'taskrabbit', label: 'TaskRabbit' },
  { key: 'gogetter', label: 'GoGetter' },
  { key: 'viecz', label: 'Viecz' },
];

export const COMPETITOR_ROWS = [
  { criteria: '<strong>Kết nối vị trí</strong>', zalo: 'Không', grab: 'Có (chỉ vận chuyển)', taskrabbit: 'Có (theo khu vực)', gogetter: 'Không', viecz: '<strong>Có (thời gian thực)</strong>' },
  { criteria: '<strong>Escrow</strong>', zalo: 'Không', grab: 'Chỉ nội bộ', taskrabbit: 'Có (thẻ quốc tế)', gogetter: 'Có', viecz: '<strong>Có (ngân hàng VN)</strong>' },
  { criteria: '<strong>Micro-task đa dạng</strong>', zalo: 'Không cấu trúc', grab: 'Không', taskrabbit: 'Có', gogetter: 'Có (hạn chế)', viecz: '<strong>Có</strong>' },
  { criteria: '<strong>Nhắm sinh viên</strong>', zalo: 'Không chuyên', grab: 'Không', taskrabbit: 'Không', gogetter: 'Một phần', viecz: '<strong>Có</strong>' },
  { criteria: '<strong>Phí giao dịch</strong>', zalo: '0%', grab: 'N/A', taskrabbit: '<span class="stat">22,5%</span>', gogetter: 'N/A', viecz: '<strong><span class="stat">10–15%</span></strong>' },
  { criteria: '<strong>Hoạt động tại VN</strong>', zalo: 'Có', grab: 'Có', taskrabbit: 'Không', gogetter: 'Không', viecz: '<strong>Có</strong>' },
];

// ── Section 6.1: Technical status ──

export const TECH_STATUS_COLUMNS: TableColumn[] = [
  { key: 'metric', label: 'Chỉ số' },
  { key: 'value', label: 'Giá trị' },
];

export const TECH_STATUS_ROWS = [
  { metric: '<strong>Trạng thái sản phẩm</strong>', value: 'Sản phẩm thử nghiệm (deployed, hoạt động 24/7)' },
  { metric: '<strong>Test coverage</strong>', value: '<span class="stat">>70%</span>' },
  { metric: '<strong>Tính năng cốt lõi</strong>', value: '7/7 hoàn thành' },
  { metric: '<strong>Thời gian phát triển</strong>', value: '~5 tháng (10/2025 – 02/2026)' },
  { metric: '<strong>Nền tảng hỗ trợ</strong>', value: 'Web (responsive) + Android (beta)' },
];

// ── Section 6.2: Operating costs ──

export const COST_COLUMNS: TableColumn[] = [
  { key: 'item', label: 'Hạng mục' },
  { key: 'cost', label: 'Chi phí/tháng' },
];

export const COST_ROWS = [
  { item: '<strong>VPS (server duy nhất)</strong>', cost: '~150.000 VND' },
  { item: '<strong>Domain + DNS</strong>', cost: '~15.000 VND' },
  { item: '<strong>Cloudflare CDN + bảo mật</strong>', cost: 'Miễn phí' },
  { item: '<strong>PayOS (thanh toán)</strong>', cost: 'Miễn phí giai đoạn đầu' },
  { item: '<strong>MapTiler (bản đồ)</strong>', cost: 'Miễn phí (tier miễn phí)' },
  { item: '<strong>Tổng</strong>', cost: '<span class="stat">~200.000 VND/tháng</span>' },
];

// ── Section 6.3: Team (expanded with capabilities) ──

export const TEAM_COLUMNS: TableColumn[] = [
  { key: 'member', label: 'Thành viên' },
  { key: 'role', label: 'Vai trò' },
  { key: 'capability', label: 'Năng lực chính' },
];

export const TEAM_ROWS = [
  { member: '<strong>Nguyễn Hữu Thiện Nhân</strong>', role: 'Trưởng nhóm — Kiến trúc sư phần mềm', capability: 'Thiết kế và phát triển toàn bộ hệ thống (backend, frontend, mobile, hạ tầng). Quản lý kỹ thuật và vận hành sản phẩm.' },
  { member: '<strong>Trương Hoài Đức</strong>', role: 'Kiểm thử — Đảm bảo chất lượng', capability: 'Kiểm thử tính năng, thu thập phản hồi người dùng, đảm bảo chất lượng sản phẩm.' },
  { member: '<strong>Thái Kha Bảo</strong>', role: 'Kiểm thử — Đảm bảo chất lượng', capability: 'Kiểm thử tính năng, thu thập phản hồi người dùng, đảm bảo chất lượng sản phẩm.' },
  { member: '<strong>Trần Gia Sang</strong>', role: 'Kiểm thử — Đảm bảo chất lượng', capability: 'Kiểm thử tính năng, thu thập phản hồi người dùng, đảm bảo chất lượng sản phẩm.' },
];

// ── Section 6.4: Roadmap ──

export const ROADMAP_COLUMNS: TableColumn[] = [
  { key: 'phase', label: 'Giai đoạn' },
  { key: 'time', label: 'Thời gian' },
  { key: 'content', label: 'Nội dung' },
  { key: 'status', label: 'Trạng thái' },
];

export const ROADMAP_ROWS = [
  { phase: '<strong>MVP</strong>', time: '10/2025 – 02/2026', content: 'Xây dựng toàn bộ tính năng cốt lõi: đăng việc, ứng tuyển, thanh toán escrow, chat, tìm kiếm, bản đồ', status: 'Hoàn thành' },
  { phase: '<strong>Pilot tại ĐHKHTN</strong>', time: 'HK2/2026 (03–06/2026)', content: 'Cho sinh viên thật sử dụng, thu thập phản hồi, đo lường KPI, cải thiện sản phẩm', status: 'Đang chuẩn bị' },
  { phase: '<strong>Đánh giá</strong>', time: '07–08/2026', content: 'Phân tích dữ liệu pilot, điều chỉnh sản phẩm và mô hình doanh thu', status: 'Kế hoạch' },
  { phase: '<strong>Mở rộng</strong>', time: 'HK1/2027', content: 'Triển khai sang các trường lân cận tại TP.HCM (nếu pilot thành công)', status: 'Kế hoạch' },
];

// ── Section 6.5: Risk matrix ──

export const RISK_COLUMNS: TableColumn[] = [
  { key: 'risk', label: 'Rủi ro' },
  { key: 'level', label: 'Mức độ' },
  { key: 'mitigation', label: 'Biện pháp giảm thiểu' },
];

export const RISK_ROWS = [
  { risk: '<strong>Cold start — không đủ người dùng</strong>', level: 'Cao', mitigation: 'Triển khai theo từng trường, kết hợp Đoàn trường và CLB. Hỗ trợ việc miễn phí để giảm rào cản.' },
  { risk: '<strong>Phân loại lao động (BLLĐ 2019)</strong>', level: 'Trung bình', mitigation: 'Tasker tự quyết nhận việc, tự đặt giá — thuộc diện "người làm việc không có quan hệ lao động" <a href="#ref-16" class="cite">[16]</a>.' },
  { risk: '<strong>Giấy phép trung gian thanh toán (TT 40/2024)</strong>', level: 'Trung bình', mitigation: 'Viecz không trực tiếp giữ tiền — escrow qua PayOS (đã có giấy phép từ NHNN) <a href="#ref-17" class="cite">[17]</a>.' },
  { risk: '<strong>Bảo vệ dữ liệu cá nhân (NĐ 13/2023)</strong>', level: 'Trung bình', mitigation: 'Thu thập vị trí cần đồng ý riêng, rõ ràng. Đã lên kế hoạch consent management trước pilot <a href="#ref-18" class="cite">[18]</a>.' },
  { risk: '<strong>Nghĩa vụ khấu trừ thuế (NĐ 117/2025)</strong>', level: 'Thấp', mitigation: 'Chỉ khấu trừ với doanh thu ≥200 triệu VND/năm — gần như toàn bộ SV sẽ dưới ngưỡng <a href="#ref-19" class="cite">[19]</a>.' },
  { risk: '<strong>Cạnh tranh từ nền tảng lớn</strong>', level: 'Thấp', mitigation: 'Phân khúc micro-task SV quá nhỏ để Grab/Gojek quan tâm. Viecz xây lợi thế mạng lưới cục bộ.' },
];

// ── Section 7.3: KPI targets ──

export const KPI_COLUMNS: TableColumn[] = [
  { key: 'metric', label: 'Chỉ số' },
  { key: 'target', label: 'Mục tiêu (3 tháng đầu)' },
];

export const KPI_ROWS = [
  { metric: '<strong>Số người dùng đăng ký</strong>', target: '200–500' },
  { metric: '<strong>Số giao dịch hoàn thành</strong>', target: '≥ 50' },
  { metric: '<strong>Tỷ lệ hoàn thành (completion rate)</strong>', target: '≥ 80%' },
  { metric: '<strong>Đánh giá trung bình sau giao dịch</strong>', target: '≥ 4.0/5.0' },
  { metric: '<strong>Tỷ lệ người dùng quay lại (retention)</strong>', target: '≥ 30% trong tháng thứ 2' },
];
