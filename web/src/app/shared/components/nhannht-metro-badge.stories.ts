import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroBadgeComponent } from './nhannht-metro-badge.component';

const meta: Meta<NhannhtMetroBadgeComponent> = {
  title: 'nhannht-metro/Badge',
  component: NhannhtMetroBadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['open', 'in_progress', 'completed', 'cancelled', 'default'] },
  },
};

export default meta;
type Story = StoryObj<NhannhtMetroBadgeComponent>;

export const Open: Story = {
  args: { label: 'OPEN', status: 'open' },
};

export const InProgress: Story = {
  args: { label: 'IN PROGRESS', status: 'in_progress' },
};

export const Completed: Story = {
  args: { label: 'COMPLETED', status: 'completed' },
};

export const Cancelled: Story = {
  args: { label: 'CANCELLED', status: 'cancelled' },
};

export const Default: Story = {
  args: { label: 'POPULAR', status: 'default' },
};
