import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';

const meta: Meta<NhannhtMetroIconComponent> = {
  title: 'nhannht-metro/Icon',
  component: NhannhtMetroIconComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroIconComponent>;

export const Default: Story = {
  args: { name: 'home', size: 24 },
};

export const Large: Story = {
  args: { name: 'account_balance_wallet', size: 48 },
};

export const Small: Story = {
  args: { name: 'check_circle', size: 16 },
};
