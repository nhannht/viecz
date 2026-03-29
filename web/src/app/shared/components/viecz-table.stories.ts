import type { Meta, StoryObj } from '@storybook/angular';
import { VieczTableComponent } from './viecz-table.component';

const meta: Meta<VieczTableComponent> = {
  title: 'viecz/Table',
  component: VieczTableComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczTableComponent>;

export const TechStack: Story = {
  args: {
    columns: [
      { key: 'component', label: 'Thành phần' },
      { key: 'tech', label: 'Công nghệ' },
      { key: 'reason', label: 'Lý do chọn' },
    ],
    rows: [
      { component: '<strong>Backend</strong>', tech: 'Go (Gin)', reason: 'Hiệu năng cao, tiết kiệm chi phí' },
      { component: '<strong>Cơ sở dữ liệu</strong>', tech: 'PostgreSQL + Meilisearch', reason: 'Dữ liệu tin cậy + tìm kiếm tức thì' },
      { component: '<strong>Web</strong>', tech: 'Angular 21 (SSR)', reason: 'Server-Side Rendering, SEO tốt' },
      { component: '<strong>Android</strong>', tech: 'Kotlin + Jetpack Compose', reason: 'Native, Material Design 3' },
      { component: '<strong>Thanh toán</strong>', tech: 'PayOS', reason: 'Chuyển khoản nội địa, không cần thẻ quốc tế' },
    ],
  },
};

export const Team: Story = {
  args: {
    columns: [
      { key: 'member', label: 'Thành viên' },
      { key: 'role', label: 'Vai trò' },
    ],
    rows: [
      { member: '<strong>Nguyễn Hữu Thiện Nhân</strong>', role: 'Quản trị và giám sát hệ thống' },
      { member: '<strong>Trương Hoài Đức</strong>', role: 'Kết nối và xây dựng tiếng tăm cho thương hiệu' },
      { member: '<strong>Thái Kha Bảo</strong>', role: 'Thiết kế đồ họa cho thương hiệu' },
      { member: '<strong>Trần Gia Sang</strong>', role: 'Kỹ thuật viên' },
    ],
  },
};

export const Competitors: Story = {
  args: {
    columns: [
      { key: 'platform', label: 'Nền tảng' },
      { key: 'target', label: 'Đối tượng' },
      { key: 'strength', label: 'Điểm mạnh' },
      { key: 'weakness', label: 'Hạn chế khi so với Viecz' },
    ],
    rows: [
      { platform: '<strong>Nhóm Zalo/Facebook</strong>', target: 'Sinh viên', strength: 'Miễn phí, phổ biến', weakness: 'Không bản đồ, không escrow, không đánh giá' },
      { platform: '<strong>TaskRabbit</strong> (Mỹ)', target: 'Người lớn', strength: 'Hệ thống hoàn chỉnh', weakness: 'Không hoạt động tại VN, phí 22.5%' },
      { platform: '<strong>Grab/Gojek</strong>', target: 'Tài xế', strength: 'Scale lớn, có bản đồ', weakness: 'Yêu cầu phương tiện, không micro-task' },
      { platform: '<strong>Fiverr/Upwork</strong>', target: 'Freelancer', strength: 'Global reach', weakness: 'Chỉ online, thanh toán USD' },
    ],
  },
};

export const Compact: Story = {
  args: {
    columns: [
      { key: 'group', label: 'Nhóm' },
      { key: 'example', label: 'Ví dụ' },
      { key: 'price', label: 'Giá đề xuất' },
    ],
    rows: [
      { group: '<strong>Việc vặt</strong>', example: 'In ấn, giao đồ, mua hộ', price: '5.000–30.000 VND' },
      { group: '<strong>Học thuật</strong>', example: 'Gia sư, thiết kế slide, review CV', price: '30.000–200.000 VND' },
      { group: '<strong>Kỹ năng</strong>', example: 'Chụp ảnh, edit video, thiết kế', price: '50.000–500.000 VND' },
      { group: '<strong>Đời sống</strong>', example: 'Dọn phòng KTX, giao đồ ăn đêm', price: '20.000–100.000 VND' },
    ],
  },
};
