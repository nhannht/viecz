import type { Meta, StoryObj } from '@storybook/angular';
import { GuideChapterComponent } from './guide-chapter.component';

const meta: Meta<GuideChapterComponent> = {
  title: 'guide/GuideChapter',
  component: GuideChapterComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<GuideChapterComponent>;

export const Default: Story = {
  args: {
    chapterNumber: 1,
    title: 'Đăng ký tài khoản',
    subtitle: 'Tạo tài khoản mới bằng số điện thoại',
  },
};

export const NoSubtitle: Story = {
  args: {
    chapterNumber: 3,
    title: 'Tìm việc trên bản đồ',
  },
};

export const LongTitle: Story = {
  args: {
    chapterNumber: 7,
    title: 'Thanh toán & Quản lý ví điện tử',
    subtitle: 'Nạp tiền, rút tiền, và theo dõi giao dịch escrow qua PayOS',
  },
};
