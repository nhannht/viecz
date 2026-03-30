import type { Meta, StoryObj } from '@storybook/angular';
import { GuideTocComponent } from './guide-toc.component';

const meta: Meta<GuideTocComponent> = {
  title: 'guide/GuideToc',
  component: GuideTocComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<GuideTocComponent>;

export const Default: Story = {
  args: {
    items: [
      { number: 1, title: 'Đăng ký tài khoản', anchor: 'ch1' },
      { number: 2, title: 'Đăng nhập', anchor: 'ch2' },
      { number: 3, title: 'Tìm việc trên bản đồ', anchor: 'ch3' },
      { number: 4, title: 'Đăng một công việc', anchor: 'ch4' },
      { number: 5, title: 'Ứng tuyển công việc', anchor: 'ch5' },
      { number: 6, title: 'Chấp nhận & Trò chuyện', anchor: 'ch6' },
      { number: 7, title: 'Thanh toán & Ví', anchor: 'ch7' },
      { number: 8, title: 'Hoàn thành công việc', anchor: 'ch8' },
    ],
  },
};
