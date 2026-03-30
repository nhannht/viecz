import type { Meta, StoryObj } from '@storybook/angular';
import { GuideStepComponent } from './guide-step.component';

const meta: Meta<GuideStepComponent> = {
  title: 'guide/GuideStep',
  component: GuideStepComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<GuideStepComponent>;

export const WithScreenshot: Story = {
  args: {
    stepNumber: 1,
    instruction: 'Nhấn vào nút "Đăng nhập bằng điện thoại" trên trang chủ để bắt đầu tạo tài khoản mới.',
    imageSrc: '/assets/screenshots/login.png',
    imageCaption: 'Hình 1.1: Màn hình đăng nhập',
  },
};

export const TextOnly: Story = {
  args: {
    stepNumber: 2,
    instruction: 'Nhập số điện thoại của bạn vào ô "Số điện thoại" và nhấn "Tiếp tục".',
  },
};
