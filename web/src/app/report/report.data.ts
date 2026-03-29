import { TableColumn } from '../shared/components/viecz-table.component';

export const TECH_COLUMNS: TableColumn[] = [
  { key: 'component', label: 'Thành phần' },
  { key: 'tech', label: 'Công nghệ' },
  { key: 'reason', label: 'Lý do chọn' },
];

export const TECH_ROWS = [
  { component: '<strong>Backend</strong>', tech: 'Go (Gin)', reason: 'Hiệu năng cao, một server phục vụ được nhiều người dùng, tiết kiệm chi phí' },
  { component: '<strong>Cơ sở dữ liệu</strong>', tech: 'PostgreSQL + Meilisearch', reason: 'PostgreSQL cho dữ liệu tin cậy; Meilisearch cho tìm kiếm tức thì, tự sửa lỗi chính tả' },
  { component: '<strong>Web</strong>', tech: 'Angular 21 (SSR)', reason: 'Server-Side Rendering giúp trang tải nhanh và Google index được (quan trọng cho SEO)' },
  { component: '<strong>Android</strong>', tech: 'Kotlin + Jetpack Compose', reason: 'Ứng dụng native, mượt mà, theo chuẩn Material Design 3 của Google' },
  { component: '<strong>Thanh toán</strong>', tech: 'PayOS', reason: 'Cổng thanh toán Việt Nam — sinh viên chuyển khoản ngân hàng nội địa, không cần thẻ quốc tế' },
];

export const SERVICE_COLUMNS: TableColumn[] = [
  { key: 'group', label: 'Nhóm' },
  { key: 'example', label: 'Ví dụ' },
  { key: 'price', label: 'Giá đề xuất' },
];

export const SERVICE_ROWS = [
  { group: '<strong>Việc vặt</strong>', example: 'In ấn, giao đồ, mua hộ, giữ chỗ thư viện', price: '<span class="stat">5.000–30.000 VND</span>' },
  { group: '<strong>Học thuật</strong>', example: 'Gia sư, thiết kế slide, review CV, dịch tài liệu', price: '<span class="stat">30.000–200.000 VND</span>' },
  { group: '<strong>Kỹ năng</strong>', example: 'Chụp ảnh, edit video, thiết kế đồ họa, hỗ trợ IT', price: '<span class="stat">50.000–500.000 VND</span>' },
  { group: '<strong>Đời sống</strong>', example: 'Dọn phòng KTX, giao đồ ăn đêm', price: '<span class="stat">20.000–100.000 VND</span>' },
];

export const COMPETITOR_COLUMNS: TableColumn[] = [
  { key: 'platform', label: 'Nền tảng' },
  { key: 'target', label: 'Đối tượng' },
  { key: 'strength', label: 'Điểm mạnh' },
  { key: 'weakness', label: 'Hạn chế khi so với Viecz' },
];

export const COMPETITOR_ROWS = [
  { platform: '<strong>Nhóm Zalo/Facebook</strong>', target: 'Sinh viên', strength: 'Miễn phí, phổ biến', weakness: 'Không có bản đồ, không escrow, không đánh giá, tin dễ trôi' },
  { platform: '<strong>TaskRabbit</strong> (Mỹ)', target: 'Người lớn', strength: 'Hệ thống hoàn chỉnh', weakness: 'Không hoạt động tại Việt Nam, yêu cầu thẻ tín dụng quốc tế, phí <span class="stat">22.5%</span>' },
  { platform: '<strong>Grab/Gojek</strong>', target: 'Tài xế', strength: 'Scale lớn, có bản đồ', weakness: 'Yêu cầu phương tiện, không hỗ trợ micro-task, không escrow cho dịch vụ tự do' },
  { platform: '<strong>Fiverr/Upwork</strong>', target: 'Freelancer', strength: 'Global reach', weakness: 'Chỉ dịch vụ online, không local/physical, thanh toán USD, không bản đồ' },
];

export const TEAM_COLUMNS: TableColumn[] = [
  { key: 'member', label: 'Thành viên' },
  { key: 'role', label: 'Vai trò' },
];

export const TEAM_ROWS = [
  { member: '<strong>Nguyễn Hữu Thiện Nhân</strong>', role: 'Quản trị và giám sát hệ thống' },
  { member: '<strong>Trương Hoài Đức</strong>', role: 'Kết nối và xây dựng tiếng tăm cho thương hiệu' },
  { member: '<strong>Thái Kha Bảo</strong>', role: 'Thiết kế đồ họa cho thương hiệu' },
  { member: '<strong>Trần Gia Sang</strong>', role: 'Kỹ thuật viên' },
];
