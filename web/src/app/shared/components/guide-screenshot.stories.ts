import type { Meta, StoryObj } from '@storybook/angular';
import { GuideScreenshotComponent } from './guide-screenshot.component';

const meta: Meta<GuideScreenshotComponent> = {
  title: 'guide/GuideScreenshot',
  component: GuideScreenshotComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['full', 'medium', 'small'] },
  },
};

export default meta;
type Story = StoryObj<GuideScreenshotComponent>;

export const Full: Story = {
  args: {
    src: '/assets/screenshots/marketplace-desktop.png',
    caption: 'Hình 3.1: Giao diện Marketplace trên desktop',
    size: 'full',
  },
};

export const Medium: Story = {
  args: {
    src: '/assets/screenshots/login.png',
    caption: 'Hình 1.1: Màn hình đăng nhập',
    size: 'medium',
  },
};

export const Small: Story = {
  args: {
    src: '/assets/screenshots/wallet-mobile.png',
    caption: 'Hình 7.2: Ví trên mobile',
    size: 'small',
  },
};
