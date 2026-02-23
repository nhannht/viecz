import type { Meta, StoryObj } from '@storybook/angular';
import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'nhannht-metro/EmptyState',
  component: EmptyStateComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Default: Story = {
  args: {
    icon: 'inbox',
    title: 'Nothing here',
    message: 'No tasks match your current filters.',
  },
};

export const WithAction: Story = {
  args: {
    icon: 'add_circle',
    title: 'No tasks yet',
    message: 'Create your first task to get started.',
    actionLabel: 'Create Task',
    action: () => console.log('action-clicked'),
  },
};

export const CustomIcon: Story = {
  args: {
    icon: 'search_off',
    title: 'No results',
    message: 'Try adjusting your search criteria.',
  },
};
