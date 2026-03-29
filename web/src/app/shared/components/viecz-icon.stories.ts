import type { Meta, StoryObj } from '@storybook/angular';
import { VieczIconComponent } from './viecz-icon.component';

const meta: Meta<VieczIconComponent> = {
  title: 'viecz/Icon',
  component: VieczIconComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<VieczIconComponent>;

export const Default: Story = {
  args: { name: 'home', size: 24 },
};

export const Large: Story = {
  args: { name: 'account_balance_wallet', size: 48 },
};

export const Small: Story = {
  args: { name: 'check_circle', size: 16 },
};
