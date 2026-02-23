import type { Meta, StoryObj } from '@storybook/angular';
import { ErrorFallbackComponent } from './error-fallback.component';

const meta: Meta<ErrorFallbackComponent> = {
  title: 'nhannht-metro/ErrorFallback',
  component: ErrorFallbackComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ErrorFallbackComponent>;

export const Default: Story = {
  args: {
    title: 'Something went wrong',
    message: 'Please try again later.',
  },
};

export const WithRetry: Story = {
  args: {
    title: 'Failed to load tasks',
    message: 'Could not connect to the server.',
    retryFn: () => console.log('retry-clicked'),
  },
};
