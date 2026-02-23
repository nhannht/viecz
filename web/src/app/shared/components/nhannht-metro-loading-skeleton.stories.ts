import type { Meta, StoryObj } from '@storybook/angular';
import { LoadingSkeletonComponent } from './loading-skeleton.component';

const meta: Meta<LoadingSkeletonComponent> = {
  title: 'nhannht-metro/LoadingSkeleton',
  component: LoadingSkeletonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['card', 'list', 'line'] },
    count: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<LoadingSkeletonComponent>;

export const Card: Story = {
  args: { variant: 'card', count: 3 },
};

export const List: Story = {
  args: { variant: 'list', count: 3 },
};

export const Line: Story = {
  args: { variant: 'line', count: 4 },
};

export const SingleItem: Story = {
  args: { variant: 'card', count: 1 },
};
